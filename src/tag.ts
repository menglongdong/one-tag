
import { window, StatusBarItem } from 'vscode';
import { exec } from 'child-process-promise';
import { extname } from 'path';

import { absPath } from './config';

enum SymbolKind {
    function = 0,
    struct,
    enum,
    constant,
    memory,
    variable,
    null,
};

interface TagItem {
    path: string;
    line: number;
    tag: string;
    info: string;
    kind: SymbolKind
}

const SymbolKindName = {
    [SymbolKind.function]: "function",
    [SymbolKind.struct]: "struct",
    [SymbolKind.enum]: "enum",
    [SymbolKind.constant]: "constant",
    [SymbolKind.memory]: "memory",
    [SymbolKind.variable]: "variable",
    [SymbolKind.null]: "null",
};

export class Tag {
    updatingTags: number;
    updatingAll: boolean;
    status: StatusBarItem;
    constructor() {
        this.updatingTags = 0;
        this.updatingAll = false;

        let status = window.createStatusBarItem();
        status.command = 'one-tag.updateSymbols';
        this.status = status;
        this.restoreStatus();
        status.show();
    }
    restoreStatus() {
        this.status.tooltip = 'ONE-TAG';
        this.statusText('TAG');
    }
    statusText(text: string, spin = false) {
        this.status.text = `\$(sync${spin ? '~spin' : ''}) ${text}`;
    }
    async run(cmd: string, timeo?: number) {
        try {
            console.log(cmd);
            const result = await exec(cmd, {
                cwd: absPath,
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024,
                timeout: timeo
            });
            return result.stdout;
        } catch (error) {
            console.error("Error: " + error);
        }
    }
    async execExist(cmd: string) {
        try {
            await exec(`which ${cmd}`);
            return true;
        } catch (error) {
            return false;
        }
    }
    updateCtags(cmd: string, tag = 'tags') {
        return this.run(`ctags --excmd=combine --languages=c,c++ --kinds-c=+lLz -f .${tag}/tags ${cmd}`, 300000);
    }
    gtagsCmd(cmd: string) {
        const env = `export GTAGSDBPATH=$(pwd)/.tags && export GTAGSROOT=$(pwd)`;
        return `${env} && ${cmd}`;
    }
    async updateTags(file: string) {
        if (this.updatingAll || !['.c', '.h'].includes(extname(file)) ||
            this.updatingTags) {
            return;
        }

        this.statusText('Updating file...', true);
        this.updatingTags++;
        const shortFile = file.replace(absPath, '');
        const escapedFile = shortFile.replaceAll('.', '\\.')
            .replaceAll('/', '\\/');
        const begin = Date.now();

        await Promise.all([
            this.run(`gtags --single-update ${file} .tags`, 30000)
                .then(() => {
                    let span = (Date.now() - begin) / 1000;
                    this.statusText(`gtag update finished in ${span}S`);
                }),
            this.run(`sed -i '/\t${escapedFile}/d' .tags/tags`)
        ]);
        await this.updateCtags(`-a ${shortFile}`);

        this.updatingTags--;
        const span = (Date.now() - begin) / 1000;
        if (!this.updatingTags && !this.updatingAll) {
            this.statusText(`Update finished in ${span}S`);
            setTimeout(() => this.restoreStatus(), 2000);
        }
    }
    async updateAll() {
        if (this.updatingAll) {
            return;
        }

        this.updatingAll = true;
        let begin = Date.now();
        this.statusText('Updating gtags...', true);
        await this.run('mkdir -p .tags && mkdir -p .tags_tmp', 1000);

        await Promise.all([
            this.run('gtags -i .tags_tmp', 300000).then(() => {
                let span = (Date.now() - begin) / 1000;
                this.statusText(`gtag update finished in ${span}S`);
                this.run('mv .tags_tmp/G* .tags/');
            }),
            this.updateCtags('-R --exclude=debian .', 'tags_tmp').then(() => {
                let span = (Date.now() - begin) / 1000;
                this.statusText(`ctag update finished in ${span}S`);
                this.run('mv .tags_tmp/tags .tags/');
            })
        ]);

        await this.run('mv .tags_tmp/* .tags/; rm -r .tags_tmp', 300000);
        this.updatingAll = false;
        let span = (Date.now() - begin) / 1000;
        this.statusText(`Update finished in ${span}S`);
        setTimeout(() => this.restoreStatus(), 10000);
    }
    async supportCtag() {
        return await this.execExist('readtags');
    }
    async supportGtag() {
        return await this.execExist('global');
    }
    parseGtag(content: string): any {
        if (content === null || content === "") {
            return null;
        }
        var values = content.split(/ +/);
        var tag = values[0];
        var line = parseInt(values[1]) - 1;
        var path = values[2].replace("%20", " ").replace(absPath, '');
        values.shift();
        values.shift();
        values.shift();
        var info = values.join(" ");
        return {
            "kind": this.parseGKind(info),
            tag, line, path, info
        };
    }
    parseCtag(content: string): any {
        if (!content) {
            return null;
        }
        let reg = /(.+?)\t(.+?)\t.*?;\/\^(.*?)\$\/;.*?kind:([a-z]).*?line:([0-9]+)/.exec(content);
        if (!reg) {
            return null;
        }

        return {
            tag: reg[1],
            path: reg[2].replace('./', ''),
            info: reg[3],
            kind: this.parseCKind(reg[4]),
            line: parseInt(reg[5]) - 1
        };
    }
    parseGKind(info: string) {
        var kind = SymbolKind.null;
        if (info.startsWith('struct ')) {
            kind = SymbolKind.struct;
        }
        else if (info.startsWith('enum ')) {
            kind = SymbolKind.enum;
        }
        else if (info.includes('(*') || info.includes('typedef')) {
            kind = SymbolKind.null;
        }
        else if (info.includes('(')) {
            kind = SymbolKind.function;
        }

        return kind;
    }
    parseCKind(info: string) {
        switch (info) {
            case 'f':
                return SymbolKind.function;
            case 'v':
                return SymbolKind.variable;
            case 's':
                return SymbolKind.struct;
            case 'e':
                return SymbolKind.enum;
            case 'd':
                return SymbolKind.constant;
            case 'm':
                return SymbolKind.memory;
            default:
                return SymbolKind.null;
        }
    }
    tagSort(a: TagItem, b: TagItem) {
        if (a.tag.length !== b.tag.length) {
            return a.tag.length - b.tag.length;
        }
        if (a.kind !== b.kind) {
            return a.kind - b.kind;
        }
        if (a.path === b.path) {
            return 0;
        }
        return a.path > b.path ? 1 : -1;
    }
    tag2View(data: TagItem[]) {
        return data.sort(this.tagSort).map(item => {
            let line = item["line"];
            let path = item["path"];
            let desc = `${path}:${line}`;
            return {
                label: item["tag"], description: desc,
                line, path,
                detail: `${item['info']}`
            };
        });
    }
    async rawSearchSymbols(cmd: string, parser: (content: string) => any) {
        let _this = this;
        const output = await this.run(cmd);
        if (!output || output.length === 0) {
            return [];
        }

        let items = (output as string).toString().split(/\r?\n/)
            .map((item: string) => parser.call(_this, item))
            .filter(item => item);
        return items;
    }
    async searchSymbols(word: string | null, quiet = false, refer = false,
        goto = false) {
        if (!word) {
            throw Error;
        }

        if (refer) {
            const items = await this.rawSearchSymbols(
                this.gtagsCmd(`global -axr ${word}`),
                this.parseGtag);
            !items.length && !quiet && window.showInformationMessage('引用找不到哦~');
            return this.tag2View(items);
        }

        let flags = goto ? '' : '-p';
        let cmd = `readtags ${flags} -e -n -t .tags/tags - "${word}"`;
        let items = await this.rawSearchSymbols(cmd, this.parseCtag);
        cmd = this.gtagsCmd(`global -ax ${goto ? word : ('^' + word)}`);

        /* find symbol base on gtags, as gtags is faster to update */
        const gitems = await this.rawSearchSymbols(cmd, this.parseGtag);
        items.forEach(item => {
            if (!gitems.find(cur => cur.path === item.path &&
                cur.line === item.line)) {
                gitems.push(item);
            }
        });
        !gitems.length && !quiet && window.showInformationMessage('符号找不到哦~');
        return this.tag2View(gitems);
    }
    async fileSymbols(file: string) {
        return this.tag2View(await this.rawSearchSymbols(this.gtagsCmd(`global -axf "${file}"`),
            this.parseGtag));
    }
}


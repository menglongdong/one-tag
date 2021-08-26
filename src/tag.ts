
import { window, SymbolKind } from 'vscode';
import { exec } from 'child-process-promise';
import { extname } from 'path';

import { abs_path } from './config';

function execute(command: string) {
    return exec(command, {
        cwd: abs_path,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
    }).then(function (result) {
        return result.stdout;
    }).catch(function (error: string) {
        console.error("Error: " + error);
    });
}

export class Tag {
    updateInProgress: number;
    constructor() {
        this.updateInProgress = 0;
    }
    run(params: Array<string>) {
        return execute(params.join(' '));
    }
    updateTags(file: string) {
        if (!['.c', '.h'].includes(extname(file))) { return; }

        console.log("update now...");
        this.updateInProgress++;
        var self = this;
        this.run([`global --single-update ${file}`])
            .then(() => {
                self.updateTagsFinish();
            }).catch(() => {
                self.updateTagsFinish();
            });
    }
    updateTagsFinish() {
        this.updateInProgress--;
        if (!this.updateInProgress) { console.log("update down!"); }
    }
    parseGtag(content: string): any {
        if (content === null || content === "") {
            return null;
        }
        var values = content.split(/ +/);
        var tag = values[0];
        var line = parseInt(values[1]) - 1;
        var path = values[2].replace("%20", " ").replace(abs_path, '');
        values.shift();
        values.shift();
        values.shift();
        var info = values.join(" ");
        return {
            "kind": this.parseKind(info),
            tag, line, path, info
        };
    }
    parseCtag(content: string): any {
        if (!content) {
            return null;
        }
        let reg = /(.+?)\t(.+?)\t(.*?)\tkind.*line:([0-9]+)/.exec(content);
        if (!reg) {
            return null;
        }
        return {
            tag: reg[1],
            path: reg[2].replace('./', ''),
            info: reg[3],
            line: parseInt(reg[4]) - 1
        };
    }
    parseKind(info: string) {
        var kind = SymbolKind.Variable;
        if (info.startsWith('class ')) {
            kind = SymbolKind.Class;
        }
        else if (info.startsWith('struct ')) {
            kind = SymbolKind.Class;
        }
        else if (info.startsWith('enum ')) {
            kind = SymbolKind.Enum;
        }
        else if (info.indexOf('(') !== -1) {
            kind = SymbolKind.Function;
        }
        return kind;
    }
    rawSearchSymbols(cmd: string, parser: (content: string) => any) {
        let _this = this;
        return new Promise((resolve, reject) => {
            this.run([cmd]).then((output: any) => {
                if (output === null || output.length === 0) {
                    reject();
                    return;
                }
                var items = new Array<any>();
                (output as string).toString().split(/\r?\n/)
                    .forEach(function (value: string) {
                        var result = parser.call(_this, value);
                        if (!result) {
                            return;
                        }

                        let line = result["line"];
                        let path = result["path"];
                        let desc = `${path}:${line}`;
                        items.push({
                            label: result["tag"], description: desc,
                            line, path,
                            detail: result['info']
                        });
                    });
                resolve(items);
            });
        });
    }
    searchSymbols(word: string | null, quiet = false, refer = false) {
        if (!word) {
            return new Promise((resolve, reject) => reject());
        }

        let cmd = `global -ax${refer ? "r" : ""} "${word}"`;
        return this.rawSearchSymbols(cmd, this.parseGtag)
            .catch(() => {
                if (refer) {
                    throw Error;
                }
                cmd = `readtags -e -n "${word}"`;
                return this.rawSearchSymbols(cmd, this.parseCtag);
            })
            .catch(() => {
                if (!quiet) {
                    window.showInformationMessage('符号找不到哦~');
                }
            });
    }
    fileSymbols(file: string) {
        return this.rawSearchSymbols(`global -axf "${file}"`, this.parseGtag);
    }
}


import { window, Range, workspace, Position, Uri, TextDocument, TextEditor } from "vscode";

import { Tag } from './tag';
import { abs_path } from './config';

const tag = new Tag();


function getPattern(keywords: string) {
    if (keywords.startsWith('-')) { return keywords.substr(1) + '.*'; }
    return '^' + keywords;
}

var gotoItems = (item: any) => {
    if (!item) { return; }
    var options = {
        selection: new Range(new Position(item["line"], 0), new
            Position(item["line"], 0)),
        preview: false,
    };
    window.showTextDocument(Uri.file(abs_path +
        item["path"]), options);
};

function getWord() {
    let editor = window.activeTextEditor;
    if (!editor) { return null; }
    let pos = editor.selection.start,
        wordRange = editor.document.getWordRangeAtPosition(pos),
        word = editor.document.getText(wordRange);
    return word;
}

export var updateTags = (doc: TextDocument) => {
    var configuration = workspace.getConfiguration('one-tag');
    var shouldUpdate = configuration.get('autoUpdate', true);
    var file = doc.fileName;
    if (!shouldUpdate) { return; }
    tag.updateTags(file);
};

export function findRefer() {
    tag.searchSymbols(getWord(), false, true).then(items => {
        if (!(items instanceof Array)) { return; }
        if (items.length > 1) {
            window
                .showQuickPick(items, { matchOnDescription: true })
                .then(gotoItems);
        }
        else { gotoItems(items[0]); }
    });
}

export function gotoSymbol() {
    tag.searchSymbols(getWord()).then(items => {
        if (!(items instanceof Array)) { return; }
        if (items.length > 1) {
            window
                .showQuickPick(items, { matchOnDescription: true })
                .then(gotoItems);
        }
        else { gotoItems(items[0]); }
    });
}

export function findSymbols() {
    var editor = window.activeTextEditor;
    let inProcess: any = false;
    var searchTime = 0;

    let qpick = window.createQuickPick();
    var msgHandle = function (msg: string) {
        var curTime = new Date().getTime();
        if (!msg || msg.length < 3) {
            return;
        }
        var pattern = getPattern(msg);

        inProcess && clearTimeout(inProcess);
        new Promise((resolve, reject) =>
            inProcess = setTimeout(resolve, 200))
            .then(() => {
                inProcess = false;
                return tag.searchSymbols(pattern, true);
            })
            .then(data => {
                let items = data as Array<any>;
                if (curTime < searchTime) { return; }

                searchTime = curTime;
                items.forEach(item => {
                    var label = item["label"],
                        match = new RegExp(pattern).exec(label),
                        index = label.search(pattern);
                    item["sort"] = [match ? match.toString().length : 0, index];
                    item["alwaysShow"] = true;
                });
                items.sort((a: any, b: any) => {
                    if (a["sort"][0] === b["sort"][0]) {
                        return a["sort"][1] - b["sort"][1];
                    }
                    return a["sort"][0] - b["sort"][0];
                });
                qpick.items = items.slice(0, 200);
            });
    };
    qpick.onDidHide(() => qpick.dispose());
    qpick.onDidChangeSelection(items => gotoItems(items[0]));
    qpick.onDidChangeValue(msgHandle);

    if (editor && editor.selection) {
        var initMsg = editor.document.getText(editor.selection);
        qpick.value = initMsg;
        msgHandle(initMsg);
    }
    qpick.show();
}

export function showFileSymbols() {
    var editor = window.activeTextEditor;
    editor && tag.fileSymbols(editor.document.uri.path)
        .then(items => window.showQuickPick(items as Array<any>)
            .then(gotoItems));
}

export function initSymbols() {

}

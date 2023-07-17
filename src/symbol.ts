
import { window, Range, workspace, Position, Uri, TextDocument } from "vscode";

import { absPath } from './config';
import { Tag } from './tag';

const tag = new Tag();


function getPattern(keywords: string) {
    if (keywords.startsWith('-')) { return keywords.substr(1) + '.*'; }
    return keywords;
}

var gotoItems = (item: any) => {
    if (!item) { return; }
    var options = {
        selection: new Range(new Position(item["line"], 0), new
            Position(item["line"], 0)),
        preview: false,
    };
    window.showTextDocument(Uri.file(absPath + item["path"]), options);
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
        if (!(items instanceof Array) || !items.length) { return; }
        if (items.length > 1) {
            window
                .showQuickPick(items, { matchOnDescription: true })
                .then(gotoItems);
        }
        else { gotoItems(items[0]); }
    });
}

export function updateSymbols() {
    tag.updateAll();
}

export function gotoSymbol() {
    tag.searchSymbols(getWord(), false, false, true).then(items => {
        if (!(items instanceof Array) || !items.length) { return; }
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
                items.forEach(item => item["alwaysShow"] = true);
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

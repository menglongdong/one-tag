import { commands, workspace } from "vscode";
import * as symbol from './symbol';

export function activate() {

    commands.registerCommand("one-tag.findSymbols", symbol.findSymbols);
    commands.registerCommand("one-tag.gotoSymbol", symbol.gotoSymbol);
    commands.registerCommand("one-tag.findRefer", symbol.findRefer);
    commands.registerCommand("one-tag.updateSymbols", symbol.updateSymbols);
    commands.registerCommand("one-tag.showFileSymbols",
        symbol.showFileSymbols);
    workspace.onDidSaveTextDocument(doc => symbol.updateTags(doc));
}

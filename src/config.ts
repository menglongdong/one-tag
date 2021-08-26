import { workspace, WorkspaceFolder } from 'vscode';

var full_name = workspace.workspaceFolders as Array<WorkspaceFolder>;
var abs_path = full_name[0].uri.path + "/";
export { abs_path };
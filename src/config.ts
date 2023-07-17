import { workspace, WorkspaceFolder } from 'vscode';

const fullName = workspace.workspaceFolders as Array<WorkspaceFolder>;
const absPath = fullName[0].uri.path + "/";
export { absPath };
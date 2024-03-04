import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
/**
 * 获取当前所在工程根目录，有3种使用方法：<br>
 * getProjectPath(uri) uri 表示工程内某个文件的路径<br>
 * getProjectPath(document) document 表示当前被打开的文件document对象<br>
 * getProjectPath() 会自动从 activeTextEditor 拿document对象，如果没有拿到则报错
 * @param {*} document
 */
export const getProjectPath = (document: any) => {
  if (!document) {
    document = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : null;
  }
  if (!document) {
    vscode.window.showErrorMessage('当前激活的编辑器不是文件或者没有文件被打开！');
    return '';
  }

  const currentFile = (document.uri ? document.uri : document).fsPath;
  let projectPath = null;

  let workspaceFolders =
    vscode.workspace.workspaceFolders?.map((item) => {
      return slash(item.uri.fsPath);
    }) || [];

  if (workspaceFolders.length === 1) {
    const rootPath = workspaceFolders[0];
    if (fs.readdirSync(rootPath).find((file) => file.includes('package.json'))) {
      return rootPath;
    }
  }
  workspaceFolders.forEach((folder) => {
    if (currentFile.indexOf(folder) === 0) {
      projectPath = folder;
    }
  });
  if (!projectPath) {
    vscode.window.showErrorMessage('获取工程根路径异常！');
    return '';
  }
  return projectPath;
};
/**
 * 获取当前工程名
 */
export const getProjectName = function (projectPath: string) {
  return path.basename(projectPath);
};

export const slash = (input: string) => {
  const isExtendedLengthPath = /^\\\\\?\\/.test(input);

  if (isExtendedLengthPath) {
    return input;
  }

  return input.replace(/\\/g, '/');
};

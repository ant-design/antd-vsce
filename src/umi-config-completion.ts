import * as vscode from 'vscode';
import { Position, TextDocument } from 'vscode';
import { getProjectPath, slash } from './util';

export function provideCompletionItems(document: TextDocument, position: Position) {
  try {
    const line = document.lineAt(position);
    const projectPath = getProjectPath(document);

    // 只截取到光标位置为止，防止一些特殊情况
    const lineText = line.text.substring(0, position.character);

    // 简单匹配，只要当前光标前的字符串为`this.dependencies.`都自动带出所有的依赖
    if (lineText.includes('form  ') && projectPath) {
      const json = require(slash(`${projectPath}/package.json`));
      const dependencies = Object.keys(json.dependencies || {}).concat(
        Object.keys(json.devDependencies || {}),
      );
      return dependencies.map((dep) => {
        // vscode.CompletionItemKind 表示提示的类型
        return new vscode.CompletionItem(dep, vscode.CompletionItemKind.Field);
      });
    }
  } catch (error) {
    console.log(error);
  }
}

/**
 * 光标选中当前自动补全item时触发动作，一般情况下无需处理
 * @param {*} item
 * @param {*} token
 */
export function resolveCompletionItem() {
  return null;
}

/**
 * 跳转到定义示例，本示例支持package.json中dependencies、devDependencies跳转到对应依赖包。
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Position, TextDocument } from 'vscode';
import * as util from './util';

/**
 * 查找文件定义的provider，匹配到了就return一个location，否则不做处理
 * 最终效果是，当按住Ctrl键时，如果return了一个location，字符串就会变成一个可以点击的链接，否则无任何效果
 * @param {*} document
 * @param {*} position
 * @param {*} token
 */
export function provideDefinition(document: TextDocument, position: Position) {
  const fileName = util.slash(document.fileName);
  const workDir = util.slash(path.dirname(fileName));
  const projectPath = util.getProjectPath(document);
  const word = document.getText(document.getWordRangeAtPosition(position));
  const line = document.lineAt(position);

  // 只处理package.json文件
  if (/\/package\.json$/.test(fileName)) {
    try {
      const json = JSON.parse(document.getText());
      const dependencies = json.dependencies || {};
      const devDependencies = json.devDependencies || {};
      const packageNameRegex = /"([^"]+)":/;
      const matches = line.text.match(packageNameRegex) || [];
      const packageName = matches.length > 1 ? matches?.[1] : word;
      if (!dependencies[packageName] && !devDependencies[packageName]) {
        return;
      }

      // 因为运行环境问题，不能用 resolve
      // const destPath = require.resolve(`${packageName}`);
      let destPath = `${workDir}/node_modules/${packageName.replace(/"/g, '')}/package.json`;

      if (!fs.existsSync(destPath)) {
        return '';
      }
      return new vscode.Location(vscode.Uri.file(destPath), new vscode.Position(0, 0));
    } catch (error) {
      console.log(error);
    }
  }
  const relativePath = util.slash(path.relative(projectPath, fileName));
  if (relativePath.includes('node_modules')) {
    return;
  }

  if (['config/routes.ts'].includes(relativePath) || ['config/config.ts'].includes(relativePath)) {
    const regex = /'([^']+)'/;
    const match = line.text.match(regex);

    if (
      match &&
      match.index &&
      match?.length > 1 &&
      match?.[1].includes(word) &&
      line.text?.trim().startsWith('component')
    ) {
      const filePath = path.join(projectPath, 'src', 'pages', match?.[1]);
      let fileUrl = null;
      if (fs.existsSync(path.join(filePath, 'index.tsx'))) {
        fileUrl = path.join(filePath, 'index.tsx');
      }

      if (fs.existsSync(path.join(filePath, 'index.jsx'))) {
        fileUrl = path.join(filePath, 'index.jsx');
      }

      if (fs.existsSync(filePath + '.tsx')) {
        fileUrl = filePath + '.tsx';
      }

      if (fs.existsSync(filePath + '.jsx')) {
        fileUrl = filePath + '.jsx';
      }

      if (!fileUrl) {
        return null;
      }

      return {
        // 这个uri是跳转的目标文件
        targetUri: vscode.Uri.file(fileUrl),
        // 这个range是目标文件的位置
        targetRange: new vscode.Range(0, 0, 0, 0),
        // 这个range 是需要出现下划线的字符串的范围
        originSelectionRange: new vscode.Range(
          new Position(position.line, match.index),
          // 2是因为有两个引号
          new Position(position.line, match.index + match[1].length + 2),
        ),
      };
    }
  }

  return null;
}

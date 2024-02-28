// 导入所需的模块和库
import * as parser from '@babel/parser';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { Position, TextDocument } from 'vscode';
import { getProjectPath, slash } from './util';
// @ts-ignore
import traverse from '@babel/traverse';
import * as types from '@babel/types';

// 导入API信息的JSON文件
const apiJson = require('@ant-design/doc/api/umi.json');
const proComponentsJson = require('@ant-design/doc/api/pro-components.json');
const antdJson = require('@ant-design/doc/api/ant-design.json');

// 创建一个映射表，用于存储组件的属性信息
const proAndAntdApiMap = new Map();

// 处理pro-components.json中的属性信息
proComponentsJson?.map((pre: any) => {
  pre.properties?.map((item: any) => {
    const propsMap = new Map();
    item.property?.map((child: any) => {
      if (propsMap.has(child['属性'])) {
        /**
         * 获取属性列表
         */
        const list = propsMap.get(child['属性']);
        propsMap.set(child['属性'], [...list, child]);
      } else {
        propsMap.set(child['属性'], [child]);
      }
    });
    propsMap.set('参考官网文档链接', item.url);
    const title = item.title.split?.('-')?.[1]?.trim() || item.title.split?.('-')?.[0]?.trim();

    const preProps = proAndAntdApiMap.get(title) || [];
    proAndAntdApiMap.set(title, new Map([...preProps, ...propsMap]));
  });
});

// 处理ant-design.json中的属性信息
antdJson?.map((pre: any) => {
  pre.properties?.map((item: any) => {
    const propsMap = new Map();
    item.property?.map((child: any) => {
      if (propsMap.has(child['参数'])) {
        const list = propsMap.get(child['参数']);
        propsMap.set(child['参数'], [...list, child]);
      } else {
        propsMap.set(child['参数'], [child]);
      }
    });
    propsMap.set('参考官网文档链接', item.url);
    const title = item.title.split?.('-')?.[1]?.trim() || item.title.split?.('-')?.[0]?.trim();

    const preProps = proAndAntdApiMap.get(title) || [];
    proAndAntdApiMap.set(title, new Map([...preProps, ...propsMap]));
  });
});

/**
 * 这段代码是在创建一个名为umiApiMap的对象，它是通过对apiJson进行处理得到的。
 * apiJson是一个包含API信息的数组。通过遍历apiJson，
 * 将其中的属性和子属性添加到umiApiMap对象中，以便后续使用。
 */
const umiApiMap = apiJson?.reduce((pre: any, cur: any) => {
  if (cur.properties) {
    cur.properties.forEach((item: any) => {
      if (item.property && item.property.length > 0) {
        item.property.forEach((child: any) => {
          if (child.property && child.property.length > 0) {
            child.property.forEach((sub: any) => {
              pre[sub.title] = sub;
            });
          } else {
            pre[child.title] = child;
          }
        });
      } else {
        pre[item.title] = item;
      }
    });
  }
  return pre;
}, {});

// 创建一个映射表，用于存储文件的AST和JSX组件信息
const fileAstJSXMap = new Map();

/**
 * 鼠标悬停提示，当鼠标停在package.json的dependencies或者devDependencies时，
 * 自动显示对应包的名称、版本号和许可协议
 * @param {*} document
 * @param {*} position
 * @param {*} token
 */
export function provideHover(document: TextDocument, position: Position) {
  try {
    const fileName = slash(document.fileName);

    const workDir = getProjectPath(document);
    const word = document.getText(document.getWordRangeAtPosition(position));
    const line = document.lineAt(position);
    if (/\/package\.json$/.test(fileName)) {
      const packageNameRegex = /"([^"]+)":/;

      const matches = line.text.match(packageNameRegex) || [];
      const packageName = matches.length > 1 ? matches?.[1] : word;
      let destPath = `${workDir}/node_modules/${packageName.replace(/"/g, '')}/package.json`;

      if (fs.existsSync(destPath)) {
        const content = JSON.parse(fs.readFileSync(destPath, 'utf-8'));

        return new vscode.Hover(
          `* **名称**：${content.name}\n* **当前安装版本**：${content.version}`,
        );
      }
    }

    const relativePath = slash(path.relative(workDir, fileName));

    if (['config/config.ts', '.umirc.ts'].includes(relativePath)) {
      let api = umiApiMap[word];

      if (api) {
        return new vscode.Hover(
          `
### ${word}

参考官网文档链接 [${api.url}](${api.url}) \n\n ------ \n\n  ${api.md} `,
        );
      }
    }

    if (['src/app.tsx', 'src/app.ts', 'src/requestErrorConfig.ts'].includes(relativePath)) {
      if (
        line.text.startsWith('export const ') ||
        line.text.startsWith('export async function ') ||
        line.text.startsWith('export function ')
      ) {
        let api = umiApiMap[word];
        // hack code
        if (word === 'getInitialState') {
          return new vscode.Hover(umiApiMap['数据流'].md);
        }
        if (api) {
          return new vscode.Hover(api.md);
        }
      }
    }

    if (relativePath.startsWith('src')) {
      let astList: any[] | null = null;

      // 如果文件的AST和JSX组件信息已经存在，则直接使用
      if (fileAstJSXMap.has(fileName)) {
        astList = fileAstJSXMap.get(fileName);
      } else {
        const content = fs.readFileSync(fileName, 'utf-8');
        const ast = parser.parse(content, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript'],
        });

        // 遍历AST，获取JSX组件信息,然后将有文档的信息存储到fileAstJSXMap中
        traverse(ast, {
          JSXElement: (path: { node: types.JSXElement }) => {
            const componentNameNode = path.node.openingElement?.name;
            let componentName: string | null = null;

            // 这个是最简单的JSXIdentifier，用于表示JSX中的标识符。在React中，JSXIdentifier通常用于表示React组件的名称。
            // <ProTable/>
            if (types.isJSXIdentifier(componentNameNode)) {
              componentName = componentNameNode.name;
            }
            // 在React中，JSXMemberExpression是JSX中的一种语法，用于表示成员表达式。JSXMemberExpression通常用于访问React组件中的属性或方法。
            // const element = <MyComponent.someMethod />;
            if (types.isJSXMemberExpression(componentNameNode)) {
              componentName = componentNameNode.property.name;
            }
            // JSXNamespacedName是JSX中的一种特殊语法，用于表示命名空间的JSX元素。在React中，JSXNamespacedName用于表示命名空间的XML元素，通常用于SVG图形或其它XML命名空间中的元素。
            // 例如，下面是一个使用JSXNamespacedName的示例：
            // ```jsx
            // const element = <svg:circle cx="50" cy="50" r="40" fill="red" />;
            // ```
            // 在这个例子中，`svg:circle`是一个JSXNamespacedName，表示SVG命名空间中的`circle`元素。这种语法允许在React应用中使用XML命名空间中的元素，例如SVG元素。
            if (types.isJSXNamespacedName(componentNameNode)) {
              componentName = componentNameNode.namespace.name;
            }

            // 如果组件名称存在，则将组件名称和位置信息存储到fileAstJSXMap中
            if (proAndAntdApiMap.has(componentName)) {
              const astList = fileAstJSXMap.get(fileName) || [];
              astList.push({
                componentName,
                loc: path.node.loc,
              });
              fileAstJSXMap.set(fileName, astList);
            }
          },
        });
      }
      if (astList) {
        // 获取当前文件的AST和JSX组件信息
        const nodeList = astList.reverse().filter((item: any) => {
          const { loc } = item;
          if (loc.start.line <= position.line && loc.end.line >= position.line) {
            return true;
          }
          return false;
        });

        if (!nodeList || nodeList.length < 1) {
          return null;
        }
        let node: {
          componentName: string;
        } | null = null;

        if (nodeList.length === 1) {
          node = nodeList[0];
        }

        if (nodeList.length > 1) {
          // 找到离得最近那个组件
          node = nodeList.reduce((pre: any, cur: any) => {
            if (!pre) {
              return cur;
            }
            if (pre.loc.start.line >= cur.loc.start.line) {
              return pre;
            }
            return cur;
          }, null);
        }

        if (!node) {
          return null;
        }

        const componentName = node.componentName;

        let api: Map<string, any> = proAndAntdApiMap.get(componentName);

        if (componentName === 'ProTable') {
          api = new Map([...proAndAntdApiMap.get('Table'), ...api]);
        }

        if (componentName === 'ProForm') {
          api = new Map([...proAndAntdApiMap.get('Form'), ...api]);
        }

        if (componentName === 'ProDescriptions') {
          api = new Map([...proAndAntdApiMap.get('Descriptions'), ...api]);
        }

        if (!api) {
          return;
        }

        const propsMap = api.get(word);

        if (!propsMap) {
          return null;
        }
        return new vscode.Hover(
          `
### ${componentName} - ${word}
${propsMap.map((props: any) => {
  return Object.keys(props)
    .map((key) => `- ${key}: ${props[key]}`)
    .join('\n');
})}\n\n` +
            (api.get('参考官网文档链接') &&
              `
#### 参考官网文档链接 [${api.get('参考官网文档链接')}](${api.get('参考官网文档链接')})
---------
`),
        );
      }
    }
  } catch (error) {
    console.log(error);
  }

  return null;
}

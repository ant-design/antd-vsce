/* --------------------------------------------------------------------------------------------
 * 版权所有 (c) 微软公司。保留所有权利。
 * 根据 MIT 许可证获得许可。有关许可信息，请参阅项目根目录中的 License.txt 文件。
 * ------------------------------------------------------------------------------------------ */
// 创建一个映射表，用于存储文件的AST和JSX组件信息
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { attributesToMap, getJSXNodeName } from './utils';
import { Diagnostic } from 'vscode-languageserver';
import { diagnosticMessageMap } from './diagnostic';

// 导入API信息的JSON文件
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

export type JSXComponentType = {
  componentName: string | null;
  loc: t.SourceLocation | null | undefined;
  props: {
    name: string | t.JSXIdentifier;
    value: t.JSXAttribute;
    parent?: t.JSXElement | undefined;
  }[];
};

/**
 * 从给定的文本文档中获取JSX组件列表。
 * @param textDocument 要解析的文本文档。
 * @returns 包含组件名称、位置和属性的对象数组。
 */
export const getJSXComponentList = (textDocument: TextDocument): Diagnostic[] => {
  try {
    let diagnostics: Diagnostic[] = [];
    const fileName = textDocument.uri;
    const content = fileName ? textDocument.getText() : '';

    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    const importMap = new Map<
      string,
      {
        default: string;
        source: string;
      }
    >();

    // 遍历AST，获取JSX组件信息,然后将有文档的信息存储到fileAstJSXMap中
    traverse(ast, {
      ImportDeclaration: (path: { node: t.ImportDeclaration }) => {
        if (
          path.node.source.value === 'antd' ||
          path.node.source.value === 'pro-components' ||
          path.node.source.value === '@alipay/bigfish/antd' ||
          path.node.source.value === '@alipay/tech-ui'
        ) {
          path.node.specifiers.forEach((specifier) => {
            if (t.isImportSpecifier(specifier)) {
              if (t.isIdentifier(specifier.imported)) {
                importMap.set(specifier.local.name, {
                  default: specifier.imported.name,
                  source: path.node.source.value,
                });
              }
              if (t.isStringLiteral(specifier.imported)) {
                importMap.set(specifier.local.name, {
                  default: specifier.imported.value,
                  source: path.node.source.value,
                });
              }
            }
          });
        }
      },
      JSXElement: (path: { node: t.JSXElement }) => {
        const componentNameNode = path.node.openingElement?.name;
        const componentName: string | null = getJSXNodeName(componentNameNode);
        const realComponentName = importMap.get(componentName)?.default;
        const props = attributesToMap(path.node);

        if (!realComponentName) {
          return;
        }
        // 如果组件名称存在，则将组件名称和位置信息存储到fileAstJSXMap中
        if (!proAndAntdApiMap.has(realComponentName)!) {
          return;
        }
        const itemProps = {
          componentName: realComponentName,
          loc: path.node.loc,
          props,
        };

        if (!realComponentName) return;

        // 如果有处理方案，执行处理方案
        if (!diagnosticMessageMap.has(realComponentName)) return;
        try {
          const genDiagnostic = diagnosticMessageMap.get(realComponentName);
          if (!genDiagnostic) {
            return;
          }
          const diagnosticList = genDiagnostic(itemProps);
          diagnostics = [...diagnostics, ...diagnosticList];
        } catch (error) {}
      },
    });
    return diagnostics;
  } catch (error) {}
  return [];
};

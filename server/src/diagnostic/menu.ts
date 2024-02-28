import generate from '@babel/generator';
import * as t from '@babel/types';
import { Diagnostic, DiagnosticSeverity, Position } from 'vscode-languageserver';
import { JSXComponentType } from '../genDiagnostic';
import { jsxElementPropsListToArray, jsxElementToJSON } from '../utils';

export const menuDiagnostic = (item: JSXComponentType) => {
  const keys = item.props.map((prop) => prop?.name);
  return item.props
    .map((prop) => {
      if (!prop) {
        return;
      }
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start: Position.create(
            prop.value?.loc?.start?.line! - 1,
            prop.value?.loc?.start?.column!,
          ),
          end: Position.create(prop.value?.loc?.end?.line! - 1, prop.value?.loc?.end?.column!),
        },
        message: '',
        source: 'Ant Design Pro For VSCode',
      };

      if (prop?.name === 'children') {
        if (!keys.includes('items')) {
          diagnostic.message = `Menu 组件的 children 属性已废弃，请使用 items 属性`;
          const jsxItems: {
            name: string | t.JSXIdentifier;
            value: t.JSXAttribute | t.JSXEmptyExpression | t.SpreadElement;
          }[][] = [];

          if (t.isJSXFragment(prop.value?.value)) {
            const menuChildrenList = (prop.value.value as t.JSXFragment).children;

            menuChildrenList.forEach((child, index) => {
              const prop = jsxElementToJSON(child, index);
              if (prop) {
                jsxItems.push(prop);
              }
            });
          }
          const items = t.jsxAttribute(
            t.jsxIdentifier('items'),
            t.jsxExpressionContainer(jsxElementPropsListToArray(jsxItems)),
          );
          if (prop.parent) {
            prop.parent.children = [];
            prop.parent.openingElement.attributes.push(items);
          }
          diagnostic.data = {
            code: generate(prop.parent!).code,
            actionName: '将 children 替换为 items',
          };
        }
      }
      if (!diagnostic.message) {
      }
      return diagnostic;
    })
    .filter((item) => item?.message) as Diagnostic[];
};

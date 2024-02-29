import { Diagnostic, DiagnosticSeverity, Position } from 'vscode-languageserver';
import { JSXComponentType } from '../genDiagnostic';
import * as t from '@babel/types';
import {
  attributesToMap,
  getJSXNodeName,
  jsxElementPropsListToArray,
  jsxValueToObjectValue,
  menuChildrenJsxElementToJSON,
  onVisibleChangeChangeToOnOpenChange,
  visibleToOpen,
} from '../utils';
import generate from '@babel/generator';

export const dropdownDiagnostic = (item: JSXComponentType) => {
  return item.props
    .map((prop) => {
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

      if (prop.name === 'overlay') {
        const jsxMenu = prop.value.value;
        if (!jsxMenu) {
          return;
        }
        diagnostic.message = `在 4.24.0 版本后，我们提供了 <Dropdown menu={{ items: [...] }} /> 的简写方式，有更好的性能和更方便的数据组织方式，开发者不再需要自行拼接 JSX。
        同时我们废弃了原先的写法，你还是可以在 4.x 继续使用，但会在控制台看到警告，并会在 5.0 后移除。`;

        // 生成自动更新的代码
        if (t.isJSXExpressionContainer(jsxMenu) && t.isJSXElement(jsxMenu.expression)) {
          const menuJSXElement = jsxMenu.expression;

          const propsArray = attributesToMap(menuJSXElement)
            .map((attr) => {
              if (!attr.value) return null;

              if (attr.name === 'children') {
                const jsxItems: {
                  name: string | t.JSXIdentifier;
                  value: t.JSXAttribute | t.JSXEmptyExpression | t.SpreadElement;
                }[][] = [];

                if (t.isJSXFragment(attr.value?.value)) {
                  const menuChildrenList = (prop.value.value as t.JSXFragment).children;
                  menuChildrenList.forEach((child, index) => {
                    const prop = menuChildrenJsxElementToJSON(child, index);
                    if (prop) {
                      jsxItems.push(prop);
                    }
                  });
                }

                const items = jsxElementPropsListToArray(jsxItems);
                return t.objectProperty(t.stringLiteral('items'), items);
              }
              return t.objectProperty(
                t.stringLiteral(getJSXNodeName(attr.value.name)),
                jsxValueToObjectValue(attr.value.value) || t.booleanLiteral(true),
              );
            })
            .filter(Boolean) as t.ObjectProperty[];

          diagnostic.data = {
            code: generate(
              t.jsxAttribute(
                t.jsxIdentifier('menu'),
                t.jsxExpressionContainer(t.objectExpression(propsArray)),
              ),
            ).code,
            actionName: '将 overlay={...} 替换为 menu={...}',
          };
        }
      }

      if (prop?.name === 'visible') {
        diagnostic.message = `${prop?.name} 属性已废弃，请使用 open 属性`;
        const newProps = visibleToOpen(prop.value);
        diagnostic.data = {
          code: generate(newProps).code,
          actionName: `将 ${prop?.name} 替换为 open`,
        };
      }

      if (prop?.name === 'onVisibleChange') {
        diagnostic.message = `${prop?.name} 属性已废弃，请使用 onOpenChange 属性`;
        const newProps = onVisibleChangeChangeToOnOpenChange(prop.value);
        diagnostic.data = {
          code: generate(newProps).code,
          actionName: `将 ${prop?.name} 替换为 onOpenChange`,
        };
      }

      if (diagnostic.message) {
        return diagnostic;
      }
      return null;
    })
    .filter((item) => item?.message) as Diagnostic[];
};

import generate from '@babel/generator';
import * as t from '@babel/types';
import { Diagnostic, DiagnosticSeverity, Position } from 'vscode-languageserver';
import { JSXComponentType } from '../genDiagnostic';
import {
  jsxValueToObjectValue,
  onVisibleChangeChangeToOnOpenChange,
  visibleToOpen,
} from '../utils';

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
        source: 'Ant Design For VSCode',
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
          const propsArray = jsxMenu.expression.openingElement.attributes
            .map((attr) => {
              if (t.isJSXSpreadAttribute(attr)) {
                return t.spreadElement(attr.argument);
              }
              if (t.isJSXAttribute(attr)) {
                if (t.isJSXIdentifier(attr.name)) {
                  return t.objectProperty(
                    t.stringLiteral(attr.name.name),
                    jsxValueToObjectValue(attr.value) || t.booleanLiteral(true),
                  );
                }
                if (t.isJSXNamespacedName(attr.name)) {
                  return t.objectProperty(
                    t.stringLiteral(attr.name.namespace.name + ':' + attr.name.name.name),
                    jsxValueToObjectValue(attr.value) || t.booleanLiteral(true),
                  );
                }
              }
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

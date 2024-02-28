import generate from '@babel/generator';
import { Diagnostic, DiagnosticSeverity, Position } from 'vscode-languageserver';
import { JSXComponentType } from '../genDiagnostic';
import { xxxStyleToStylesBody } from '../utils';

export const cardDiagnostic = (item: JSXComponentType) => {
  const keys = item.props.map((prop) => prop.name);
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
        source: 'Ant Design For VSCode',
      };

      if (prop?.name === 'bodyStyle') {
        diagnostic.message = `bodyStyle 属性已废弃，请使用 styles.body 属性`;
        const bodyStyleValue = xxxStyleToStylesBody(prop.value);
        diagnostic.data = {
          code: generate(bodyStyleValue).code,
          actionName: '将 bodyStyle 替换为 styles.body',
        };
      }

      if (prop?.name === 'headStyle') {
        diagnostic.message = `headStyle 属性已废弃，请使用 styles.body 属性`;
        const headStyleValue = xxxStyleToStylesBody(prop.value, 'header');
        diagnostic.data = {
          code: generate(headStyleValue).code,
          actionName: '将 headStyle 替换为 styles.body',
        };
      }

      if (!diagnostic.message) {
        return;
      }
      return diagnostic;
    })
    .filter((item) => item?.message) as Diagnostic[];
};

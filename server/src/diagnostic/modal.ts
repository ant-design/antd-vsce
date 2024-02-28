import generate from '@babel/generator';
import { Diagnostic, DiagnosticSeverity, Position } from 'vscode-languageserver';
import { JSXComponentType } from '../genDiagnostic';
import { visibleToOpen, xxxStyleToStylesBody } from '../utils';

export const modalDiagnostic = (item: JSXComponentType) => {
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
        source: 'Ant Design Pro For VSCode',
      };
      if (prop?.name === 'visible') {
        diagnostic.message = `visible 属性已废弃，请使用 open 属性`;
        const newProps = visibleToOpen(prop.value);
        diagnostic.data = {
          code: generate(newProps).code,
          actionName: '将 visible 替换为 open',
        };
      }

      if (prop?.name === 'bodyStyle') {
        diagnostic.message = `bodyStyle 属性已废弃，请使用 styles.body 属性`;
        const bodyStyleValue = xxxStyleToStylesBody(prop.value);
        diagnostic.data = {
          code: generate(bodyStyleValue).code,
          actionName: '将 bodyStyle 替换为 styles.body',
        };
      }

      if (prop?.name === 'maskStyle') {
        diagnostic.message = `maskStyle 属性已废弃，请使用 styles.mask 属性`;
        const maskStyleValue = xxxStyleToStylesBody(prop.value, 'mask');
        diagnostic.data = {
          code: generate(maskStyleValue).code,
          actionName: '将 maskStyle 替换为 styles.mask',
        };
      }

      if (!diagnostic.message) {
        return;
      }
      return diagnostic;
    })
    .filter((item) => item?.message) as Diagnostic[];
};

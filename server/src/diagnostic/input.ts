import { Diagnostic, DiagnosticSeverity, Position } from 'vscode-languageserver';
import { JSXComponentType } from '../genDiagnostic';
import * as t from '@babel/types';
import { borderedToVariant } from '../utils';
import generate from '@babel/generator';

export const inputDiagnostic = (item: JSXComponentType) => {
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

      if (prop?.name === 'bordered') {
        if (keys.includes('variant')) {
          diagnostic.message = `bordered 和 variant 属性冲突，请删除 bordered 属性`;
          diagnostic.data = {
            code: '',
            actionName: '删除 bordered 属性',
          };
          return diagnostic;
        }

        const action = borderedToVariant(prop.value);
        diagnostic.message = action?.message || '';
        diagnostic.data = {
          code:
            typeof action?.props !== 'string' ? generate(action?.props as t.JSXAttribute).code : '',
          actionName: action?.actionName,
        };
      }
      if (!diagnostic.message) {
      }
      return diagnostic;
    })
    .filter((item) => item?.message) as Diagnostic[];
};

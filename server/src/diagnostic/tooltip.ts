import { Diagnostic, DiagnosticSeverity, Position } from 'vscode-languageserver';
import { JSXComponentType } from '../genDiagnostic';
import { onVisibleChangeChangeToOnOpenChange, visibleToOpen } from '../utils';
import generate from '@babel/generator';

export const tooltipDiagnostic = (item: JSXComponentType) => {
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

      if (prop?.name === 'defaultVisible') {
        diagnostic.message = `${prop?.name} 属性已废弃，请使用 defaultOpen 属性`;
        const newProps = visibleToOpen(prop.value, 'defaultOpen');
        diagnostic.data = {
          code: generate(newProps).code,
          actionName: `将 ${prop?.name} 替换为 defaultOpen`,
        };
      }

      if (prop?.name === 'afterVisibleChange') {
        diagnostic.message = `${prop?.name} 属性已废弃，请使用 afterOpenChange 属性`;
        const newProps = onVisibleChangeChangeToOnOpenChange(prop.value, 'afterVisibleChange');
        diagnostic.data = {
          code: generate(newProps).code,
          actionName: `将 ${prop?.name} 替换为 afterOpenChange`,
        };
      }

      if (diagnostic.message) {
        return diagnostic;
      }
      return null;
    })
    .filter((item) => item?.message) as Diagnostic[];
};

import { Diagnostic, DiagnosticSeverity, Position } from 'vscode-languageserver';
import { JSXComponentType } from '../genDiagnostic';
import * as t from '@babel/types';
import generate from '@babel/generator';
import { afterVisibleChangeToAfterOpenChange, visibleToOpen, xxxStyleToStylesBody } from '../utils';

export const drawerDiagnostic = (item: JSXComponentType) => {
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
        diagnostic.message = `${prop?.name} 属性已废弃，请使用 open 属性`;
        const newProps = visibleToOpen(prop.value);
        diagnostic.data = {
          code: generate(newProps).code,
          actionName: '将 visible 替换为 open',
        };
      }
      if (prop?.name === 'afterVisibleChange') {
        diagnostic.message = `${prop?.name} 属性已废弃，请使用 afterOpenChange 属性`;
        const newProps = afterVisibleChangeToAfterOpenChange(prop.value);
        diagnostic.data = {
          code: generate(newProps).code,
          actionName: `将 ${prop?.name} 替换为 afterOpenChange`,
        };
      }

      if (prop?.name === 'bodyStyle') {
        diagnostic.message = `${prop?.name} 属性已废弃，请使用 styles.body 属性`;
        const bodyStyleValue = xxxStyleToStylesBody(prop.value);
        diagnostic.data = {
          code: generate(bodyStyleValue).code,
          actionName: `将 ${prop?.name} 替换为 styles.body`,
        };
      }

      if (prop?.name === 'maskStyle') {
        diagnostic.message = `${prop?.name} 属性已废弃，请使用 styles.mask 属性`;
        const maskStyleValue = xxxStyleToStylesBody(prop.value, 'mask');
        diagnostic.data = {
          code: generate(maskStyleValue).code,
          actionName: `将 ${prop?.name} 替换为 styles.mask`,
        };
      }

      if (prop?.name === 'footerStyle') {
        diagnostic.message = `${prop?.name} 属性已废弃，请使用 styles.footer 属性`;
        const maskStyleValue = xxxStyleToStylesBody(prop.value, 'footer');
        diagnostic.data = {
          code: generate(maskStyleValue).code,
          actionName: `将 ${prop?.name} 替换为 styles.footer`,
        };
      }

      if (prop?.name === 'contentWrapperStyle') {
        diagnostic.message = `${prop?.name} 属性已废弃，请使用 styles.wrapper 属性`;
        const xxxStyleValue = xxxStyleToStylesBody(prop.value, 'wrapper');
        diagnostic.data = {
          code: generate(xxxStyleValue).code,
          actionName: `将 ${prop?.name} 替换为 styles.wrapper`,
        };
      }

      if (prop?.name === 'headerStyle') {
        diagnostic.message = `${prop?.name} 属性已废弃，请使用 styles.header 属性`;
        const xxxStyleValue = xxxStyleToStylesBody(prop.value, 'header');
        diagnostic.data = {
          code: generate(xxxStyleValue).code,
          actionName: `将 ${prop?.name} 替换为 styles.header`,
        };
      }

      if (prop?.name === 'drawerStyle') {
        diagnostic.message = `${prop?.name} 属性已废弃，请使用 styles.content 属性`;
        const xxxStyleValue = xxxStyleToStylesBody(prop.value, 'content');
        diagnostic.data = {
          code: generate(xxxStyleValue).code,
          actionName: `将 ${prop?.name} 替换为 styles.content`,
        };
      }

      if (!diagnostic.message) {
        return;
      }
      return diagnostic;
    })
    .filter((item) => item?.message) as Diagnostic[];
};

import {
  CodeAction,
  CodeActionContext,
  CodeActionKind,
  Range,
  Selection,
  TextDocument,
  WorkspaceEdit,
} from 'vscode';

/**
 * 提供代码操作的函数。
 *
 * @param document - 当前文档对象。
 * @param range - 代码操作的范围。
 * @param context - 代码操作的上下文。
 * @returns 代码操作的数组。
 */
export async function provideCodeActions(
  document: TextDocument,
  _: Range | Selection,
  context: CodeActionContext,
) {
  const actions: CodeAction[] = [];
  context.diagnostics.forEach((diagnostic) => {
    // 如果诊断信息是自己的插件产生的，则进行处理
    if (diagnostic.source !== 'Ant Design For VSCode') {
      return;
    }
    const { data } = diagnostic as any as {
      data: {
        code: string;
        actionName: string;
      };
    };
    // 如果没有代码操作，则直接返回
    if (!data?.code) {
      return;
    }
    const action = new CodeAction(data.actionName, CodeActionKind.QuickFix);

    action.diagnostics = [diagnostic];

    // 修改完成后，格式化文档
    action.command = {
      command: 'editor.action.formatDocument',
      title: '格式化文档',
    };

    const edit = new WorkspaceEdit();

    edit.replace(document.uri, diagnostic.range, data.code);

    action.edit = edit;

    actions.push(action);
  });

  return actions;
}

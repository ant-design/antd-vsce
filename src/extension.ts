// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import { workspace } from 'vscode';

let client: LanguageClient;

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

import { provideDefinition } from './jump-to';
import { provideHover } from './props-hover';
import { provideCodeActions } from './provideCodeActions';
import { provideCompletionItems, resolveCompletionItem } from './umi-config-completion';

export function activate(context: vscode.ExtensionContext) {
  const languageSelector = [
    'json',
    'typescript',
    'javascript',
    'javascriptreact',
    'typescriptreact',
  ];
  context.subscriptions.push(
    // 注册跳转到定义
    vscode.languages.registerDefinitionProvider(languageSelector, {
      provideDefinition: provideDefinition as any,
    }),
  );
  context.subscriptions.push(
    // 注册自动补全
    vscode.languages.registerCompletionItemProvider(
      languageSelector,
      {
        resolveCompletionItem,
        provideCompletionItems,
      },
      '.',
    ),
  );

  context.subscriptions.push(
    // 注册悬停提示
    vscode.languages.registerHoverProvider(languageSelector, {
      provideHover,
    }),
  );

  vscode.languages.registerCodeActionsProvider(languageSelector, {
    // 注册代码操作
    provideCodeActions,
  });

  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: languageSelector,
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'languageServerExample',
    'Language Server Example',
    serverOptions,
    clientOptions,
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  Diagnostic,
  InitializeResult,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
} from 'vscode-languageserver/node';
import { getJSXComponentList } from './genDiagnostic';

const connection = createConnection(ProposedFeatures.all);

// 创建一个简单的文本文档管理器。
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize(() => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
    },
  };
  return result;
});

// 文本文档内容已更改。当文本文档首次打开或其内容已更改时，会发出此事件。
documents.onDidChangeContent((change) => {
  const diagnostics: Diagnostic[] = getJSXComponentList(change.document);
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

connection.onDidChangeWatchedFiles((_change) => {
  // 在 VSCode 中监视的文件发生更改
  connection.console.log('我们收到了文件更改事件');
});

// 让文本文档管理器在连接上监听打开、更改和关闭文本文档事件
documents.listen(connection);

// 在连接上监听
connection.listen();

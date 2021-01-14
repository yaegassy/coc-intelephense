import {
  commands,
  Disposable,
  ExtensionContext,
  LanguageClient,
  LanguageClientOptions,
  NodeModule,
  NotificationType,
  RequestType,
  TransportKind,
  window,
  workspace,
} from 'coc.nvim';

import { existsSync } from 'fs';

const LanguageID = 'php';
const INDEXING_STARTED_NOTIFICATION = new NotificationType('indexingStarted');
const INDEXING_ENDED_NOTIFICATION = new NotificationType('indexingEnded');
const CANCEL_INDEXING_REQUEST = new RequestType('cancelIndexing');
const INDEX_WORKSPACE_CMD_NAME = 'intelephense.index.workspace';
const CANCEL_INDEXING_CMD_NAME = 'intelephense.cancel.indexing';

let extensionContext: ExtensionContext;
let clientDisposable: Disposable;
let languageClient: LanguageClient;

let module: string;

export async function activate(context: ExtensionContext): Promise<void> {
  extensionContext = context;

  const config = workspace.getConfiguration('intelephense');

  const isEnable = config.get<boolean>('enable', true);
  if (!isEnable) {
    return;
  }

  module = context.asAbsolutePath('node_modules/intelephense');
  if (!existsSync(module)) {
    window.showMessage(`intelephense module doesn't exist, please reinstall coc-intelephense"`, 'error');
    return;
  }

  const clearCache = true;
  languageClient = createClient(context, clearCache);

  context.subscriptions.push(
    commands.registerCommand(INDEX_WORKSPACE_CMD_NAME, indexWorkspace),
    commands.registerCommand(CANCEL_INDEXING_CMD_NAME, cancelIndexing)
  );

  clientDisposable = languageClient.start();
}

function createClient(context: ExtensionContext, clearCache: boolean) {
  const serverOptions: NodeModule = {
    module,
    transport: TransportKind.ipc,
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { language: LanguageID, scheme: 'file' },
      { language: LanguageID, scheme: 'untitled' },
    ],
    initializationOptions: {
      globalStoragePath: context.storagePath,
      storagePath: context.storagePath,
      clearCache: clearCache,
    },
  };

  const languageClient = new LanguageClient('intelephense', 'intelephense', serverOptions, clientOptions);

  languageClient.onReady().then(() => {
    let startedTime: Date;

    languageClient.onNotification(INDEXING_STARTED_NOTIFICATION.method, () => {
      startedTime = new Date();
      window.showMessage('intelephense indexing ...');
    });

    languageClient.onNotification(INDEXING_ENDED_NOTIFICATION.method, () => {
      const usedTime: number = Math.abs(new Date().getTime() - startedTime.getTime());
      window.showMessage('Indexed php files, times: ' + usedTime + 'ms');
    });
  });

  return languageClient;
}

function indexWorkspace() {
  if (!languageClient) {
    return;
  }
  languageClient.stop().then(() => {
    clientDisposable.dispose();
    languageClient = createClient(extensionContext, true);
    clientDisposable = languageClient.start();
  });
}

function cancelIndexing() {
  languageClient.sendRequest(CANCEL_INDEXING_REQUEST.method);
}

import {
  commands,
  Disposable,
  ExtensionContext,
  LanguageClient,
  LanguageClientOptions,
  NotificationType,
  RequestType,
  ServerOptions,
  TransportKind,
  window,
  workspace,
  languages,
} from 'coc.nvim';

import { existsSync } from 'fs';
import { IntelephenseCodeActionProvider } from './actions';
import { IntelephenseSnippetsCompletionProvider } from './completion/IntelephenseSnippetsCompletion';

const PHP_LANGUAGE_ID = 'php';
const INDEXING_STARTED_NOTIFICATION = new NotificationType('indexingStarted');
const INDEXING_ENDED_NOTIFICATION = new NotificationType('indexingEnded');
const CANCEL_INDEXING_REQUEST = new RequestType('cancelIndexing');
const INDEX_WORKSPACE_CMD_NAME = 'intelephense.index.workspace';
const CANCEL_INDEXING_CMD_NAME = 'intelephense.cancel.indexing';

let extensionContext: ExtensionContext;
let clientDisposable: Disposable;
let languageClient: LanguageClient;

export async function activate(context: ExtensionContext): Promise<void> {
  extensionContext = context;

  const extConfig = workspace.getConfiguration('intelephense');

  const isEnable = extConfig.get<boolean>('enable', true);
  if (!isEnable) return;

  const module = context.asAbsolutePath('node_modules/intelephense');
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

  // Add setlocal iskeyword
  const { document } = await workspace.getCurrentState();
  if (document.languageId === 'php') {
    try {
      await workspace.nvim.command('setlocal iskeyword+=$');
    } catch {
      // noop
    }
  }

  // Add snippets completion by "client" side
  const isEnableClientSnippetsCompletion = extConfig.get<boolean>('client.disableSnippetsCompletion', false);
  if (!isEnableClientSnippetsCompletion) {
    context.subscriptions.push(
      languages.registerCompletionItemProvider(
        'intelephense-snippets',
        'ISnippets',
        ['php'],
        new IntelephenseSnippetsCompletionProvider(context)
      )
    );
  }

  // Add code action by "client" side
  const codeActionProvider = new IntelephenseCodeActionProvider(languageClient.outputChannel);
  context.subscriptions.push(
    languages.registerCodeActionProvider(
      [{ language: PHP_LANGUAGE_ID, scheme: 'file' }],
      codeActionProvider,
      'intelephense'
    )
  );
}

function createClient(context: ExtensionContext, clearCache: boolean) {
  const intelephenseConfig = workspace.getConfiguration('intelephense');
  const runtime = intelephenseConfig.get('runtime') as string | undefined;
  const memory = Math.floor(Number(intelephenseConfig.get('maxMemory')));
  const licenceKey = intelephenseConfig.get('licenceKey') as string | undefined;
  const serverDisableCompletion = intelephenseConfig.get<boolean>('server.disableCompletion') || false;

  let module = intelephenseConfig.get('path') as string | undefined;
  if (module) {
    module = workspace.expand(module);
    if (!existsSync(module)) {
      module = undefined;
    }
  }

  if (!module) {
    module = context.asAbsolutePath('node_modules/intelephense');
  }

  const debugOptions = {
    execArgv: ['--nolazy', '--inspect=6039', '--trace-warnings', '--preserve-symlinks'],
    detached: true,
  };

  const serverOptions: ServerOptions = {
    run: { module: module, transport: TransportKind.ipc },
    debug: { module: module, transport: TransportKind.ipc, options: debugOptions },
  };

  if (runtime) {
    serverOptions.run.runtime = runtime;
    serverOptions.debug.runtime = runtime;
  }

  if (memory && memory >= 256) {
    const maxOldSpaceSize = '--max-old-space-size=' + memory.toString();
    serverOptions.run.options = { execArgv: [maxOldSpaceSize] };
    if (serverOptions.debug.options) {
      if (serverOptions.debug.options.execArgv) {
        serverOptions.debug.options.execArgv.push(maxOldSpaceSize);
      }
    }
  }

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { language: PHP_LANGUAGE_ID, scheme: 'file' },
      { language: PHP_LANGUAGE_ID, scheme: 'untitled' },
    ],
    initializationOptions: {
      globalStoragePath: context.storagePath,
      storagePath: context.storagePath,
      clearCache: clearCache,
      licenceKey: licenceKey,
    },
    disableCompletion: serverDisableCompletion,
  };

  const languageClient = new LanguageClient('intelephense', 'intelephense', serverOptions, clientOptions);

  languageClient.onReady().then(() => {
    registerNotificationListeners();
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

// MEMO: support progress window for indexing
function registerNotificationListeners() {
  const intelephenseConfig = workspace.getConfiguration('intelephense');
  const progressEnable = intelephenseConfig.get<boolean>('progress.enable');

  let resolveIndexingPromise: () => void;

  if (progressEnable) {
    languageClient.onNotification(INDEXING_STARTED_NOTIFICATION.method, () => {
      displayInitIndexProgress(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        new Promise<void>((resolve, reject) => {
          resolveIndexingPromise = () => {
            resolve();
          };
        })
      );
    });

    languageClient.onNotification(INDEXING_ENDED_NOTIFICATION.method, () => {
      if (resolveIndexingPromise) {
        resolveIndexingPromise();
      }
    });
  } else {
    languageClient.onNotification(INDEXING_STARTED_NOTIFICATION.method, () => {
      window.showMessage('intelephense indexing ...');
    });

    languageClient.onNotification(INDEXING_ENDED_NOTIFICATION.method, () => {
      if (resolveIndexingPromise) {
        resolveIndexingPromise();
      }
      window.showMessage('intelephense running!');
    });
  }
}

// MEMO: support progress window for indexing
async function displayInitIndexProgress<T = void>(promise: Promise<T>) {
  return window.withProgress(
    {
      title: 'intelephense indexing ...',
      cancellable: true,
    },
    () => promise
  );
}

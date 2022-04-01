import {
  CancellationToken,
  commands,
  Diagnostic,
  Disposable,
  ExtensionContext,
  HandleDiagnosticsSignature,
  LanguageClient,
  LanguageClientOptions,
  LinesTextDocument,
  NotificationType,
  Position,
  ProvideDefinitionSignature,
  RequestType,
  ServerOptions,
  TransportKind,
  window,
  workspace,
  languages,
} from 'coc.nvim';

import { existsSync } from 'fs';
import { IntelephenseSnippetsCompletionProvider } from './completion/IntelephenseSnippetsCompletion';
import { IntelephenseCodeActionProvider } from './actions';
import { IntelephenseCodeLensProvider } from './lenses';
import { runCommandCommand, runCommandPlusCommand, runScriptsCommand } from './commands/composer';
import { fileTestCommand, singleTestCommand, projectTestCommand } from './commands/phpunit';

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

  // Add iskeyword
  const { document } = await workspace.getCurrentState();
  if (document.languageId === 'php') {
    try {
      await workspace.nvim.command('setlocal iskeyword+=$');

      workspace.registerAutocmd({
        event: 'FileType',
        pattern: 'php',
        request: true,
        callback: async () => {
          await workspace.nvim.command('setlocal iskeyword+=$');
        },
      });
    } catch {
      // noop
    }
  }

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

  // Add snippets completion by "client" side
  const isEnableClientSnippetsCompletion = extConfig.get<boolean>('client.disableSnippetsCompletion', false);
  if (!isEnableClientSnippetsCompletion) {
    context.subscriptions.push(
      languages.registerCompletionItemProvider(
        'intelephense-snippets',
        'intelephense',
        ['php'],
        new IntelephenseSnippetsCompletionProvider(context),
        [],
        99
      )
    );
  }

  // Add commands by "client" side
  context.subscriptions.push(
    commands.registerCommand('intelephense.phpunit.projectTest', projectTestCommand()),
    commands.registerCommand('intelephense.phpunit.fileTest', fileTestCommand()),
    commands.registerCommand('intelephense.phpunit.singleTest', singleTestCommand()),
    commands.registerCommand('intelephense.composer.runCommand', runCommandCommand()),
    commands.registerCommand('intelephense.composer.runCommandPlus', runCommandPlusCommand()),
    commands.registerCommand('intelephense.composer.runScriptsCommand', runScriptsCommand())
  );

  // Add code lens by "client" side
  if (!getConfigPhpUnitDisableCodeLens()) {
    context.subscriptions.push(
      languages.registerCodeLensProvider(
        [{ language: PHP_LANGUAGE_ID, scheme: 'file' }],
        new IntelephenseCodeLensProvider()
      )
    );
  }

  // Add code action by "client" side
  context.subscriptions.push(
    languages.registerCodeActionProvider(
      [{ language: PHP_LANGUAGE_ID, scheme: 'file' }],
      new IntelephenseCodeActionProvider(languageClient.outputChannel),
      'intelephense'
    )
  );
}

function createClient(context: ExtensionContext, clearCache: boolean) {
  const intelephenseConfig = workspace.getConfiguration('intelephense');
  const runtime = intelephenseConfig.get('runtime') as string | undefined;
  const memory = Math.floor(Number(intelephenseConfig.get('maxMemory')));
  const licenceKey = intelephenseConfig.get('licenceKey') as string | undefined;

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
    disabledFeatures: getLanguageClientDisabledFeatures(),
    middleware: {
      provideDefinition: async (
        document: LinesTextDocument,
        position: Position,
        token: CancellationToken,
        next: ProvideDefinitionSignature
      ) => {
        if (getConfigServerDisableDefinition()) return;
        return await next(document, position, token);
      },
      handleDiagnostics: getConfigDiagnosticsIgnoreErrorFeature() ? handleDiagnostics : undefined,
    },
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

function handleDiagnostics(uri: string, diagnostics: Diagnostic[], next: HandleDiagnosticsSignature) {
  const doc = workspace.getDocument(uri);
  next(
    uri,
    diagnostics
      .filter((d) => {
        const curLine = doc.getline(d.range.start.line);
        return curLine.indexOf('@intelephense-ignore-line') === -1;
      })
      .filter((d) => {
        const len = doc.getLines().length;
        const prevLine = len > 1 ? doc.getline(d.range.start.line - 1) : '';
        return prevLine.indexOf('@intelephense-ignore-next-line') === -1;
      })
  );
}

function getLanguageClientDisabledFeatures() {
  const r: string[] = [];
  if (getConfigServerDisableCompletion()) r.push('completion');
  return r;
}

function getConfigServerDisableCompletion() {
  return workspace.getConfiguration('intelephense').get<boolean>('server.disableCompletion', false);
}

function getConfigServerDisableDefinition() {
  return workspace.getConfiguration('intelephense').get<boolean>('server.disableDefinition', false);
}

function getConfigDiagnosticsIgnoreErrorFeature() {
  return workspace.getConfiguration('intelephense').get<boolean>('client.diagnosticsIgnoreErrorFeature', false);
}

function getConfigPhpUnitDisableCodeLens() {
  return workspace.getConfiguration('intelephense').get<boolean>('phpunit.disableCodeLens', false);
}

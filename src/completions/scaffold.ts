import {
  CancellationToken,
  CompletionContext,
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  CompletionList,
  ExtensionContext,
  InsertTextFormat,
  languages,
  Position,
  TextDocument,
  Uri,
  workspace,
} from 'coc.nvim';
import fs from 'fs';
import path from 'path';

type ComposerJsonContentType = {
  autoload: {
    ['psr-4']: {
      [key: string]: string;
    };
  };
  'autoload-dev': {
    ['psr-4']: {
      [key: string]: string;
    };
  };
};

type NamespaceType = { [key: string]: string };

type CompletionDataEntryType = {
  originalInsertText: string;
};

export function activate(context: ExtensionContext) {
  if (!workspace.getConfiguration('intelephense').get('client.disableScaffoldCompletion', false)) {
    context.subscriptions.push(
      languages.registerCompletionItemProvider(
        'intelephense-scaffold',
        'intelephense',
        ['php'],
        new ScaffoldCompletionProvider()
      )
    );
  }
}

export class ScaffoldCompletionProvider implements CompletionItemProvider {
  async getScaffoldCompletions(document: TextDocument) {
    const scaffoldCompletionItems: CompletionItem[] = [];

    const composerJsonPath = path.join(workspace.root, 'composer.json');
    let composerJsonContent: ComposerJsonContentType | null = null;
    try {
      composerJsonContent = JSON.parse(fs.readFileSync(composerJsonPath, 'utf8'));
    } catch (error) {
      composerJsonContent = null;
    }

    const fileName = document.uri.split('/').slice(-1)[0].replace('.php', '');

    let namespace = '';
    if (composerJsonContent) {
      const projectNamespaces = this.getProjectNamespacesFromComposerJson(composerJsonContent);
      const workspaceUriPath = Uri.parse(workspace.root).toString();
      const fileUriPath = document.uri;
      const relativeFilePath = fileUriPath.replace(workspaceUriPath + '/', '');

      const fileNamespace = this.getFileNamespace(projectNamespaces, relativeFilePath);
      if (fileNamespace) namespace = fileNamespace;
    }

    const phpObjectTypes = ['class', 'interface', 'trait', 'enum'] as const;
    phpObjectTypes.forEach((p) => {
      const contents: string[] = [];
      contents.push(`<?php\n`);
      contents.push(`\n`);
      contents.push(`declare(strict_types=1);\n`);
      contents.push(`\n`);

      if (namespace) {
        contents.push(`namespace ${namespace};\n`);
        contents.push(`\n`);
      }

      contents.push(`${p} ${fileName}\n`);
      contents.push(`{\n`);
      contents.push(`\t\${0:// ...code}\n`);
      contents.push(`}\n`);

      scaffoldCompletionItems.push({
        label: `${p}_scaffold`,
        kind: CompletionItemKind.Snippet,
        detail: `${p} scaffold completion`,
        documentation: { kind: 'markdown', value: '```php\n' + contents.join('') + '```' },
        insertTextFormat: InsertTextFormat.Snippet,
        data: <CompletionDataEntryType>{
          originalInsertText: contents.join(''),
        },
      });
    });

    return scaffoldCompletionItems;
  }

  private getProjectNamespacesFromComposerJson(composerJsonContent: ComposerJsonContentType) {
    const projectNamespaces: { [key: string]: string }[] = [];

    try {
      if ('psr-4' in composerJsonContent.autoload) {
        for (const [k, v] of Object.entries(composerJsonContent.autoload['psr-4'])) {
          projectNamespaces.push({
            [k]: v,
          });
        }
      }

      if ('psr-4' in composerJsonContent['autoload-dev']) {
        for (const [k, v] of Object.entries(composerJsonContent['autoload-dev']['psr-4'])) {
          projectNamespaces.push({
            [k]: v,
          });
        }
      }
    } catch (e) {
      // noop...
    }

    return projectNamespaces;
  }

  private getFileNamespace(namespaces: NamespaceType[], relativeFilePath: string) {
    const fileName = relativeFilePath.split('/').slice(-1)[0];

    for (const namespace of namespaces) {
      for (const k of Object.keys(namespace)) {
        if (relativeFilePath.startsWith(namespace[k])) {
          const fileNamespace = relativeFilePath
            .replace(namespace[k], k)
            .replace(/\//g, '\\')
            .replace(fileName, '')
            .replace(/\\$/, '');

          return fileNamespace;
        }
      }
    }
  }

  async provideCompletionItems(
    document: TextDocument,
    position: Position,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: CompletionContext
  ): Promise<CompletionItem[] | CompletionList> {
    const completionItems: CompletionItem[] = [];
    // skip except for the first line.
    if (position.line !== 0) return completionItems;

    const doc = workspace.getDocument(document.uri);
    if (!doc) return [];

    const completions = await this.getScaffoldCompletions(document);
    completionItems.push(...completions);

    return completionItems;
  }

  async resolveCompletionItem(item: CompletionItem): Promise<CompletionItem> {
    if (item.kind === CompletionItemKind.Snippet) {
      if (item.data) {
        const dataEntry = item.data as CompletionDataEntryType;
        item.insertText = dataEntry.originalInsertText;
      }
    }
    return item;
  }
}

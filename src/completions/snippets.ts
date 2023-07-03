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
  workspace,
} from 'coc.nvim';
import fs from 'fs';
import path from 'path';

type SnippetsJsonType = {
  [key: string]: {
    description: string;
    prefix: string;
    body: string | string[];
  };
};

export function activate(context: ExtensionContext) {
  if (!workspace.getConfiguration('intelephense').get('client.disableSnippetsCompletion', false)) {
    context.subscriptions.push(
      languages.registerCompletionItemProvider(
        'intelephense-snippets',
        'intelephense',
        ['php'],
        new SnippetsCompletionProvider(context),
        [],
        99
      )
    );
  }
}

export class SnippetsCompletionProvider implements CompletionItemProvider {
  private _context: ExtensionContext;
  private snippetsFilePath: string;
  private excludeSnippetsKeys: string[];

  constructor(context: ExtensionContext) {
    this._context = context;
    this.snippetsFilePath = path.join(this._context.extensionPath, 'data', 'snippets', 'extended', 'php.code-snippets');
    this.excludeSnippetsKeys = workspace
      .getConfiguration('intelephense')
      .get<string[]>('client.snippetsCompletionExclude', []);
  }

  async getSnippetsCompletionItems(snippetsFilePath: string) {
    const snippetsCompletionList: CompletionItem[] = [];
    if (fs.existsSync(snippetsFilePath)) {
      const snippetsJsonText = fs.readFileSync(snippetsFilePath, 'utf8');
      const snippetsJson: SnippetsJsonType = JSON.parse(snippetsJsonText);
      if (snippetsJson) {
        Object.keys(snippetsJson).map((key) => {
          // Check exclude
          if (this.excludeSnippetsKeys.includes(snippetsJson[key].prefix)) return;

          let snippetsText: string;
          const body = snippetsJson[key].body;
          if (body instanceof Array) {
            snippetsText = body.join('\n');
          } else {
            snippetsText = body;
          }

          // In this extention, "insertText" is handled by "resolveCompletionItem".
          // In "provideCompletionItems", if "insertText" contains only snippets data,
          // it will be empty when the candidate is selected.
          snippetsCompletionList.push({
            label: snippetsJson[key].prefix,
            kind: CompletionItemKind.Snippet,
            filterText: snippetsJson[key].prefix,
            detail: snippetsJson[key].description,
            documentation: { kind: 'markdown', value: '```php\n<?php\n' + snippetsText + '\n```' },
            insertTextFormat: InsertTextFormat.Snippet,
            // The "snippetsText" that will eventually be added to the insertText
            // will be stored in the "data" key
            data: snippetsText,
          });
        });
      }
    }

    return snippetsCompletionList;
  }

  async provideCompletionItems(
    document: TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    position: Position,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: CancellationToken,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context: CompletionContext
  ): Promise<CompletionItem[] | CompletionList> {
    const doc = workspace.getDocument(document.uri);
    if (!doc) return [];

    const wordRange = doc.getWordRangeAtPosition(Position.create(position.line, position.character - 1), '>:"\'');
    if (!wordRange) return [];

    const text = document.getText(wordRange) || '';
    if (!text) return [];

    if (text.match(/[>:"']/)) return [];

    const completionList = this.getSnippetsCompletionItems(this.snippetsFilePath);
    return completionList;
  }

  async resolveCompletionItem(item: CompletionItem): Promise<CompletionItem> {
    if (item.kind === CompletionItemKind.Snippet) {
      item.insertText = item.data;
    }
    return item;
  }
}

import {
  CodeAction,
  CodeActionContext,
  CodeActionProvider,
  Document,
  ExtensionContext,
  languages,
  Range,
  TextDocument,
  window,
  workspace,
} from 'coc.nvim';

export function register(context: ExtensionContext) {
  context.subscriptions.push(
    languages.registerCodeActionProvider(
      [{ language: 'php', scheme: 'file' }],
      new OpenPHPNetCodeActionProvider(),
      'intelephense'
    )
  );
}

export class OpenPHPNetCodeActionProvider implements CodeActionProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext) {
    const doc = workspace.getDocument(document.uri);

    const codeActions: CodeAction[] = [];

    /** Line & Cursol & Selected | Open 'php.net' for XXXX */
    if (
      // Line
      this.lineRange(range) ||
      // Cursol & Selected at current line
      range.start.line === range.end.line
    ) {
      const text = await this._getWordAtCursorPosition(document, doc);

      if (text) {
        const url = 'https://www.php.net/' + encodeURIComponent(text);

        const title = `Open 'php.net' for '${text}'`;
        const command = {
          title: '',
          command: 'vscode.open',
          arguments: [url],
        };

        const action: CodeAction = {
          title,
          command,
        };

        codeActions.push(action);
      }
    }

    return codeActions;
  }

  private async _getWordAtCursorPosition(document: TextDocument, doc: Document) {
    const cursorPosition = await window.getCursorPosition();

    const wordRange = doc.getWordRangeAtPosition(cursorPosition, '$');
    if (!wordRange) return null;

    const text = document.getText(wordRange) || '';
    if (!text) return null;

    return text;
  }

  private lineRange(r: Range): boolean {
    return (
      (r.start.line + 1 === r.end.line && r.start.character === 0 && r.end.character === 0) ||
      (r.start.line === r.end.line && r.start.character === 0)
    );
  }
}

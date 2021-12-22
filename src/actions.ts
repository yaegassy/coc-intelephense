import {
  CodeAction,
  CodeActionContext,
  CodeActionProvider,
  Document,
  OutputChannel,
  Position,
  Range,
  TextDocument,
  TextEdit,
  window,
  workspace,
} from 'coc.nvim';

export class IntelephenseCodeActionProvider implements CodeActionProvider {
  outputChannel: OutputChannel;

  constructor(outputChannel: OutputChannel) {
    this.outputChannel = outputChannel;
  }

  public async provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext) {
    const doc = workspace.getDocument(document.uri);

    const codeActions: CodeAction[] = [];

    /** Line & Cursol & Selected | Open 'php.net' for XXXX */
    if (
      // Line
      this.lineRange(range) ||
      // Cursol & Selected
      range.start.line === range.end.line
    ) {
      const text = await this._getWordAtCursorPosition(document, doc);

      if (text) {
        const url = 'https://www.php.net/' + escape(text);

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

    if (workspace.getConfiguration('intelephense').get('client.diagnosticsIgnoreErrorFeature')) {
      /** Add intelephense ignore comment */
      if (this.lineRange(range) && context.diagnostics.length > 0) {
        let existsIntelephenseDiagnostics = false;
        context.diagnostics.forEach((d) => {
          if (d.source === 'intelephense') {
            existsIntelephenseDiagnostics = true;
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const line = doc.getline(range.start.line);

        const thisLineFullLength = doc.getline(range.start.line).length;
        const thisLineTrimLength = doc.getline(range.start.line).trim().length;
        const ignoreLineLength = thisLineFullLength - thisLineTrimLength;

        let ignoreLineNewText = '/** @intelephense-ignore-next-line */\n';
        if (ignoreLineLength > 0) {
          const addIndentSpace = ' '.repeat(ignoreLineLength);
          ignoreLineNewText = '/** @intelephense-ignore-next-line */\n' + addIndentSpace;
        }

        let thisLineContent = doc.getline(range.start.line);
        thisLineContent = thisLineContent.trim();

        // Add @intelephense-ignore-next-line
        if (!thisLineContent.startsWith('/**') && !thisLineContent.startsWith('*') && existsIntelephenseDiagnostics) {
          const edit = TextEdit.insert(Position.create(range.start.line, ignoreLineLength), ignoreLineNewText);
          codeActions.push({
            title: 'Add @intelephense-ignore-next-line',
            edit: {
              changes: {
                [doc.uri]: [edit],
              },
            },
          });
        }

        // Add @intelephense-ignore-line
        if (!thisLineContent.startsWith('/**') && !thisLineContent.startsWith('*') && existsIntelephenseDiagnostics) {
          const edit = TextEdit.replace(
            range,
            `${line} // @intelephense-ignore-line${range.start.line + 1 === range.end.line ? '\n' : ''}`
          );
          codeActions.push({
            title: 'Add @intelephense-ignore-line',
            edit: {
              changes: {
                [doc.uri]: [edit],
              },
            },
          });
        }
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

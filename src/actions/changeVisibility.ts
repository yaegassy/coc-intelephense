import {
  CodeAction,
  CodeActionProvider,
  commands,
  Document,
  DocumentSelector,
  ExtensionContext,
  languages,
  Range,
  TextDocument,
  TextEdit,
  window,
  workspace,
} from 'coc.nvim';

export function activate(context: ExtensionContext) {
  const documentSelector: DocumentSelector = [{ language: 'php', scheme: 'file' }];

  context.subscriptions.push(
    languages.registerCodeActionProvider(documentSelector, new ChangeVisibilityCodeActionProvider(), 'intelephense')
  );

  // internal command
  context.subscriptions.push(
    commands.registerCommand('intelephense.runChangeVisibility', runChangeVisibilityCommand(), null, true)
  );
}

function runChangeVisibilityCommand() {
  return async (doc: Document, wordRange: Range, text: string) => {
    const visibilities = ['public', 'protected', 'private'];
    const changeVisibilities = visibilities.filter((v) => v !== text);

    const picked = await window.showMenuPicker(changeVisibilities, `Select (from ${text})`);

    if (picked !== -1) {
      const edits = [TextEdit.replace(wordRange, changeVisibilities[picked])];
      await doc.applyEdits(edits);
    }
  };
}

class ChangeVisibilityCodeActionProvider implements CodeActionProvider {
  public async provideCodeActions(document: TextDocument, range: Range) {
    const codeActions: CodeAction[] = [];
    const doc = workspace.getDocument(document.uri);

    if (this.cursorRange(range)) {
      const cursorPosition = await window.getCursorPosition();

      const wordRange = doc.getWordRangeAtPosition(cursorPosition);
      if (!wordRange) return [];

      const text = document.getText(wordRange) || '';
      if (!text) return [];

      if (!['public', 'protected', 'private'].includes(text)) return [];

      const actionCommand = {
        title: '',
        command: 'intelephense.runChangeVisibility',
        arguments: [doc, wordRange, text],
      };

      const codeAction: CodeAction = {
        title: 'Change Visibility',
        command: actionCommand,
      };
      codeActions.push(codeAction);
    }

    return codeActions;
  }

  private cursorRange(range: Range) {
    return range.start.line === range.end.line && range.start.character === range.end.character;
  }
}

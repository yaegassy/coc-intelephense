import { commands, ExtensionContext, Position, Range, snippetManager, workspace } from 'coc.nvim';

export function activate(context: ExtensionContext) {
  if (workspace.getConfiguration('intelephense').get<boolean>('client.autoCloseDocCommentDoSuggest', true)) {
    workspace.onDidChangeTextDocument(
      (e) => {
        setTimeout(() => {
          if (!e.textDocument.uri.endsWith('.php')) return;
          if (!e.contentChanges[0]) return;
          if (e.contentChanges[0].text === '\n') return;
          if (e.contentChanges[0].range.start.line !== e.contentChanges[0].range.end.line) return;

          let nextLine = '';
          try {
            nextLine = e.originalLines[e.contentChanges[0].range.start.line + 1].trim();
          } catch (e) {
            // noop
          }

          let currentLine = '';
          try {
            currentLine = e.originalLines[e.contentChanges[0].range.start.line].trim();
          } catch (e) {
            // noop
          }

          if (currentLine.endsWith('*/') || nextLine.endsWith('*/')) return;

          if (
            (e.contentChanges[0].text === '*' && currentLine === '/*') ||
            // In the case of fast input, the contentChanges text character is 2 characters.
            (e.contentChanges[0].text === '**' && currentLine === '/')
          ) {
            let addRangeCharacter = 0;
            if (e.contentChanges[0].text === '*') {
              addRangeCharacter = 1;
            } else if (e.contentChanges[0].text === '**') {
              addRangeCharacter = 2;
            }

            snippetManager.insertSnippet(
              '${0} */',
              true,
              Range.create(
                Position.create(
                  e.contentChanges[0].range.start.line,
                  e.contentChanges[0].range.start.character + addRangeCharacter
                ),
                Position.create(
                  e.contentChanges[0].range.start.line,
                  e.contentChanges[0].range.start.character + addRangeCharacter
                )
              )
            );

            commands.executeCommand('editor.action.triggerSuggest');
          }
        }, 50);
      },
      null,
      context.subscriptions
    );
  }
}

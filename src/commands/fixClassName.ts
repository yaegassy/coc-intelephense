import { commands, ExtensionContext, Position, Range, TextEdit, Uri, window, workspace } from 'coc.nvim';
import path from 'path';
import * as fixClassNameParser from '../parsers/fixClassName';

export function register(context: ExtensionContext) {
  context.subscriptions.push(commands.registerCommand('intelephense.fixClassName', runFixClassName()));
}

export function runFixClassName() {
  return async () => {
    const { document } = await workspace.getCurrentState();
    const classNameByFilePath = path.basename(Uri.parse(document.uri).fsPath, '.php');

    const ast = fixClassNameParser.getAst(document.getText());
    if (!ast) return;

    const classNodes = fixClassNameParser.getClassesNodes(ast.children);
    if (!classNodes.length || classNodes.length > 1) {
      window.showErrorMessage('Class not found or there are multiple classes');
      return;
    }

    const classNameIdentifier = fixClassNameParser.getClassNameIdentifer(classNodes[0]);
    if (!classNameIdentifier) {
      window.showErrorMessage('Failed to parse class');
      return;
    }

    if (!classNameIdentifier.loc) {
      window.showErrorMessage('No location in class name');
      return;
    }

    const doc = await workspace.openTextDocument(Uri.parse(document.uri).fsPath);
    const edits = [
      TextEdit.replace(
        Range.create(
          Position.create(classNameIdentifier.loc.start.line - 1, classNameIdentifier.loc.start.column),
          Position.create(classNameIdentifier.loc.end.line - 1, classNameIdentifier.loc.end.column),
        ),
        classNameByFilePath,
      ),
    ];

    await doc.applyEdits(edits);
  };
}

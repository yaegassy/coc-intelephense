import {
  CancellationToken,
  CodeLens,
  CodeLensProvider,
  events,
  LinesTextDocument,
  Position,
  Range,
  Uri,
  workspace,
} from 'coc.nvim';

import { getMethods, getTestMethods } from '../parsers';

export class PHPUnitCodeLensProvider implements CodeLensProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async provideCodeLenses(document: LinesTextDocument, token: CancellationToken) {
    const filePath = Uri.parse(document.uri).fsPath;

    if (document.languageId !== 'php' || !filePath.endsWith('Test.php')) {
      return [];
    }

    const codeLensTitle = workspace.getConfiguration('intelephense').get('phpunit.codeLensTitle', '>> [RUN PHPUnit]');
    const codeLenses: CodeLens[] = [];

    // do not process codelens when in insert mode
    if (events.insertMode) return codeLenses;

    try {
      const methods = await getMethods(document);
      const testMethods = getTestMethods(methods);

      testMethods.forEach((m) => {
        if (m.startLine && m.endLine) {
          const lens: CodeLens = {
            range: Range.create(Position.create(m.startLine - 1, 0), Position.create(m.endLine, 0)),
            command: {
              title: codeLensTitle,
              command: 'intelephense.phpunit.singleTest',
            },
          };

          codeLenses.push(lens);
        }
      });
    } catch (e) {
      // noop
    }

    // For some reason, the virtual text does not disappear even when the
    // number of code lens goes from 1 to 0.
    //
    // It may be a bug in coc.nvim itself, but it sends code lens with Range
    // of 0 and forces a refresh.
    if (codeLenses.length === 0) {
      codeLenses.push({
        range: Range.create(Position.create(0, 0), Position.create(0, 0)),
      });
    }

    return codeLenses;
  }
}

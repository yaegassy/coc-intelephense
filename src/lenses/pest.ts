import {
  ExtensionContext,
  languages,
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
import { getMethods, getPestTestData, getTestMethods } from '../parsers/unittest';

export function activate(context: ExtensionContext) {
  if (!workspace.getConfiguration('intelephense').get<boolean>('client.disableCodeLens', false)) {
    const useCodelensProvider = workspace
      .getConfiguration('intelephense')
      .get<string>('client.codelensProvider', 'phpunit');

    if (useCodelensProvider === 'pest') {
      context.subscriptions.push(
        languages.registerCodeLensProvider([{ language: 'php', scheme: 'file' }], new PestCodeLensProvider())
      );
    }
  }
}

export class PestCodeLensProvider implements CodeLensProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async provideCodeLenses(document: LinesTextDocument, token: CancellationToken) {
    const filePath = Uri.parse(document.uri).fsPath;

    if (document.languageId !== 'php' || !filePath.endsWith('Test.php')) {
      return [];
    }

    const codeLensTitle = workspace.getConfiguration('intelephense').get('pest.codeLensTitle', '>> [RUN Pest]');
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
              command: 'intelephense.pest.singleTest',
            },
          };

          codeLenses.push(lens);
        }
      });
    } catch (e) {
      // noop
    }

    try {
      const pestTestData = await getPestTestData(document);

      pestTestData.forEach((m) => {
        if (m.startLine && m.endLine) {
          const lens: CodeLens = {
            range: Range.create(Position.create(m.startLine - 1, 0), Position.create(m.endLine, 0)),
            command: {
              title: codeLensTitle,
              command: 'intelephense.pest.singleTest',
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

import {
  CancellationToken,
  CodeLens,
  CodeLensProvider,
  events,
  ExtensionContext,
  languages,
  LinesTextDocument,
  Position,
  Range,
  Uri,
  workspace,
} from 'coc.nvim';
import * as phpParser from '../parsers/php/parser';
import * as phpunitCommon from '../common/phpunit';

export function register(context: ExtensionContext) {
  if (!workspace.getConfiguration('intelephense').get<boolean>('client.disableCodeLens', false)) {
    const useCodelensProvider = workspace
      .getConfiguration('intelephense')
      .get<string>('client.codelensProvider', 'phpunit');

    if (useCodelensProvider === 'phpunit') {
      context.subscriptions.push(
        languages.registerCodeLensProvider([{ language: 'php', scheme: 'file' }], new PHPUnitCodeLensProvider()),
      );
    }
  }
}

export class PHPUnitCodeLensProvider implements CodeLensProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async provideCodeLenses(document: LinesTextDocument, _token: CancellationToken) {
    const filePath = Uri.parse(document.uri).fsPath;

    if (document.languageId !== 'php' || !filePath.endsWith('Test.php')) {
      return [];
    }

    const codeLensTitle = workspace.getConfiguration('intelephense').get('phpunit.codeLensTitle', '>> [RUN PHPUnit]');
    const codeLenses: CodeLens[] = [];

    // do not process codelens when in insert mode
    if (events.insertMode) return codeLenses;

    try {
      const ast = phpParser.getAstByParseCode(document.getText());
      if (!ast) return;

      const testItems = phpunitCommon.getPhpUnitTestItems(ast);

      if (testItems.length > 0) {
        for (const t of testItems) {
          const startPostion = document.positionAt(t.startOffset);
          const endPostion = document.positionAt(t.endOffset);

          const lens: CodeLens = {
            range: Range.create(startPostion, endPostion),
            command: {
              title: codeLensTitle,
              command: 'intelephense.phpunit.singleTest',
            },
          };

          codeLenses.push(lens);
        }
      }
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

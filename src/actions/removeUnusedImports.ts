import {
  CodeAction,
  CodeActionContext,
  CodeActionKind,
  CodeActionProvider,
  Diagnostic,
  Document,
  DocumentSelector,
  ExtensionContext,
  languages,
  Position,
  Range,
  TextDocument,
  TextEdit,
  workspace,
} from 'coc.nvim';

import * as removeUnusedImportsParser from '../parsers/removeUnusedImports';

export function register(context: ExtensionContext) {
  const documentSelector: DocumentSelector = [{ language: 'php', scheme: 'file' }];

  context.subscriptions.push(
    languages.registerCodeActionProvider(documentSelector, new RemoveUnusedImportsCodeActionProvider(), 'intelephense'),
  );
}

type FeatureUseGroupItemType = {
  // zero base range (location)
  rangeStartLine: number;
  rangeStartCharacter: number;
  rangeEndLine: number;
  rangeEndCharacter: number;
  // real locaction
  locStartLine: number;
  locStartColumn: number;
  locEndLine: number;
  locEndColumn: number;
  name: string | null;
  type: string | null;
  items: {
    name: string;
    aliasName: string | null;
    locStartLine: number;
    locStartColumn: number;
    locEndLine: number;
    locEndColumn: number;
  }[];
  diagSymbols: string[];
};

export class RemoveUnusedImportsCodeActionProvider implements CodeActionProvider {
  public async provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext) {
    const codeActions: CodeAction[] = [];
    if (document.languageId !== 'php') return;
    const doc = workspace.getDocument(document.uri);

    if (this.wholeRange(doc, range) && context.diagnostics.length > 0) {
      if (!this.isContainTargetCodeInDiagnostics(context.diagnostics, 'P1003')) return codeActions;

      const ast = removeUnusedImportsParser.getAst(doc.getDocumentContent());
      if (!ast) return codeActions;

      const featureItems: FeatureUseGroupItemType[] = [];
      const useNodes = removeUnusedImportsParser.getUseNodes(ast.children);

      for (const u of useNodes) {
        if (u.loc) {
          if (u.loc.start && u.loc.end) {
            for (const d of context.diagnostics) {
              if (d.code && typeof d.code === 'string') {
                if (d.code === 'P1003') {
                  if (u.loc.start.line <= d.range.start.line + 1 && u.loc.end.line >= d.range.end.line + 1) {
                    // WARNING: The key `item` of type `UseGroup.item` is actually `items`.
                    const flatUseItems = removeUnusedImportsParser.flattenUseItems(u['items']);

                    const diagSymbols: string[] = [];
                    let diagSymbol: string | undefined;
                    for (const useItem of flatUseItems) {
                      if (
                        flatUseItems.length === 1 &&
                        d.range.start.line === u.loc.start.line - 1 &&
                        d.range.start.character === u.loc.start.column &&
                        d.range.end.line === u.loc.end.line - 1 &&
                        d.range.end.character === u.loc.end.column + 1
                      ) {
                        // Rare case handling when there is only one symbol but
                        // it is enclosed in {}
                        diagSymbol = useItem.name;
                      } else if (
                        d.range.start.line === useItem.locStartLine - 1 &&
                        d.range.start.character === useItem.locStartColumn &&
                        d.range.end.line === useItem.locEndLine - 1 &&
                        d.range.end.character === useItem.locEndColumn
                      ) {
                        // **TIPS**:
                        // Even if there is only one symbol, adding a comma,
                        // such as NS\{A,}, makes it a symbol rather than a
                        // line in intelephense diagnostics.
                        diagSymbol = useItem.name;
                      }
                    }

                    if (diagSymbol) {
                      diagSymbols.push(diagSymbol);
                    }

                    const item: FeatureUseGroupItemType = {
                      name: u.name,
                      type: u.type,
                      rangeStartLine: d.range.start.line,
                      rangeStartCharacter: d.range.start.character,
                      rangeEndLine: d.range.end.line,
                      rangeEndCharacter: d.range.end.character,
                      locStartLine: u.loc.start.line,
                      locStartColumn: u.loc.start.column,
                      locEndLine: u.loc.end.line,
                      locEndColumn: u.loc.end.column,
                      items: flatUseItems,
                      diagSymbols: diagSymbols,
                    };

                    let existsSameLocItem = false;
                    featureItems.forEach((f) => {
                      if (
                        f.locStartLine === item.locStartLine &&
                        f.locStartColumn === item.locStartColumn &&
                        f.locEndLine === item.locEndLine &&
                        f.locEndColumn === item.locEndColumn
                      ) {
                        existsSameLocItem = true;
                        if (diagSymbol) f.diagSymbols.push(diagSymbol);
                      }
                    });

                    if (!existsSameLocItem) {
                      featureItems.push(item);
                    }
                  }
                }
              }
            }
          }
        }
      }

      const edits: TextEdit[] = [];
      for (const f of featureItems) {
        const edit = this.generateEdit(f, doc);
        if (edit) {
          edits.push(edit);
        }
      }

      if (edits.length > 0) {
        const action: CodeAction = {
          title: `Remove all unused imports for "use" statetment`,
          kind: CodeActionKind.SourceFixAll,
          edit: {
            changes: {
              [doc.uri]: edits,
            },
          },
        };

        codeActions.push(action);
      }
    }

    return codeActions;
  }

  private isContainTargetCodeInDiagnostics(diagnostics: Diagnostic[], code: string) {
    for (const d of diagnostics) {
      if (d.source === 'intelephense' && typeof d.code === 'string') {
        if (d.code === code) {
          return true;
        }
      }
    }
    return false;
  }

  private generateEdit(item: FeatureUseGroupItemType, document: Document) {
    let edit: TextEdit | undefined;
    if (item.rangeStartLine === 0) return;

    if (item.name === null && item.items.length === 1) {
      // MEMO: "All unused"
      //
      // **Case**:
      //
      // ---
      // use Acme\ClassA;
      // use Acme\ClassB as B;
      // ---

      // If the target range of a line is deleted, a blank line is left.
      // To delete a blank line itself, you must specify the tail range of the previous line.
      const prevStartLine = item.rangeStartLine - 1;
      const prevStartLineContent = document.getline(prevStartLine);
      const prevStartEndColumn = prevStartLineContent.length;

      edit = TextEdit.del(
        Range.create(
          Position.create(prevStartLine, prevStartEndColumn),
          Position.create(item.rangeEndLine, item.rangeEndCharacter),
        ),
      );
    } else if (
      (item.name !== null && item.items.length === item.diagSymbols.length) ||
      (item.name === null && item.items.length > 1 && item.items.length === item.diagSymbols.length)
    ) {
      // MEMO: "All unused"
      //
      // **Case**:
      //
      // ---
      // use Acme\Child\GrandChild\{
      //     ClassE,
      //     ClassF as F,
      //     ClassG,
      // };
      // use Acme\Child\GrandChild\ClassH,
      //     Acme\Child\GrandChild\ClassI as I,
      //     Acme\Child\GrandChild\ClassJ;
      // use function Acme\help1, Acme help2;
      // use function Acme\{help3, help4};
      // use const Acme\CONST1, Acme\CONST2;
      // use const Acme\{CONST3, CONST4};
      // ---

      // If the target range of a line is deleted, a blank line is left.
      // To delete a blank line itself, you must specify the tail range of the previous line.
      //
      // Here we use the php-parser loc. php-parser loc is not zero base.
      const prevStartLine = item.locStartLine - 2;
      const prevStartLineContent = document.getline(prevStartLine);
      const prevStartEndColumn = prevStartLineContent.length;

      // The `php-parser` loc (location) is not a range including semicolons, etc.
      // Here we use the php-parser loc. php-parser loc is not zero base.
      const endLine = item.locEndLine - 1;
      const endColmun = document.getline(endLine).length;

      edit = TextEdit.del(
        Range.create(Position.create(prevStartLine, prevStartEndColumn), Position.create(endLine, endColmun)),
      );
    } else if (item.name === null && item.items.length > 1 && item.items.length !== item.diagSymbols.length) {
      // MEMO: "Partially unused"
      //
      // **Case**:
      //
      // ---
      // use Acme\Child\GrandChild\ClassH,
      //     Acme\Child\GrandChild\ClassI as I,
      //     Acme\Child\GrandChild\ClassJ;
      // use function Acme\help1, Acme\help2;
      // use const Acme\CONST1, Acme\CONST2;
      // ---

      const symbols: string[] = [];
      item.items.forEach((i) => {
        if (!item.diagSymbols.includes(i.name)) {
          if (i.aliasName) {
            symbols.push(`${i.name} as ${i.aliasName}`);
          } else {
            symbols.push(i.name);
          }
        }
      });

      const newTexts: string[] = [];

      if (item.type) {
        newTexts.push(`use ${item.type} ${symbols.join(', ')};`);
      } else {
        newTexts.push(`use ${symbols.join(', ')};`);
      }

      const startLine = item.locStartLine - 1;
      const startColumn = item.locStartColumn;
      const endLine = item.locEndLine - 1;
      const endColmun = document.getline(endLine).length;

      edit = TextEdit.replace(
        Range.create(Position.create(startLine, startColumn), Position.create(endLine, endColmun)),
        newTexts.join(''),
      );
    } else if (item.name !== null && item.diagSymbols.length > 0 && item.items.length !== item.diagSymbols.length) {
      // MEMO: "Partially unused"
      //
      // **Case**:
      //
      // ---
      // use Acme\Child\GrandChild\{
      //     ClassE,
      //     ClassF as F,
      //     ClassG,
      // };
      // use function Acme\{help3, help4};
      // use const Acme\{CONST3, CONST4};
      // ---

      const symbols: string[] = [];
      item.items.forEach((i) => {
        if (!item.diagSymbols.includes(i.name)) {
          if (i.aliasName) {
            symbols.push(`${i.name} as ${i.aliasName}`);
          } else {
            symbols.push(i.name);
          }
        }
      });

      const newTexts: string[] = [];
      if (symbols.length === 1) {
        if (item.type) {
          newTexts.push(`use ${item.type} ${item.name}\\${symbols[0]};`);
        } else {
          newTexts.push(`use ${item.name}\\${symbols[0]};`);
        }
      } else {
        if (item.type) {
          newTexts.push(`use ${item.type} ${item.name}\\{${symbols.join(', ')}};`);
        } else {
          newTexts.push(`use ${item.name}\\{${symbols.join(', ')}};`);
        }
      }

      // The `php-parser` loc (location) is not a range including semicolons, etc.
      // Here we use the php-parser loc. php-parser loc is not zero base.
      const startLine = item.locStartLine - 1;
      const startColumn = item.locStartColumn;
      const endLine = item.locEndLine - 1;
      const endColmun = document.getline(endLine).length;

      edit = TextEdit.replace(
        Range.create(Position.create(startLine, startColumn), Position.create(endLine, endColmun)),
        newTexts.join(''),
      );
    }

    return edit;
  }

  private wholeRange(doc: Document, range: Range): boolean {
    const whole = Range.create(0, 0, doc.lineCount, 0);
    return (
      whole.start.line === range.start.line &&
      whole.start.character === range.start.character &&
      whole.end.line === range.end.line &&
      whole.end.character === whole.end.character
    );
  }
}

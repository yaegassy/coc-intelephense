import {
  CancellationToken,
  CodeAction,
  CodeActionContext,
  CodeActionProvider,
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

import * as getterSetterParser from '../parsers/getterSetter';

// REF: https://www.php-fig.org/psr/psr-12/#24-indenting
const GETTER_SETTER_INDENT_SPACE = 4;

type GetterSetterItemType = {
  methodName: string;
  propertyName: string;
  propertyType: string | string[] | null;
  propertyNullable: boolean;
  propertyDocVarType: string | null;
};

export function activate(context: ExtensionContext) {
  const documentSelector: DocumentSelector = [{ language: 'php', scheme: 'file' }];

  context.subscriptions.push(
    languages.registerCodeActionProvider(documentSelector, new GetterSetterCodeActionProvider(), 'php-tools')
  );
}

class GetterSetterCodeActionProvider implements CodeActionProvider {
  constructor() {}

  public async provideCodeActions(
    document: TextDocument,
    range: Range,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: CodeActionContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken
  ) {
    const codeActions: CodeAction[] = [];
    const doc = workspace.getDocument(document.uri);

    if (this.lineRange(range) || this.selectedRange(doc, range)) {
      const ast = getterSetterParser.getAst(document.getText());
      if (!ast) return [];

      if (!getterSetterParser.isClassRegion(document.getText(), range.start.line + 1, range.end.line + 1)) {
        return [];
      }

      const propertiesFeatureItems = getterSetterParser.getPropertiesWithClassInfo(ast.children);
      const constructorFeatureItems = getterSetterParser.getConstructorPropertiesWithClassInfo(ast.children);
      const featureItems = propertiesFeatureItems.concat(constructorFeatureItems);

      const methods = getterSetterParser.getMethods(ast.children);
      const getterItems: GetterSetterItemType[] = [];
      const setterItems: GetterSetterItemType[] = [];

      featureItems.forEach((f) => {
        // No match if multiple class exists in the range
        if (f.classStartLine <= range.start.line + 1 && f.classEndLine >= range.end.line) {
          // No match if the range does not contain the property
          if (f.propertyStartLine >= range.start.line + 1 && f.propertyEndLine <= range.end.line) {
            const name = f.propertyName
              .split('_')
              .map((str) => str.charAt(0).toLocaleUpperCase() + str.slice(1))
              .join('');

            // Do not add methods that already exist
            let existsSameGetter = false;
            let existsSameSetter = false;
            methods.forEach((m) => {
              if (f.classStartLine <= m.startLine && f.classEndLine >= m.endLine) {
                if ('get' + name === m.name) existsSameGetter = true;
                if ('set' + name === m.name) existsSameSetter = true;
              }
            });
            if (!existsSameGetter) {
              getterItems.push({
                methodName: 'get' + name,
                propertyName: f.propertyName,
                propertyNullable: f.propertyNullable,
                propertyType: f.propertyType,
                propertyDocVarType: f.propertyDocVarType,
              });
            }
            if (!existsSameSetter) {
              setterItems.push({
                methodName: 'set' + name,
                propertyName: f.propertyName,
                propertyNullable: f.propertyNullable,
                propertyType: f.propertyType,
                propertyDocVarType: f.propertyDocVarType,
              });
            }
          }
        }
      });

      const insertLine = featureItems ? featureItems[0].classEndLine : undefined;
      const getterNewText = this.generateGetterNewText(getterItems);
      const setterNewText = this.generateSetterNewText(setterItems);

      if (getterNewText && insertLine) {
        const editPosition = Position.create(insertLine - 1, 0);
        const getterEdit = TextEdit.insert(editPosition, getterNewText);

        const codeAction: CodeAction = {
          title: 'Insert PHP Getter',
          edit: {
            changes: {
              [doc.uri]: [getterEdit],
            },
          },
        };
        codeActions.push(codeAction);
      }

      if (setterNewText && insertLine) {
        const editPosition = Position.create(insertLine - 1, 0);
        const setterEdit = TextEdit.insert(editPosition, setterNewText);

        const codeAction: CodeAction = {
          title: 'Insert PHP Setter',
          edit: {
            changes: {
              [doc.uri]: [setterEdit],
            },
          },
        };
        codeActions.push(codeAction);
      }

      if (getterNewText && setterNewText && insertLine) {
        const editPosition = Position.create(insertLine - 1, 0);
        const getterSetterNewText = getterNewText + setterNewText;
        const getterSetterEdit = TextEdit.insert(editPosition, getterSetterNewText);

        const codeAction: CodeAction = {
          title: 'Insert Getter & Setter',
          edit: {
            changes: {
              [doc.uri]: [getterSetterEdit],
            },
          },
        };
        codeActions.push(codeAction);
      }
    }

    return codeActions;
  }

  private generateGetterNewText(items: GetterSetterItemType[]) {
    const newTextLines: string[] = [];

    items.forEach((item) => {
      const lines: string[] = [];
      const indentSpace = ' '.repeat(GETTER_SETTER_INDENT_SPACE);

      lines.push('\n');

      if (item.propertyType === null && item.propertyDocVarType) {
        lines.push(`${indentSpace}/**\n`);
        lines.push(`${indentSpace} * @return ${item.propertyDocVarType}\n`);
        lines.push(`${indentSpace} */\n`);
      }

      if (item.propertyType && Array.isArray(item.propertyType)) {
        const property = item.propertyType.join('|');
        lines.push(`${indentSpace}public function ${item.methodName}(): ${property}\n`);
      } else if (item.propertyType && typeof item.propertyType === 'string') {
        lines.push(
          `${indentSpace}public function ${item.methodName}(): ${item.propertyNullable ? '?' : ''}${
            item.propertyType
          }\n`
        );
      } else {
        lines.push(`${indentSpace}public function ${item.methodName}()\n`);
      }

      lines.push(`${indentSpace}{\n`);
      lines.push(`${indentSpace}${indentSpace}return ${'$this->' + item.propertyName};\n`);
      lines.push(`${indentSpace}}\n`);

      newTextLines.push(...lines);
    });

    return newTextLines ? newTextLines.join('') : undefined;
  }

  private generateSetterNewText(items: GetterSetterItemType[]) {
    const newTextLines: string[] = [];

    items.forEach((item) => {
      const lines: string[] = [];
      const indentSpace = ' '.repeat(GETTER_SETTER_INDENT_SPACE);

      lines.push('\n');

      if (item.propertyType === null && item.propertyDocVarType) {
        lines.push(`${indentSpace}/**\n`);
        lines.push(`${indentSpace} * @param ${item.propertyDocVarType} $${item.propertyName}\n`);
        lines.push(`${indentSpace} */\n`);
      }

      if (item.propertyType && Array.isArray(item.propertyType)) {
        const property = item.propertyType.join('|');
        lines.push(
          `${indentSpace}public function ${item.methodName}(${item.propertyNullable ? '?' : ''}${property} $${
            item.propertyName
          })\n`
        );
      } else if (item.propertyType && typeof item.propertyType === 'string') {
        lines.push(
          `${indentSpace}public function ${item.methodName}(${item.propertyNullable ? '?' : ''}${item.propertyType} $${
            item.propertyName
          })\n`
        );
      } else {
        lines.push(`${indentSpace}public function ${item.methodName}($${item.propertyName})\n`);
      }

      lines.push(`${indentSpace}{\n`);
      lines.push(`${indentSpace}${indentSpace}${'$this->' + item.propertyName} = $${item.propertyName};\n`);
      lines.push(`${indentSpace}}\n`);

      newTextLines.push(...lines);
    });

    return newTextLines ? newTextLines.join('') : undefined;
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

  private lineRange(r: Range): boolean {
    return (
      (r.start.line + 1 === r.end.line && r.start.character === 0 && r.end.character === 0) ||
      (r.start.line === r.end.line && r.start.character === 0)
    );
  }

  private selectedRange(doc: Document, range: Range): boolean {
    return range.start.line < range.end.line && !this.wholeRange(doc, range);
  }
}

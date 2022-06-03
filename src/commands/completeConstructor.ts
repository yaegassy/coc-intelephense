import { commands, ExtensionContext, Position, Range, TextEdit, Uri, window, workspace } from 'coc.nvim';

import * as completeConstructorParser from '../parsers/completeConstructor';

// REF: https://www.php-fig.org/psr/psr-12/#24-indenting
const COMPLETE_CONSTRUCTOR_INDENT_SPACE = 4;

export function activate(context: ExtensionContext) {
  context.subscriptions.push(commands.registerCommand('intelephense.completeConstructor', runCompleteConstructor()));
}

export function runCompleteConstructor() {
  return async () => {
    const { document } = await workspace.getCurrentState();
    const doc = await workspace.openTextDocument(Uri.parse(document.uri).fsPath);

    const ast = completeConstructorParser.getAst(document.getText());
    if (!ast) return;

    const classNodes = completeConstructorParser.getClassesNodes(ast.children);

    if (!classNodes.length || classNodes.length > 1) {
      window.showErrorMessage('Class not found or there are multiple classes');
      return;
    }

    const constructor = completeConstructorParser.getConstructorMethodNodeFromClassNode(classNodes[0]);

    if (!constructor) return;
    if (!constructor.loc) return;
    if (!constructor.body) return;
    if (!constructor.body.loc) return;

    const constructorPropertiesItems = completeConstructorParser.getConstructorPropertiesFromMethodNode(constructor);
    if (!constructorPropertiesItems) return;

    const indentSpace = ' '.repeat(COMPLETE_CONSTRUCTOR_INDENT_SPACE);
    const newPropContents: string[] = [];
    const newBodyContents: string[] = [];

    const properties = completeConstructorParser.getPropertiesWithClassDetail(classNodes);
    const propertyNames = properties.map((p) => p.propertyName);

    const constructorBodyContents = document.getText(
      Range.create(
        Position.create(constructor.body.loc.start.line - 1, constructor.body.loc.start.column),
        Position.create(constructor.body.loc.end.line - 1, constructor.body.loc.end.column)
      )
    );
    const constructorBodyLines = constructorBodyContents.split('\n');

    constructorPropertiesItems.forEach((cp) => {
      // If "constructor property promotions" are not used
      if (cp.propertyFlags === 0) {
        // newProp
        if (!propertyNames.includes(cp.propertyName)) {
          newPropContents.push(`private`);
          if (cp.propertyType) {
            newPropContents.push(` ${cp.propertyNullable ? '?' : ''}${cp.propertyType} `);
          } else {
            newPropContents.push(` `);
          }
          newPropContents.push(`$${cp.propertyName};`);
          newPropContents.push(`\n\n${indentSpace}`);
        }

        // newBody
        let existsLine = false;
        for (const line of constructorBodyLines) {
          const trimLine = line.trim();
          if (trimLine.startsWith('#') || trimLine.startsWith('//')) continue;

          const pattern = `\\$this->${cp.propertyName}\\s+=\\s+\\$${cp.propertyName};`;
          const regex = new RegExp(pattern);

          if (regex.test(trimLine)) existsLine = true;
        }
        if (!existsLine) {
          newBodyContents.push(`\n${indentSpace}${indentSpace}$this->${cp.propertyName} = $${cp.propertyName};`);
        }
      }
    });

    const edits: TextEdit[] = [];

    if (newPropContents) {
      edits.push(
        TextEdit.insert(
          Position.create(constructor.loc.start.line - 1, constructor.loc.start.column),
          newPropContents.join('')
        )
      );
    }

    if (newBodyContents) {
      edits.push(
        TextEdit.insert(
          Position.create(constructor.body.loc.start.line - 1, constructor.body.loc.start.column + 1),
          newBodyContents.join('')
        )
      );
    }

    if (edits) {
      await doc.applyEdits(edits);
    }
  };
}

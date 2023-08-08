import * as phpParser from '../parsers/php/parser';

import { Identifier, Method, Node } from 'php-parser';

export type PhpUnitTestItemType = {
  methodName: string;
  startOffset: number;
  endOffset: number;
};

export function getPhpUnitTestItems(ast: Node) {
  const items: PhpUnitTestItemType[] = [];

  phpParser.walk((node, parent) => {
    if (!parent) return;
    if (parent.kind !== 'method') return;
    if (node.kind !== 'identifier') return;
    const parentMethodNode = parent as Method;
    const identifierNode = node as Identifier;

    if (!parentMethodNode.loc) return;

    if (!isPhpUnitTestName(identifierNode.name)) return;

    items.push({
      methodName: identifierNode.name,
      startOffset: parentMethodNode.loc.start.offset,
      endOffset: parentMethodNode.loc.end.offset,
    });
  }, ast);

  return items;
}

export function isPhpUnitTestName(name: string) {
  return name.startsWith('test');
}

export function getPhpUnitTestNameAtEditorOffset(testItems: PhpUnitTestItemType[], editorOffset: number) {
  const testNames: string[] = [];

  for (const t of testItems) {
    if (t.startOffset <= editorOffset && t.endOffset >= editorOffset) {
      testNames.push(t.methodName);
    }
  }

  if (testNames.length === 0) return undefined;
  return testNames[0];
}

import * as phpParser from '../parsers/php/parser';

import { Call, Name as NameNode, Node, String as StringNode } from 'php-parser';

export type PestTestItemType = {
  description: string;
  callName: string;
  startOffset: number;
  endOffset: number;
};

export function getPestTestItems(ast: Node) {
  const items: PestTestItemType[] = [];

  phpParser.walk((node, parent) => {
    if (!parent) return;
    if (parent.kind !== 'call') return;
    if (node.kind !== 'name') return;
    const parentCallNode = parent as Call;
    const nameNode = node as NameNode;

    if (!parentCallNode.loc) return;

    if (!isPestTestName(nameNode.name)) return;
    if (parentCallNode.arguments.length === 0) return;
    if (parentCallNode.arguments[0].kind !== 'string') return;
    const stringNode = parentCallNode.arguments[0] as StringNode;

    items.push({
      description: stringNode.value,
      callName: nameNode.name,
      startOffset: parentCallNode.loc.start.offset,
      endOffset: parentCallNode.loc.end.offset,
    });
  }, ast);

  return items;
}

export function isPestTestName(name: string) {
  return ['test', 'it'].includes(name);
}

export function getPestTestDescriptionAtEditorOffset(testItems: PestTestItemType[], editorOffset: number) {
  const testDescriptions: string[] = [];

  for (const t of testItems) {
    if (t.startOffset <= editorOffset && t.endOffset >= editorOffset) {
      testDescriptions.push(t.description);
    }
  }

  if (testDescriptions.length === 0) return undefined;
  return testDescriptions[0];
}

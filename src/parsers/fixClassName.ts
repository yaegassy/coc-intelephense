import { Class, Engine, Namespace, Node, Identifier } from 'php-parser';

const parserEngine = new Engine({
  parser: {
    extractDoc: true,
    php7: true,
    locations: true,
    suppressErrors: true,
  },
  ast: {
    all_tokens: true,
    withPositions: true,
  },
});

export function getAst(code: string) {
  try {
    return parserEngine.parseEval(stripPHPTag(code));
  } catch (e) {
    return undefined;
  }

  function stripPHPTag(code: string): string {
    return code.replace('<?php', '').replace('?>', '');
  }
}

export function getClassesNodes(nodes: Node[]): Class[] {
  const classNodes: Class[] = [];

  for (const node of nodes) {
    if (node.kind === 'namespace') {
      const namespaceNode = node as Namespace;
      return getClassesNodes(namespaceNode.children);
    }

    if (node.kind === 'class') {
      const classNode = node as Class;
      classNodes.push(classNode);
    }
  }

  return classNodes;
}

export function getClassNameIdentifer(classNode: Class) {
  if (classNode.kind !== 'class') return;
  return classNode.name as Identifier;
}

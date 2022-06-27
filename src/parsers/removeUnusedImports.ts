import { Engine, Namespace, Node, UseGroup, UseItem } from 'php-parser';

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

export function getUseNodes(nodes: Node[], useGroupNodes: UseGroup[] = []) {
  for (const node of nodes) {
    if (node.kind === 'namespace') {
      const namespaceNode = node as Namespace;
      getUseNodes(namespaceNode.children, useGroupNodes);
    }

    if (node.kind === 'usegroup') {
      const useGroupNode = node as UseGroup;
      useGroupNodes.push(useGroupNode);
    }
  }

  return useGroupNodes;
}

export function flattenUseItems(items: UseItem[]) {
  //const flatItems: { name: string; aliasName: string | null }[] = [];
  const flatItems: {
    name: string;
    aliasName: string | null;
    locStartLine: number;
    locStartColumn: number;
    locEndLine: number;
    locEndColumn: number;
  }[] = [];

  for (const item of items) {
    const name = item.name;
    let aliasName: string | null;
    let locStartLine: number;
    let locStartColumn: number;
    let locEndLine: number;
    let locEndColumn: number;

    if (item.alias) {
      aliasName = item.alias.name;
    } else {
      aliasName = null;
    }

    if (item.loc) {
      locStartLine = item.loc.start.line;
      locStartColumn = item.loc.start.column;
      locEndLine = item.loc.end.line;
      locEndColumn = item.loc.end.column;
    } else {
      locStartLine = 0;
      locStartColumn = 0;
      locEndLine = 0;
      locEndColumn = 0;
    }

    const flatItem = {
      name,
      aliasName,
      locStartLine,
      locStartColumn,
      locEndLine,
      locEndColumn,
    };

    flatItems.push(flatItem);
  }

  return flatItems;
}

import { Engine, Node } from 'php-parser';

export function getAstByEvalCode(code: string) {
  try {
    const parserEngine = getParserEngine();
    return parserEngine.parseEval(stripPHPTag(code));
  } catch (e) {
    return undefined;
  }
}

export function getAstByParseCode(code: string) {
  try {
    const parserEngine = getParserEngine();
    return parserEngine.parseCode(code, '');
  } catch (e) {
    return undefined;
  }
}

export function stripPHPTag(code: string) {
  return code.replace('<?php', '').replace('?>', '').replace('<?=', '');
}

function getParserEngine() {
  const parserEngine = new Engine({
    parser: {
      debug: false,
      extractDoc: true,
      php7: true,
      locations: true,
      suppressErrors: true,
    },
    ast: {
      all_tokens: false,
      withPositions: true,
    },
  });

  return parserEngine;
}

function isNode(value: any): boolean {
  return typeof value === 'object' && value !== null && typeof value.kind === 'string';
}

function collectChildNodes(node: Node) {
  const childNodes: Node[] = [];

  for (const key of Object.keys(node)) {
    const property = node[key];

    if (Array.isArray(property)) {
      for (const propertyElement of property) {
        if (isNode(propertyElement)) {
          childNodes.push(propertyElement);
        }
      }
    } else if (isNode(property)) {
      childNodes.push(property);
    }
  }

  return childNodes;
}

export function walk(callback: (node: Node, parent: Node | undefined) => void, node: Node, parent?: Node) {
  const children = collectChildNodes(node);
  for (const child of children) {
    walk(callback, child, node);
  }
  callback(node, parent);
}

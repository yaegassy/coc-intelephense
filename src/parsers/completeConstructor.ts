import {
  Class,
  Comment,
  CommentBlock,
  Engine,
  Identifier,
  Method,
  Name,
  Namespace,
  Node,
  Property,
  PropertyStatement,
  TypeReference,
} from 'php-parser';

const parserEngine = new Engine({
  parser: {
    extractDoc: false,
    php7: true,
    locations: true,
    suppressErrors: true,
  },
  ast: {
    all_tokens: true,
    withPositions: true,
  },
});

type PropertyType = {
  propertyName: string;
  propertyStartLine: number;
  propertyEndLine: number;
  propertyNullable: boolean;
  propertyType: string | string[] | null;
  propertyDocVarType: string | null;
};

type ConstructorPropertyFlagsType = {
  // 0 | 1
  propertyFlags: number;
};

type PropertyWithConstructorPromotionFlagsType = PropertyType & ConstructorPropertyFlagsType;

type ClassDetailType = {
  className: string;
  classStartLine: number;
  classEndLine: number;
};

type PropertyWithClassDetailType = PropertyType & ClassDetailType;

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

export function isClassRegion(code: string, startLine: number, endLine: number) {
  let flag = false;

  const ast = getAst(code);
  if (!ast) return flag;

  const classNode = getClassesNodes(ast.children);

  classNode.forEach((c) => {
    if (c.loc && c.loc.start.line <= startLine && c.loc.end.line >= endLine) {
      flag = true;
    }
  });

  return flag;
}

// TODO: Adding Test and Simplifying
export function matchVarType(docLine: string, variable?: string) {
  let varType: string | null = null;

  const patterns = [
    // @var array<int, string> $sample ...
    `@var\\s+([\\w|<,\\s\\\\]+[>]+)\\s+(\\\$${variable})\\s+.*$`,
    // @var int $sample ...
    `@var\\s+(\\S+)\\s+(\\\$${variable})\\s+.*$`,
    // @var array<int, string> $sample
    `@var\\s+([\\w|<,\\s\\\\]+[>]+)\\s+(\\\$${variable})$`,
    // @var int $sample
    `@var\\s+(\\S+)\\s+(\\\$${variable})$`,
    // @var array<int, string>
    `@var\\s+([\\w|<,\\s\\\\]+[>]+)$`,
    // @var int $sample
    `@var\\s+(\\S+)$`,
  ];

  if (docLine.includes('@var')) {
    for (const p of patterns) {
      const reg = new RegExp(p);
      const m = reg.exec(docLine);
      if (m) {
        varType = m[1];
        break;
      }
    }
  }

  return varType;
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

export function getPropertiesWithClassDetail(nodes: Node[]) {
  const propertiesWithClassDetail: PropertyWithClassDetailType[] = [];

  const classNodes = getClassesNodes(nodes);
  classNodes.forEach((classNode) => {
    const identiferNode = classNode.name as Identifier;
    const className = identiferNode.name;
    const classStartLine = classNode.loc ? classNode.loc.start.line : 0;
    const classEndLine = classNode.loc ? classNode.loc.end.line : 0;

    classNode.body.forEach((declaration) => {
      const propertiesDetails = getProperties(declaration);
      if (propertiesDetails) {
        propertiesDetails.forEach((p) => {
          propertiesWithClassDetail.push({
            className: className,
            classStartLine: classStartLine,
            classEndLine: classEndLine,
            ...p,
          });
        });
      }
    });
  });

  return propertiesWithClassDetail;
}

function getProperties(node: Node) {
  const propertiesDetail: PropertyType[] = [];
  if (node.kind !== 'propertystatement') return propertiesDetail;

  const propertyStatementNode = node as PropertyStatement;
  const parentNode = node;

  propertyStatementNode.properties.forEach((node) => {
    if (node.kind === 'property') {
      const propertyNode = node as Property;
      const identifiierNode = propertyNode.name as unknown as Identifier;

      const name = identifiierNode.name;
      const nullable = propertyNode.nullable;
      const startLine = propertyNode.loc ? propertyNode.loc.start.line : 0;
      const endLine = propertyNode.loc ? propertyNode.loc.end.line : 0;
      let type: string | string[] | null = null;
      let docVarType: string | null = null;
      const comments: string[] = [];

      if (propertyNode.type) {
        if (Array.isArray(propertyNode.type)) {
          // multiple array type exist?, noop...
        } else {
          if (propertyNode.type.kind === 'typereference') {
            const typereferenceNode = propertyNode.type as TypeReference;
            type = typereferenceNode.name;
          } else if (propertyNode.type.kind === 'name') {
            const nameNode = propertyNode.type as Name;
            type = nameNode.name;
          } else if (propertyNode.type.kind === 'uniontype') {
            if ('types' in propertyNode.type) {
              const uniontypeTypesNode = propertyNode.type['types'] as TypeReference[];
              const items: string[] = [];
              uniontypeTypesNode.forEach((node) => {
                items.push(node.name);
              });
              type = items;
            }
          }
        }
      }

      if (parentNode.leadingComments) {
        const leadingComments = parentNode['leadingComments'] as CommentBlock[];
        leadingComments.forEach((c) => {
          if (c.kind === 'commentblock') {
            const commentNode = c as Comment;
            comments.push(commentNode.value);
          }
        });

        comments.forEach((comment) => {
          const splitComments = comment.split('\n');
          splitComments.forEach((c) => {
            if (!docVarType) {
              docVarType = matchVarType(c, name);
            }
          });
        });
      }

      const propertyDetail: PropertyType = {
        propertyName: name,
        propertyNullable: nullable,
        propertyType: type,
        propertyStartLine: startLine,
        propertyEndLine: endLine,
        propertyDocVarType: docVarType,
      };

      propertiesDetail.push(propertyDetail);
    }
  });

  return propertiesDetail;
}

export function getConstructorMethodNodeFromClassNode(classNode: Class) {
  for (const declaration of classNode.body) {
    if (declaration.kind === 'method') {
      const methodNode = declaration as Method;
      const identifer = methodNode.name as Identifier;
      if (identifer.name === '__construct') {
        return methodNode;
      }
    }
  }
}

export function getConstructorPropertiesFromMethodNode(methodNode: Method) {
  const propertiesDetails: PropertyWithConstructorPromotionFlagsType[] = [];

  if (methodNode.kind !== 'method') return [];

  const identifer = methodNode.name as Identifier;
  if (identifer.name !== '__construct') return;

  methodNode.arguments.forEach((parameter) => {
    if ('flags' in parameter) {
      const identifiierNode = parameter.name as unknown as Identifier;

      const name = identifiierNode.name;
      const nullable = parameter.nullable;
      const startLine = parameter.loc ? parameter.loc.start.line : 0;
      const endLine = parameter.loc ? parameter.loc.end.line : 0;
      let type: string | string[] | null = null;

      if (parameter.type) {
        if (Array.isArray(parameter.type)) {
          // multiple array type exist?, noop...
        } else {
          if (parameter.type.kind === 'typereference') {
            const typereferenceNode = parameter.type as TypeReference;
            type = typereferenceNode.name;
          } else if (parameter.type.kind === 'name') {
            const nameNode = parameter.type as Name;
            type = nameNode.name;
          } else if (parameter.type.kind === 'uniontype') {
            if ('types' in parameter.type) {
              const uniontypeTypesNode = parameter.type['types'] as TypeReference[];
              const items: string[] = [];
              uniontypeTypesNode.forEach((node) => {
                items.push(node.name);
              });
              type = items;
            }
          }
        }
      }

      const propertyDetail: PropertyWithConstructorPromotionFlagsType = {
        propertyName: name,
        propertyNullable: nullable,
        propertyStartLine: startLine,
        propertyEndLine: endLine,
        propertyType: type,
        propertyFlags: parameter['flags'],
        propertyDocVarType: null,
      };

      propertiesDetails.push(propertyDetail);
    }
  });

  return propertiesDetails;
}

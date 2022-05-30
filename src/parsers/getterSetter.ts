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

type MethodType = {
  name: string;
  startLine: number;
  endLine: number;
  comments: string[];
};

type PropertyType = {
  propertyName: string;
  propertyStartLine: number;
  propertyEndLine: number;
  propertyNullable: boolean;
  propertyType: string | string[] | null;
  propertyDocVarType: string | null;
};

type ClassInfoType = {
  className: string;
  classStartLine: number;
  classEndLine: number;
};

type PropertyWithClassInfoType = PropertyType & ClassInfoType;

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

function matchVarType(docLine: string, variable?: string) {
  let varType: string | null = null;

  const patterns = [
    `@var\\s+(\\S+)\\s+(\\\$${variable})\\s+(.*)$`,
    `@var\\s+(\\S+)\\s+(\\\$${variable})$`,
    `@var\\s+(\\S+)$`,
  ];

  if (docLine.includes('@var')) {
    patterns.forEach((p) => {
      const reg = new RegExp(p);
      const m = reg.exec(docLine);
      if (m) {
        varType = m[1];
      }
    });
  }

  return varType;
}

export function getMethods(nodes: Node[]) {
  const methods: MethodType[] = [];

  function wrapper(node: Node) {
    if (node.kind === 'class') {
      const classNode = node as Class;
      classNode.body.forEach((node) => {
        const methodData = getMethod(node);
        if (methodData) {
          methods.push(methodData);
        }
      });
    }
  }

  nodes.forEach((node) => {
    if (node.kind === 'namespace') {
      const namespaceNode = node as Namespace;
      namespaceNode.children.forEach((node) => {
        wrapper(node);
      });
    }
  });

  nodes.forEach((node) => {
    wrapper(node);
  });

  return methods;
}

function getMethod(node: Node) {
  if (node.kind !== 'method') return;

  const methodNode = node as Method;
  if (!methodNode.loc) return;

  const identifer = methodNode.name as Identifier;

  const name = identifer.name;
  const startLine = methodNode.loc.start.line;
  const endLine = methodNode.loc.end.line;
  const comments: string[] = [];
  if (methodNode.leadingComments) {
    const leadingComments = methodNode.leadingComments;
    leadingComments.forEach((comment) => {
      comments.push(comment.value);
    });
  }
  const methodData: MethodType = {
    name,
    startLine,
    endLine,
    comments,
  };
  return methodData;
}

export function getClassesNodes(node: Node[]) {
  const classNodes: Class[] = [];

  function wrapper(node: Node) {
    if (node.kind === 'class') {
      const classNode = node as Class;
      classNodes.push(classNode);
    }
  }

  node.forEach((node) => {
    if (node.kind === 'namespace') {
      const namespaceNode = node as Namespace;
      namespaceNode.children.forEach((node) => {
        wrapper(node);
      });
    }
  });

  node.forEach((node) => {
    wrapper(node);
  });

  return classNodes;
}

export function getPropertiesWithClassInfo(nodes: Node[]) {
  const propertiesWithClassInfo: PropertyWithClassInfoType[] = [];

  const classNodes = getClassesNodes(nodes);
  classNodes.forEach((classNode) => {
    const identiferNode = classNode.name as Identifier;
    const className = identiferNode.name;
    const classStartLine = classNode.loc ? classNode.loc.start.line : 0;
    const classEndLine = classNode.loc ? classNode.loc.end.line : 0;

    classNode.body.forEach((declaration) => {
      const propertiesData = getProperties(declaration);
      if (propertiesData) {
        propertiesData.forEach((p) => {
          propertiesWithClassInfo.push({
            className: className,
            classStartLine: classStartLine,
            classEndLine: classEndLine,
            ...p,
          });
        });
      }
    });
  });

  return propertiesWithClassInfo;
}

function getProperties(node: Node) {
  const propertiesData: PropertyType[] = [];
  if (node.kind !== 'propertystatement') return propertiesData;

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

      const propertyData: PropertyType = {
        propertyName: name,
        propertyNullable: nullable,
        propertyType: type,
        propertyStartLine: startLine,
        propertyEndLine: endLine,
        propertyDocVarType: docVarType,
      };

      propertiesData.push(propertyData);
    }
  });

  return propertiesData;
}

export function getConstructorPropertiesWithClassInfo(nodes: Node[]) {
  const propertiesWithClassInfo: PropertyWithClassInfoType[] = [];

  function wrapper(node: Node) {
    if (node.kind === 'class') {
      const classNode = node as Class;
      const identiferNode = classNode.name as Identifier;
      const className = identiferNode.name;
      const classStartLine = classNode.loc ? classNode.loc.start.line : 0;
      const classEndLine = classNode.loc ? classNode.loc.end.line : 0;
      const propertiesData = getConstructorProperties(classNode);

      propertiesData.forEach((p) => {
        propertiesWithClassInfo.push({
          ...p,
          className: className,
          classStartLine: classStartLine,
          classEndLine: classEndLine,
        });
      });
    }
  }

  nodes.forEach((node) => {
    if (node.kind === 'namespace') {
      const namespaceNode = node as Namespace;
      namespaceNode.children.forEach((node) => {
        wrapper(node);
      });
    }
  });

  nodes.forEach((node) => {
    wrapper(node);
  });

  return propertiesWithClassInfo;
}

function getConstructorProperties(classNode: Class) {
  const propertiesData: PropertyType[] = [];

  classNode.body.forEach((declaration) => {
    if (declaration.kind === 'method') {
      const methodNode = declaration as Method;
      const identifer = methodNode.name as Identifier;
      if (identifer.name === '__construct') {
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

            const propertyData: PropertyType = {
              propertyName: name,
              propertyNullable: nullable,
              propertyStartLine: startLine,
              propertyEndLine: endLine,
              propertyType: type,
              propertyDocVarType: null,
            };

            propertiesData.push(propertyData);
          }
        });
      }
    }
  });

  return propertiesData;
}

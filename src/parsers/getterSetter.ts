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

import * as phpDocParser from '../parsers/phpDoc';

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

export function getMethods(nodes: Node[]) {
  const methods: MethodType[] = [];

  function wrapper(node: Node) {
    if (node.kind === 'class') {
      const classNode = node as Class;
      classNode.body.forEach((node) => {
        const methodDetail = getMethod(node);
        if (methodDetail) {
          methods.push(methodDetail);
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
  const methodDetail: MethodType = {
    name,
    startLine,
    endLine,
    comments,
  };
  return methodDetail;
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
  const propertiesDetails: PropertyType[] = [];
  if (node.kind !== 'propertystatement') return propertiesDetails;

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
              const matchTypeDetail = phpDocParser.matchTypeDetailFromVarTag(c, name);
              if (matchTypeDetail) {
                docVarType = matchTypeDetail?.value;
              }
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

      propertiesDetails.push(propertyDetail);
    }
  });

  return propertiesDetails;
}

export function getConstructorPropertiesWithClassDetail(nodes: Node[]) {
  const propertiesWithClassDetail: PropertyWithClassDetailType[] = [];

  function wrapper(node: Node) {
    if (node.kind === 'class') {
      const classNode = node as Class;
      const identiferNode = classNode.name as Identifier;
      const className = identiferNode.name;
      const classStartLine = classNode.loc ? classNode.loc.start.line : 0;
      const classEndLine = classNode.loc ? classNode.loc.end.line : 0;
      const propertiesDetail = getConstructorProperties(classNode);

      propertiesDetail.forEach((p) => {
        propertiesWithClassDetail.push({
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

  return propertiesWithClassDetail;
}

function getConstructorProperties(classNode: Class) {
  const propertiesDetails: PropertyType[] = [];

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

            const propertyDetail: PropertyType = {
              propertyName: name,
              propertyNullable: nullable,
              propertyStartLine: startLine,
              propertyEndLine: endLine,
              propertyType: type,
              propertyDocVarType: null,
            };

            propertiesDetails.push(propertyDetail);
          }
        });
      }
    }
  });

  return propertiesDetails;
}

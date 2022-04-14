import { LinesTextDocument, Position } from 'coc.nvim';
import { Comment, Engine, Node } from 'php-parser';
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

export async function getMethods(document: LinesTextDocument) {
  const code = document.getText();

  const methods: MethodType[] = [];

  try {
    const ast = parserEngine.parseEval(code.replace('<?php', '').replace('?>', ''));

    ast.children.forEach((node) => {
      if ('children' in node) {
        const subNode = node['children'] as Node[];
        subNode.forEach((node) => {
          if (node.kind === 'class') {
            if ('body' in node) {
              const subNode = node['body'] as Node[];
              subNode.forEach((node) => {
                const methodData = getMethodDataByClassBodyAst(node);
                if (methodData) {
                  methods.push(methodData);
                }
              });
            }
          }
        });
      } else if (node.kind === 'class') {
        if ('body' in node) {
          const subNode = node['body'] as Node[];
          subNode.forEach((node) => {
            const methodData = getMethodDataByClassBodyAst(node);
            if (methodData) {
              methods.push(methodData);
            }
          });
        }
      }
    });
  } catch (e) {
    // noop
  }

  return methods;
}

function getMethodDataByClassBodyAst(node: Node) {
  if (node.kind === 'method') {
    if ('loc' in node) {
      const name = node['name']['name'] as string;
      const startLine = node['loc'] ? node['loc']['start']['line'] : 0;
      const endLine = node['loc'] ? node['loc']['end']['line'] : 0;
      const comments: string[] = [];
      if ('leadingComments' in node) {
        const leadingComments = node['leadingComments'] as Comment[];
        leadingComments.forEach((n) => {
          comments.push(n.value);
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
  }
}

export function getTestMethods(methods: MethodType[]) {
  const testMethods: MethodType[] = [];

  methods.forEach((m) => {
    let exists = false;
    if (m.name) {
      if (m.name.startsWith('test')) {
        exists = true;
      }
    }

    if (m.comments) {
      m.comments.forEach((c) => {
        if (c.includes('@test')) {
          exists = true;
        }
      });
    }

    if (exists) {
      testMethods.push(m);
    }
  });

  return testMethods;
}

export function getTestName(methods: MethodType[], position: Position) {
  let testName = '';

  methods.forEach((m) => {
    if (position.line + 1 >= m.startLine && position.line + 1 <= m.endLine) {
      const name = m.name;

      let isTestAnotation = false;
      if (m.comments) {
        m.comments.forEach((c) => {
          if (c.includes('@test')) {
            isTestAnotation = true;
          }
        });
      }

      if (name.startsWith('test') || isTestAnotation) {
        testName = name;
      }
    }
  });

  return testName;
}

import { Call, Engine, New } from 'php-parser';

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

interface ParameterPosition {
  functionCall?: string;
  namedValue?: string;
  expression: {
    start: {
      line: number;
      character: number;
    };
    end: {
      line: number;
      character: number;
    };
  };
  key: number;
  start: {
    line: number;
    character: number;
  };
  end: {
    line: number;
    character: number;
  };
}

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

export function crawlAstToCallAndNewNode(ast: any, functionCalls: any[] = []): any[] {
  const canAcceptArguments = ast.kind && (ast.kind === 'call' || ast.kind === 'new');
  const hasArguments = ast.arguments && ast.arguments.length > 0;

  if (canAcceptArguments && hasArguments) {
    functionCalls.push(ast);
  }

  for (const [, value] of Object.entries(ast)) {
    if (value instanceof Object) {
      functionCalls = crawlAstToCallAndNewNode(value, functionCalls);
    }
  }

  return functionCalls;
}

export function getParametersFromFuncs(expression: Call | New) {
  const parameters: ParameterPosition[] = [];

  if (!expression.arguments) return;

  expression.arguments.forEach((argument: any, key: number) => {
    if (!expression.what || (!expression.what['offset'] && !expression.what.loc)) {
      return;
    }

    const expressionLoc = expression.what['offset']
      ? expression.what['offset']['loc']['start']
      : expression.what.loc?.end;

    const parameterPosition: ParameterPosition = {
      namedValue: undefined,
      expression: {
        start: {
          line: expressionLoc.line,
          character: expressionLoc.column,
        },
        end: {
          line: -1,
          character: -1,
        },
      },
      key: key,
      start: {
        line: argument.loc.start.line,
        character: argument.loc.start.column,
      },
      end: {
        line: argument.loc.end.line,
        character: argument.loc.end.column,
      },
    };
    parameters.push(parameterPosition);
  });

  return parameters;
}

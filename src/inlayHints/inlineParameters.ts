import {
  CancellationToken,
  DocumentSelector,
  ExtensionContext,
  Hover,
  InlayHint,
  InlayHintLabelPart,
  InlayHintsProvider,
  LanguageClient,
  languages,
  LinesTextDocument,
  MarkupContent,
  Position,
  Range,
  TextDocument,
  workspace,
} from 'coc.nvim';

import * as inlineParametersParser from '../parsers/inlineParameters';

interface ParameterDetails {
  name: string;
  definition: string;
}

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

export async function register(context: ExtensionContext, client: LanguageClient) {
  if (!workspace.getConfiguration('intelephense').get<boolean>('client.disableInlayHints', true)) {
    await client.onReady();

    const documentSelector: DocumentSelector = [{ language: 'php', scheme: 'file' }];

    const disposable = languages.registerInlayHintsProvider(
      documentSelector,
      new InlineParametersInlayHintsProvider(context, client),
    );
    context.subscriptions.push(disposable);

    return disposable;
  }
}

class InlineParametersInlayHintsProvider implements InlayHintsProvider {
  context: ExtensionContext;
  client: LanguageClient;

  constructor(context: ExtensionContext, client: LanguageClient) {
    this.context = context;
    this.client = client;
  }

  async provideInlayHints(
    document: LinesTextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    range: Range,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: CancellationToken,
  ) {
    const inlayHints: InlayHint[] = [];

    const code = document.getText();
    const ast = inlineParametersParser.getAst(code);
    if (!ast) return [];

    const functionParmeters: ParameterPosition[][] = [];
    const functionCalls = inlineParametersParser.crawlAstToCallAndNewNode(ast.children);

    functionCalls.forEach((expression) => {
      const functionParmeter = inlineParametersParser.getParametersFromFuncs(expression);
      if (functionParmeter) {
        functionParmeters.push(functionParmeter);
      }
    });

    for (const languageParameters of functionParmeters) {
      if (languageParameters === undefined) continue;
      let parameters: ParameterDetails[];

      try {
        parameters = await this.getParameterNames(document, languageParameters);
      } catch (error) {
        continue;
      }

      for (let index = 0; index < languageParameters.length; index++) {
        try {
          const parameter = languageParameters[index];
          let parameterName = parameters[index].name;
          const parameterDefinition = parameters[index].definition;

          if (!parameterName) continue;

          const position = Position.create(parameter.start.line - 1, parameter.start.character);

          parameterName = parameterName + ':';

          const inlayHintLabelPart: InlayHintLabelPart[] = [
            {
              value: parameterName,
            },
          ];

          const tooltipValue: MarkupContent = {
            kind: 'markdown',
            value: parameterDefinition,
          };

          const inlayHint: InlayHint = {
            label: inlayHintLabelPart,
            position: position,
            tooltip: tooltipValue,
            paddingLeft: true,
            paddingRight: true,
          };

          inlayHints.push(inlayHint);
        } catch (error) {
          continue;
        }
      }
    }

    return inlayHints;
  }

  async getParameterNames(
    document: TextDocument,
    languageParameters: ParameterPosition[],
  ): Promise<ParameterDetails[]> {
    const firstParameter = languageParameters[0];
    let parameters: any[] = [];

    const position = Position.create(
      firstParameter.expression.start.line - 1,
      firstParameter.expression.start.character,
    );

    const params = {
      textDocument: { uri: document.uri },
      position,
    };

    const description = await this.client.sendRequest<Hover>('textDocument/hover', params);
    const definition = description.contents as MarkupContent;

    if (description) {
      try {
        const regex = /(?<=@param)[^.]*?((?:\.{3})?\$[\w]+).*?[\r\n|\n—] ?(.*?)[\r\n|\n](?:_@param|_@return)/gs;
        if (!definition.value.includes('```')) return parameters;
        // **MEMO**:
        // If there is more than one result of hover, they will be merged documents.
        // Therefore, try to extract only one.
        // Also, if the "coc.preferences.enableMarkdown"" setting is "false", no match will be made
        const splitDefinition = definition.value.split('__');
        const firstDefinition = [splitDefinition[1], splitDefinition[2]].join('__');
        parameters = definition ? [...firstDefinition.matchAll(regex)] : [];
      } catch (error) {
        // ...noop
      }
    }

    if (!parameters) return Promise.reject();

    const parameterDetails: ParameterDetails[] = parameters.map((parameterInformation: any): ParameterDetails => {
      const name = parameterInformation[1];
      const definition = parameterInformation[2];

      const parameter: ParameterDetails = {
        name: this.getConfigShowDollarSign() ? name : name.replace('$', ''),
        definition: definition,
      };

      return parameter;
    });

    return parameterDetails;
  }

  private getConfigShowDollarSign() {
    return workspace.getConfiguration('intelephense').get<boolean>('inlineParameters.showDollarSign', false);
  }
}

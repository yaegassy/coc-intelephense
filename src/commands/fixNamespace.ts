import { commands, ExtensionContext, window, workspace, Uri, TextEdit, Range, Position } from 'coc.nvim';
import * as fixNamespaceParser from '../parsers/fixNamespace';

import fs from 'fs';
import path from 'path';

type ComposerJsonContentType = {
  autoload: {
    ['psr-4']: {
      [key: string]: string;
    };
  };
  'autoload-dev': {
    ['psr-4']: {
      [key: string]: string;
    };
  };
};

type NamespaceType = { [key: string]: string };

export function activate(context: ExtensionContext) {
  context.subscriptions.push(commands.registerCommand('intelephense.fixNamespace', runFixNamespace()));
}

export function runFixNamespace() {
  return async () => {
    const { document } = await workspace.getCurrentState();

    const composerJsonPath = path.join(workspace.root, 'composer.json');
    let composerJsonContent: ComposerJsonContentType | null = null;
    try {
      composerJsonContent = JSON.parse(fs.readFileSync(composerJsonPath, 'utf8'));
    } catch (error) {
      composerJsonContent = null;
    }

    if (!composerJsonContent) {
      window.showErrorMessage(`composer.json could not be loaded`);
      return;
    }

    const projectNamespaces = getProjectNamespacesFromComposerJson(composerJsonContent);
    const workspaceUriPath = Uri.parse(workspace.root).toString();
    const fileUriPath = document.uri;
    const relativeFilePath = fileUriPath.replace(workspaceUriPath + '/', '');
    const newNamespace = getFileNamespace(projectNamespaces, relativeFilePath);

    // ---- edit namespace ----

    const ast = fixNamespaceParser.getAst(document.getText());
    if (!ast) return;

    const currentFileNsNode = fixNamespaceParser.getNamespaceNode(ast.children);
    if (!currentFileNsNode) {
      window.showErrorMessage('namespace not found in target file');
      return;
    }

    const currentFileNsLoc = fixNamespaceParser.getNamespaceLocation(currentFileNsNode);
    if (!currentFileNsLoc) {
      window.showErrorMessage('Failed to parse namespace in target file');
      return;
    }

    const doc = await workspace.openTextDocument(Uri.parse(document.uri).fsPath);

    // **WARNING**:
    // The end of the namespace location is the end of all nodes in the namespace.
    // Not the end of the line declared in namespace
    const declarationContent = doc.getline(currentFileNsLoc.start.line - 1);
    const declarationColumn = declarationContent.length;

    const edits = [
      TextEdit.replace(
        Range.create(
          Position.create(currentFileNsLoc.start.line - 1, currentFileNsLoc.start.column),
          Position.create(currentFileNsLoc.start.line - 1, declarationColumn)
        ),
        `namespace ${newNamespace};`
      ),
    ];

    await doc.applyEdits(edits);
  };
}

function getProjectNamespacesFromComposerJson(composerJsonContent: ComposerJsonContentType) {
  const projectNamespaces: { [key: string]: string }[] = [];

  if ('psr-4' in composerJsonContent.autoload) {
    for (const [k, v] of Object.entries(composerJsonContent.autoload['psr-4'])) {
      projectNamespaces.push({
        [k]: v,
      });
    }
  }

  if ('psr-4' in composerJsonContent['autoload-dev']) {
    for (const [k, v] of Object.entries(composerJsonContent['autoload-dev']['psr-4'])) {
      projectNamespaces.push({
        [k]: v,
      });
    }
  }

  return projectNamespaces;
}

function getFileNamespace(namespaces: NamespaceType[], relativeFilePath: string) {
  const fileName = relativeFilePath.split('/').slice(-1)[0];

  for (const namespace of namespaces) {
    for (const k of Object.keys(namespace)) {
      if (relativeFilePath.startsWith(namespace[k])) {
        const fileNamespace = relativeFilePath
          .replace(namespace[k], k)
          .replace(/\//g, '\\')
          .replace(fileName, '')
          .replace(/\\$/, '');

        return fileNamespace;
      }
    }
  }
}

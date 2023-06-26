import { commands, ExtensionContext, Terminal, Uri, window, workspace } from 'coc.nvim';

import path from 'path';
import fs from 'fs';
import * as pestParser from '../parsers/pest';

let terminal: Terminal | undefined;

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('intelephense.pest.projectTest', pestProjectTestCommand()),
    commands.registerCommand('intelephense.pest.fileTest', pestFileTestCommand()),
    commands.registerCommand('intelephense.pest.singleTest', pestSingleTestCommand())
  );
}

function getPestPath() {
  let cmdPath = '';
  const pestPath = workspace.getConfiguration('intelephense').get<string>('pest.path');
  const vendorPestPath = path.join(workspace.root, 'vendor', 'bin', 'pest');

  if (pestPath && fs.existsSync(pestPath)) {
    cmdPath = pestPath;
  } else if (fs.existsSync(vendorPestPath)) {
    cmdPath = path.join(workspace.root, 'vendor', 'bin', 'pest');
  }

  return cmdPath;
}

function getSailPath() {
  let cmdPath = '';
  const sailPath = workspace.getConfiguration('intelephense').get<string>('sail.path');
  const vendorSailPath = path.join(workspace.root, 'vendor', 'bin', 'sail');

  if (sailPath && fs.existsSync(sailPath)) {
    cmdPath = sailPath;
  } else if (fs.existsSync(vendorSailPath)) {
    cmdPath = path.join(workspace.root, 'vendor', 'bin', 'sail');
  }

  return cmdPath;
}

async function runPest(filePath?: string, testName?: string) {
  const pestBin = getPestPath();
  const pestDoNotCacheResult = workspace.getConfiguration('intelephense').get<boolean>('pest.doNotCacheResult', true);

  const sailBin = getSailPath();
  const useSail = workspace.getConfiguration('intelephense').get<boolean>('pest.useSail', false);

  if (pestBin) {
    if (terminal) {
      if (terminal.bufnr) {
        await workspace.nvim.command(`bd! ${terminal.bufnr}`);
      }
      terminal.dispose();
      terminal = undefined;
    }

    terminal = await window.createTerminal({ name: 'pest', cwd: workspace.root });

    const args: string[] = [];
    if (pestDoNotCacheResult) args.push('--do-not-cache-result');

    if (testName && filePath) {
      args.push('--filter');
      args.push(`'::${testName}$'`);
      if (useSail) {
        const relativeFilePath = filePath.replace(workspace.root, '').replace(/^\//, '');
        args.push(`${relativeFilePath}`);
        terminal.sendText(`${sailBin} pest ${args.join(' ')}`);
      } else {
        args.push(`${filePath}`);
        terminal.sendText(`${pestBin} ${args.join(' ')}`);
      }
    } else if (filePath) {
      if (useSail) {
        const relativeFilePath = filePath.replace(workspace.root, '').replace(/^\//, '');
        args.push(`${relativeFilePath}`);
        terminal.sendText(`${sailBin} pest ${args.join(' ')}`);
      } else {
        args.push(`${filePath}`);
        terminal.sendText(`${sailBin} pest ${args.join(' ')}`);
      }
    } else {
      if (args.length > 0) {
        if (useSail) {
          terminal.sendText(`${sailBin} pest ${args.join(' ')}`);
        } else {
          terminal.sendText(`${pestBin} ${args.join(' ')}`);
        }
      } else {
        if (useSail) {
          terminal.sendText(`${sailBin} pest`);
        } else {
          terminal.sendText(`${pestBin}`);
        }
      }
    }

    const enableSplitRight = workspace.getConfiguration('intelephense').get('pest.enableSplitRight', false);

    if (enableSplitRight) terminal.hide();
    await workspace.nvim.command('stopinsert');
    if (enableSplitRight) {
      await workspace.nvim.command(`vert bel sb ${terminal.bufnr}`);
      await workspace.nvim.command(`wincmd p`);
    }
  } else {
    return window.showErrorMessage('pest not found!');
  }
}

export function pestProjectTestCommand() {
  return async () => {
    const { document } = await workspace.getCurrentState();
    const filePath = Uri.parse(document.uri).fsPath;

    if (document.languageId !== 'php' || !filePath.endsWith('Test.php')) {
      return window.showErrorMessage('This file is not a PHP test file!');
    }

    runPest();
  };
}

export function pestFileTestCommand() {
  return async () => {
    const { document } = await workspace.getCurrentState();
    const filePath = Uri.parse(document.uri).fsPath;

    if (document.languageId !== 'php' || !filePath.endsWith('Test.php')) {
      return window.showErrorMessage('This file is not a PHP test file!');
    }

    runPest(filePath);
  };
}

export function pestSingleTestCommand() {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    const filePath = Uri.parse(document.uri).fsPath;

    if (document.languageId !== 'php' || !filePath.endsWith('Test.php')) {
      return window.showErrorMessage('This file is not a PHP test file!');
    }

    const ast = pestParser.getAst(document.getText());
    if (!ast) return;

    let testName = '';
    const pestTestDetails = await pestParser.getPestTestDetail(ast.children);
    const pestTestName = pestParser.getTestNameFromPestTestDetails(pestTestDetails, position);
    if (pestTestName) {
      testName = pestTestName;
    } else {
      const methods = await pestParser.getMethods(ast.children);
      const methodTestName = pestParser.getTestName(methods, position);
      if (methodTestName) testName = methodTestName;
    }

    if (testName) {
      runPest(filePath, testName);
    } else {
      window.showErrorMessage(`Test not found`);
    }
  };
}

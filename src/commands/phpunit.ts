import { commands, ExtensionContext, Terminal, Uri, window, workspace } from 'coc.nvim';

import path from 'path';
import fs from 'fs';
import { getMethods, getTestName } from '../parser/unittest';

let terminal: Terminal | undefined;

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('intelephense.phpunit.projectTest', phpunitProjectTestCommand()),
    commands.registerCommand('intelephense.phpunit.fileTest', phpunitFileTestCommand()),
    commands.registerCommand('intelephense.phpunit.singleTest', phpunitSingleTestCommand())
  );
}

function getPhpUnitPath() {
  let cmdPath = '';
  const phpUnitPath = workspace.getConfiguration('intelephense').get<string>('phpunit.path');
  const vendorPhpUnitPath = path.join(workspace.root, 'vendor', 'bin', 'phpunit');

  if (phpUnitPath && fs.existsSync(phpUnitPath)) {
    cmdPath = phpUnitPath;
  } else if (fs.existsSync(vendorPhpUnitPath)) {
    cmdPath = path.join(workspace.root, 'vendor', 'bin', 'phpunit');
  }

  return cmdPath;
}

async function runPhpUnit(filePath?: string, testName?: string) {
  const phpunitBin = getPhpUnitPath();
  const phpunitColors = workspace.getConfiguration('intelephense').get<boolean>('phpunit.colors', false);
  const phpunitDebug = workspace.getConfiguration('intelephense').get<boolean>('phpunit.debug', false);

  if (phpunitBin) {
    if (terminal) {
      if (terminal.bufnr) {
        await workspace.nvim.command(`bd! ${terminal.bufnr}`);
      }
      terminal.dispose();
      terminal = undefined;
    }

    terminal = await window.createTerminal({ name: 'phpunit', cwd: workspace.root });

    const args: string[] = [];
    if (phpunitColors) args.push('--colors');
    if (phpunitDebug) args.push('--debug');

    if (testName && filePath) {
      args.push('--filter');
      args.push(`'::${testName}$'`);
      args.push(`${filePath}`);
      terminal.sendText(`${phpunitBin} ${args.join(' ')}`);
    } else if (filePath) {
      args.push(`${filePath}`);
      terminal.sendText(`${phpunitBin} ${args.join(' ')}`);
    } else {
      terminal.sendText(`${phpunitBin}`);
    }

    const enableSplitRight = workspace.getConfiguration('intelephense').get('phpunit.enableSplitRight', false);

    if (enableSplitRight) terminal.hide();
    await workspace.nvim.command('stopinsert');
    if (enableSplitRight) {
      await workspace.nvim.command(`vert bel sb ${terminal.bufnr}`);
      await workspace.nvim.command(`wincmd p`);
    }
  } else {
    return window.showErrorMessage('phpunit not found!');
  }
}

export function phpunitProjectTestCommand() {
  return async () => {
    const { document } = await workspace.getCurrentState();
    const filePath = Uri.parse(document.uri).fsPath;

    if (document.languageId !== 'php' || !filePath.endsWith('Test.php')) {
      return window.showErrorMessage('This file is not a PHP test file!');
    }

    runPhpUnit();
  };
}

export function phpunitFileTestCommand() {
  return async () => {
    const { document } = await workspace.getCurrentState();
    const filePath = Uri.parse(document.uri).fsPath;

    if (document.languageId !== 'php' || !filePath.endsWith('Test.php')) {
      return window.showErrorMessage('This file is not a PHP test file!');
    }

    runPhpUnit(filePath);
  };
}

export function phpunitSingleTestCommand() {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    const filePath = Uri.parse(document.uri).fsPath;

    if (document.languageId !== 'php' || !filePath.endsWith('Test.php')) {
      return window.showErrorMessage('This file is not a PHP test file!');
    }

    const methods = await getMethods(document);
    const testName = getTestName(methods, position);

    if (testName) {
      runPhpUnit(filePath, testName);
    } else {
      window.showErrorMessage(`Test not found`);
    }
  };
}

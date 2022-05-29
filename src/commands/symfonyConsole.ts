import {
  BasicList,
  commands,
  ExtensionContext,
  ListAction,
  ListContext,
  ListItem,
  Neovim,
  Terminal,
  window,
  workspace,
  listManager,
} from 'coc.nvim';

import cp from 'child_process';
import fs from 'fs';
import path from 'path';

let terminal: Terminal | undefined;

type SymfonyConsoleListJsonType = {
  application: {
    name: string;
    version: string;
  };
  commands: SymfonyConsoleListCommandsJsonType[];
  namespaces: {
    id: string;
    commands: string[];
  };
};

type SymfonyConsoleListCommandsJsonType = {
  name: string;
  description: string;
};

export function activate(context: ExtensionContext) {
  listManager.registerList(new SymfonyList(workspace.nvim));
  listManager.registerList(new ArtisanList(workspace.nvim));

  context.subscriptions.push(
    commands.registerCommand('intelephense.artisan.runCommand', () => {
      workspace.nvim.command(`CocList artisan`);
    })
  );
  context.subscriptions.push(
    commands.registerCommand('intelephense.symfony.runCommand', () => {
      workspace.nvim.command(`CocList symfony`);
    })
  );
}

async function getSymfonyConsolePath(entryPoint: string) {
  let cmdPath = '';
  const symfonyPath = path.join(workspace.root, entryPoint);
  if (fs.existsSync(symfonyPath)) {
    cmdPath = symfonyPath;
  }
  return cmdPath;
}

async function getSymfonyConsoleListCommandsJson(symfonyConsolePath: string) {
  return new Promise<string[]>((resolve) => {
    cp.exec(`${symfonyConsolePath} list --format json`, (err, stdout, stderr) => {
      if (err || stderr) resolve([]);

      if (stdout.length > 0) {
        try {
          const symfonyConsoleListJson = JSON.parse(stdout) as SymfonyConsoleListJsonType;
          const names = symfonyConsoleListJson.commands.map((c) => c.name);
          resolve(names);
        } catch (e) {
          resolve([]);
        }
      } else {
        resolve([]);
      }
    });
  });
}

async function runSymfonyConsole(commandName: string, entryPoint: string, baseCommandName: string) {
  const symfonyConsolePath = await getSymfonyConsolePath(entryPoint);
  if (!symfonyConsolePath) {
    return;
  }

  let input = '';
  const isInput = await window.showPrompt(`"${commandName}" | Add args & options?`);
  if (isInput) {
    input = await window.requestInput(`${commandName}`);
    if (!input) {
      const isExec = await window.showPrompt(`Input is empty, can I run it?`);
      if (!isExec) return;
    }
  }

  const args: string[] = [];
  args.push(symfonyConsolePath);
  args.push(commandName);
  if (input) args.push(input);

  if (terminal) {
    if (terminal.bufnr) {
      await workspace.nvim.command(`bd! ${terminal.bufnr}`);
    }
    terminal.dispose();
    terminal = undefined;
  }

  terminal = await window.createTerminal({ name: baseCommandName, cwd: workspace.root });
  terminal.sendText(`php ${args.join(' ')}`);

  const enableSplitRight = workspace.getConfiguration('intelephense').get(baseCommandName + '.enableSplitRight', false);

  if (enableSplitRight) terminal.hide();
  await workspace.nvim.command('stopinsert');
  if (enableSplitRight) {
    await workspace.nvim.command(`vert bel sb ${terminal.bufnr}`);
    await workspace.nvim.command(`wincmd p`);
  }
}

export abstract class SymfonyConsoleList extends BasicList {
  public name = 'symfony_console';
  public description = 'symfony_console for coc-intelephense';
  public readonly defaultAction = 'execute';
  public actions: ListAction[] = [];
  public entryPoint = 'path/to/sf_console';

  constructor(nvim: Neovim) {
    super(nvim);

    this.addAction('execute', (item: ListItem) => {
      runSymfonyConsole(item.label, this.entryPoint, this.name);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async loadItems(context: ListContext): Promise<ListItem[]> {
    const listItems: ListItem[] = [];
    const symfonyConsolePath = await getSymfonyConsolePath(this.entryPoint);
    if (!symfonyConsolePath) {
      return listItems;
    }
    const commands = await getSymfonyConsoleListCommandsJson(symfonyConsolePath);
    commands.forEach((c) => listItems.push({ label: c }));
    return listItems;
  }
}

export class ArtisanList extends SymfonyConsoleList {
  public readonly name = 'artisan';
  public readonly description = 'artisan for coc-intelephense';
  public readonly entryPoint = 'artisan';
}

export class SymfonyList extends SymfonyConsoleList {
  public readonly name = 'symfony';
  public readonly description = 'symfony for coc-intelephense';
  public readonly entryPoint = 'bin/console';
}

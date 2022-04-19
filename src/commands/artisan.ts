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

type ArtisanListJsonType = {
  application: {
    name: string;
    version: string;
  };
  commands: ArtisanListCommandsJsonType[];
  namespaces: {
    id: string;
    commands: string[];
  };
};

type ArtisanListCommandsJsonType = {
  name: string;
  description: string;
};

export function activate(context: ExtensionContext) {
  listManager.registerList(new ArtisanList(workspace.nvim));

  context.subscriptions.push(
    commands.registerCommand('intelephense.artisan.runCommand', () => {
      workspace.nvim.command(`CocList artisan`);
    })
  );
}

async function getArtisanPath() {
  let cmdPath = '';
  const artisanPath = path.join(workspace.root, 'artisan');
  if (fs.existsSync(artisanPath)) {
    cmdPath = artisanPath;
  }
  return cmdPath;
}

async function getArtisanListCommandsJson(artisanPath: string) {
  return new Promise<string[]>((resolve) => {
    cp.exec(`${artisanPath} list --format json`, (err, stdout, stderr) => {
      if (err || stderr) resolve([]);

      if (stdout.length > 0) {
        try {
          const artisanListJson = JSON.parse(stdout) as ArtisanListJsonType;
          const names = artisanListJson.commands.map((c) => c.name);
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

async function runArtisan(commandName: string) {
  const artisanPath = await getArtisanPath();
  if (!artisanPath) {
    window.showErrorMessage(`artisan command not found!`);
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
  args.push(artisanPath);
  args.push(commandName);
  if (input) args.push(input);

  if (terminal) {
    if (terminal.bufnr) {
      await workspace.nvim.command(`bd! ${terminal.bufnr}`);
    }
    terminal.dispose();
    terminal = undefined;
  }

  terminal = await window.createTerminal({ name: 'artisan', cwd: workspace.root });
  terminal.sendText(`php ${args.join(' ')}`);

  const enableSplitRight = workspace.getConfiguration('intelephense').get('artisan.enableSplitRight', false);

  if (enableSplitRight) terminal.hide();
  await workspace.nvim.command('stopinsert');
  if (enableSplitRight) {
    await workspace.nvim.command(`vert bel sb ${terminal.bufnr}`);
    await workspace.nvim.command(`wincmd p`);
  }
}

export class ArtisanList extends BasicList {
  public readonly name = 'artisan';
  public readonly description = 'artisan for coc-intelephense';
  public readonly defaultAction = 'execute';
  public actions: ListAction[] = [];

  constructor(nvim: Neovim) {
    super(nvim);

    this.addAction('execute', (item: ListItem) => {
      runArtisan(item.label);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async loadItems(context: ListContext): Promise<ListItem[]> {
    const listItems: ListItem[] = [];
    const artisanPath = await getArtisanPath();
    if (!artisanPath) {
      return listItems;
    }
    const commands = await getArtisanListCommandsJson(artisanPath);
    commands.forEach((c) => listItems.push({ label: c }));
    return listItems;
  }
}

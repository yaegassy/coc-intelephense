# coc-intelephense

> fork from a [vscode-intelephense](https://github.com/bmewburn/vscode-intelephense)

[coc.nvim](https://github.com/neoclide/coc.nvim) extension for [intelephense](https://intelephense.com/) (PHP language server)

## Install

```vim
:CocInstall @yaegassy/coc-intelephense
```

## Configuration options

- `intelephense.enable`: Enable coc-intelephense extension, default `true`
- `intelephense.path`: Absolute path to intelephense module. If there is no setting, the built-in module will be used. e.g. `/path/to/node_modules/intelephense`. default: ""
- `intelephense.disableCompletion`: Disable completion only, default: `false`
- `intelephense.progress.enable`: Enable progress window for indexing, If false, display with echo messages, default: `true` [DEMO](https://github.com/yaegassy/coc-intelephense/pull/2)

Other settings can be changed in the same way as "configuration" of [vscode-intelephense](https://github.com/bmewburn/vscode-intelephense).

## Enabling the PREMIUM feature

Prepare a `licence.txt` file containing the licence key and place it in a designated location.

```sh
$ node -e "console.log(os.homedir() + '/intelephense/licence.txt')"
/Users/username/intelephense/licence.txt
```

**[DEPRECATED]:** Or set `intelephense.licenceKey` in "coc-settings.json"

```jsonc
{
  // ...snip
  "intelephense.licenceKey": "LICENCEKEYSAMPLE",
  // ...snip
}
```

## Snippets support

It supports built-in php snippet for VSCode.

To use it, you need to install [coc-snippets](https://github.com/neoclide/coc-snippets).

## License

MIT

----

> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)

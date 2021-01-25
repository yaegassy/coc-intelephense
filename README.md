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

Other settings can be changed in the same way as "configuration" of [vscode-intelephense](https://github.com/bmewburn/vscode-intelephense).

## Enabling the PREMIUM feature

Prepare a `license.txt` file containing the license key and place it in a designated location.

```sh
$ node -e "console.log(os.homedir() + '/intelephense/licence.txt')"
/Users/username/intelephense/licence.txt
```

**[DEPRECATED]:** Or set `intelephense.licenceKey` in "coc-settings.json"

```jsonc
{
  // ...snip
  "intelephense.licenceKey": "LICENSEKEYSAMPLE",
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

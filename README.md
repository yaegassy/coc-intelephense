# coc-intelephense

> fork from a [vscode-intelephense](https://github.com/bmewburn/vscode-intelephense)

PHP language server extension using intelephense for [coc.nvim](https://github.com/neoclide/coc.nvim).

## Install

For example, [vim-plug](https://github.com/junegunn/vim-plug) users:

```vim
Plug 'neoclide/coc.nvim', {'branch': 'release'}
Plug 'yaegassy/coc-intelephense', {'do': 'yarn install --frozen-lockfile'}
```

> TODO: Publish to the npm registry

## Configuration options

- `intelephense.enable`: Enable coc-intelephense extension, default `true`
- `intelephense.path`: Absolute path to intelephense module. If there is no setting, the built-in module will be used. e.g. `/path/to/node_modules/intelephense`. default: ""

Other settings can be changed in the same way as "configuration" of [vscode-intelephense](https://github.com/bmewburn/vscode-intelephense).

## License

MIT

----

> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)

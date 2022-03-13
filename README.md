# coc-intelephense

> fork from a [bmewburn/vscode-intelephense](https://github.com/bmewburn/vscode-intelephense) | [PHP Intelephense](https://marketplace.visualstudio.com/items?itemName=bmewburn.vscode-intelephense-client) and more feature.

[coc.nvim](https://github.com/neoclide/coc.nvim) extension for [intelephense](https://intelephense.com/) (PHP language server)

## Install

**CocInstall**:

```vim
:CocInstall @yaegassy/coc-intelephense
```

> scoped packages

**vim-plug**:

```vim
Plug 'yaegassy/coc-intelephense', {'do': 'yarn install --frozen-lockfile'}
```

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

## Configuration options

**For original feature of coc-intelephese**:

- `intelephense.enable`: Enable coc-intelephense extension, default `true`
- `intelephense.path`: Path to intelephense module. `~` and `$HOME`, etc. can also be used. If there is no setting, the built-in module will be used. e.g. `/path/to/node_modules/intelephense`. default: `""`
- `intelephense.client.diagnosticsIgnoreErrorFeature`: Whether to enable the PHPDoc tag (`// @intelephense-ignore-line`, `/** @intelephense-ignore-next-line */`) feature and ignore errors, default: `false` | [DEMO](https://github.com/yaegassy/coc-intelephense/pull/16)
  - This feature is a proprietary implementation of `coc-intelephense`. This feature will be removed when the dedicated feature is added in the upstream's `vscode-intelephense` or `intelephense` language server.
  - I made it an ignore comment like `phpstan`, Please refer to this page for usage. <https://phpstan.org/user-guide/ignoring-errors#ignoring-in-code-using-phpdocs>
- `intelephense.client.disableSnippetsCompletion`: Disable snippets completion only (client), default: `false`
- `intelephense.client.snippetsCompletionExclude`: Exclude specific prefix in snippet completion, e.g. `["class", "fun"]`, default: `[]`
- `intelephense.server.disableCompletion`: Disable completion only (server), default: `false`
- `intelephense.server.disableDefinition`: Disable definition only (server), default: `false`
- `intelephense.phpunit.disableCodeLens`: Disable code lens only (client), default: `false`
- `intelephense.phpunit.codeLensTitle`: CodeLens title. Can be changed to any display, default: `">> [Run PHPUnit]"`
- `intelephense.phpunit.path`: Path to phpunit command. If there is no setting, the vendor/bin/phpunit will be used, default: `""`
- `intelephense.phpunit.colors`: Use colors in output (--colors), default: `false`
- `intelephense.phpunit.debug`: Display debugging information (--debug), default: `false`
- `intelephense.progress.enable`: Enable progress window for indexing, If false, display with echo messages, default: `true` | [DEMO](https://github.com/yaegassy/coc-intelephense/pull/2)

**Same configuration as vscode-intelephense**:

> "intelephense.files.maxSize" is set to 500000 in coc-intelephense.

- `intelephense.compatibility.correctForBaseClassStaticUnionTypes`: Resolves 'BaseClass|static' union types to 'static' instead of 'BaseClass', default: `true`
- `intelephense.compatibility.correctForArrayAccessArrayAndTraversableArrayUnionTypes`: Resolves 'ArrayAccess' and 'Traversable' implementations that are unioned with a typed array to generic syntax. eg 'ArrayAccessOrTraversable|ElementType[]' => 'ArrayAccessOrTraversable<mixed, ElementType>', default: `true`
- `intelephense.files.maxSize`: Maximum file size in bytes, default: `5000000`
- `intelephense.files.associations`: Configure glob patterns to make files available for language server features. Inherits from files.associations, default: `["*.php", "*.phtml"]`
- `intelephense.files.exclude`: Configure glob patterns to exclude certain files and folders from all language server features. Inherits from files.exclude, default: `["**/.git/**", "**/.svn/**", "**/.hg/**", "**/CVS/**", "**/.DS_Store/**", "**/node_modules/**", "**/bower_components/**", "**/vendor/**/{Tests,tests}/**", "**/.history/**", "**/vendor/**/vendor/**"]`
- `intelephense.stubs`: Configure stub files for built in symbols and common extensions. The default setting includes PHP core and all bundled extensions, default: Omitted due to the large number of settings..., See configuration in package.json
- `intelephense.completion.insertUseDeclaration`: Use declarations will be automatically inserted for namespaced classes, traits, interfaces, functions, and constants, default: `true`
- `intelephense.completion.fullyQualifyGlobalConstantsAndFunctions`: Global namespace constants and functions will be fully qualified (prefixed with a backslash), default: `false`
- `intelephense.completion.triggerParameterHints`: Method and function completions will include parentheses and trigger parameter hints, default: `true`
- `intelephense.completion.maxItems`: The maximum number of completion items returned per request, default: `100`
- `intelephense.format.enable`: Enables formatting, default: `true`
- `intelephense.format.braces`: Controls formatting style of braces, valid option `"psr12", "allman", "k&r"`, default: `psr12`
- `intelephense.environment.documentRoot`: The directory of the entry point to the application (directory of index.php). Can be absolute or relative to the workspace folder. Used for resolving script inclusion and path suggestions, default: `null`
- `intelephense.environment.includePaths`: include paths (as individual path items) as defined in the include_path ini setting or paths to external libraries. Can be absolute or relative to the workspace folder. Used for resolving script inclusion and/or adding external symbols to folder, default: `null`
- `intelephense.environment.phpVersion`: A semver compatible string that represents the target PHP version. Used for providing version appropriate suggestions and diagnostics. PHP 5.3.0 and greater supported, default: `"8.1.0"`
- `intelephense.environment.shortOpenTag`: When enabled `<?` will be parsed as a PHP open tag. Defaults to true, default: `true`
- `intelephense.diagnostics.enable`: Enables diagnostics, default: `true`
- `intelephense.diagnostics.run`: Controls when diagnostics are run, valid option `"onType", "onSave"`, default: `"onType"`
- `intelephense.diagnostics.embeddedLanguages`: Enables diagnostics in embedded languages, default: `true`
- `intelephense.diagnostics.undefinedSymbols`: DEPRECATED. Use the setting for each symbol category, default: `true`
- `intelephense.diagnostics.undefinedVariables`: Enables undefined variable diagnostics, default: `true`
- `intelephense.diagnostics.undefinedTypes`: Enables undefined class, interface and trait diagnostics, default: `true`
- `intelephense.diagnostics.undefinedFunctions`: Enables undefined function diagnostics, default: `true`
- `intelephense.diagnostics.undefinedConstants`: Enables undefined constant diagnostics, default: `true`
- `intelephense.diagnostics.undefinedClassConstants`: Enables undefined class constant diagnostics, default: `true`
- `intelephense.diagnostics.undefinedMethods`: Enables undefined method diagnostics, default: `true`
- `intelephense.diagnostics.undefinedProperties`: Enables undefined static property diagnostics, default: `true`
- `intelephense.diagnostics.unusedSymbols`: Enables unused variable, private member, and import diagnostics, default: `true`
- `intelephense.diagnostics.unexpectedTokens`: Enables unexpected token diagnostics, default: `true`
- `intelephense.diagnostics.duplicateSymbols`: Enables duplicate symbol diagnostics, default: `true`
- `intelephense.diagnostics.argumentCount`: Enables argument count diagnostics, default: `true`
- `intelephense.diagnostics.typeErrors`: Enables diagnostics on type compatibility of arguments, property assignments, and return statements where types have been declared, default: `true`
- `intelephense.diagnostics.deprecated`: Enables deprecated diagnostics, default: `true`
- `intelephense.diagnostics.languageConstraints`: Enables reporting of various language constraint errors, default: `true`
- `intelephense.diagnostics.implementationErrors`: Enables reporting of problems associated with method and class implementations. For example, unimplemented methods or method signature incompatibilities, default: `true`
- `intelephense.runtime`: Path to a Node.js executable. Use this if you wish to use a different version of Node.js, default: `null`
- `intelephense.maxMemory`: Maximum memory (in MB) that the server should use. On some systems this may only have effect when runtime has been set. Minimum 256, default: `null`
- `intelephense.licenceKey`: DEPRECATED. Don't use this, default: `""`
- `intelephense.telemetry.enabled`: Anonymous usage and crash data will be sent to Azure Application Insights, default: `null`
- `intelephense.rename.exclude`: Glob patterns to exclude files and folders from having symbols renamed. Rename operation will fail if references and/or definitions are found in excluded files/folders, default: `["**/vendor/**"]`
- `intelephense.rename.namespaceMode`: Controls the scope of a namespace rename operation, valid option `"single", "all"`, default: `"single"`
- `intelephense.references.exclude`: Glob patterns matching files and folders that should be excluded from references search, default: `["**/vendor/**"]`
- `intelephense.phpdoc.returnVoid`: Adds `@return void` to auto generated phpdoc for definitions that do not return a value, default: `true`
- `intelephense.phpdoc.textFormat`: Auto generated phpdoc is returned in {snippet, plain text}, valid option `"snippet", "text"`, default: `"snippet"`
- `intelephense.phpdoc.classTemplate`: An object that describes the format of generated class/interface/trait phpdoc. The following snippet variables are available: SYMBOL_NAME; SYMBOL_KIND; SYMBOL_TYPE; SYMBOL_NAMESPACE, default: See configuration in package.json
- `intelephense.phpdoc.propertyTemplate`: An object that describes the format of generated property phpdoc. The following snippet variables are available: SYMBOL_NAME; SYMBOL_KIND; SYMBOL_TYPE; SYMBOL_NAMESPACE, default: See configuration in package.json
- `intelephense.phpdoc.functionTemplate`: An object that describes the format of generated function/method phpdoc. The following snippet variables are available: SYMBOL_NAME; SYMBOL_KIND; SYMBOL_TYPE; SYMBOL_NAMESPACE, default: See configuration in package.json
- `intelephense.phpdoc.useFullyQualifiedNames`: Fully qualified names will be used for types when true. When false short type names will be used and imported where appropriate. Overrides intelephense.completion.insertUseDeclaration, default: `true`
- `intelephense.trace.server`: Traces the communication between VSCode and the intelephense language server, valid option `"off", "messages", "verbose"`, default: `"off"`

## Commands

**Command List**:

> :CocCommand [CommandName]
>
> **e.g.**:
> :CocCommand intelephense.phpunit.projectTest

- `intelephense.index.workspace`: Index workspace
- `intelephense.cancel.indexing`: Cancel indexing
- `intelephense.phpunit.projectTest`: Run PHPUnit for current project
- `intelephense.phpunit.fileTest`: Run PHPUnit for current file
- `intelephense.phpunit.singleTest`: Run PHPUnit for single (nearest) test

**Example of Vim command and key mapping**:

Vim commands can be defined and executed or key mappings can be set and used.

```vim
" Run PHPUnit for current project
command! -nargs=0 PHPUnit :call CocAction('runCommand', 'intelephense.phpunit.projectTest')

" Run PHPUnit for current file
command! -nargs=0 PHPUnitCurrent :call  CocAction('runCommand', 'intelephense.phpunit.fileTest', ['%'])

" Run PHPUnit for single (nearest) test
nnoremap <leader>te :call CocAction('runCommand', 'intelephense.phpunit.singleTest')<CR>
```

## CodeLens (Neovim only)

**Feature**:

Test file for PHPUnit, allowing execution of a single test method. CodeLens appears at the top of the test method.

**coc-settings.json**:

By default, `codeLens.enable` is set to `false`, which disables it.

Change the setting to `true` to enable it.

```jsonc
{
  "codeLens.enable": true
}
```

**Example key mapping (CodeLens related)**:

```vim
nmap <silent> gl <Plug>(coc-codelens-action)
```

**Misc**:

"CodeLens" does not work with "Vim8" due to coc.nvim specifications.

`intelephense.phpunit.singleTest` commands are available, so please use them.

## Code Actions

**Example key mapping (Code Action related)**:

```vim
nmap <silent> ga <Plug>(coc-codeaction-line)
```

**Code Actions (Client side)**:

- `Open 'php.net' for 'xxxx'` | [DEMO](https://github.com/yaegassy/coc-intelephense/pull/6)
- `Add @intelephense-ignore-line` | [DEMO](https://github.com/yaegassy/coc-intelephense/pull/16)
- `Add @intelephense-ignore-next-line` | [DEMO](https://github.com/yaegassy/coc-intelephense/pull/16)

**Code Actions (Server side)**:

- `Add PHPDoc for 'xxxx'`
- `use Namespace/xxx`
- and more...
  - Other code actions provided by the intelephehse language server

## Thanks

- [bmewburn/vscode-intelephense](https://github.com/bmewburn/vscode-intelephense)

## License

MIT

----

> This extension is built with [create-coc-extension](https://github.com/fannheyward/create-coc-extension)

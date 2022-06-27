import { it, expect } from 'vitest';

import * as removeUnusedImportsParser from '../parsers/removeUnusedImports';

it('removeUnusedImports | with namespace', () => {
  const contents: string[] = [];
  contents.push(`<?php\n`);
  contents.push(`\n`);
  contents.push(`namespace Acme;\n`);
  contents.push(`\n`);
  contents.push(`use Acme\\ClassA;\n`);
  contents.push(`use Acme\\ClassB as B;\n`);
  contents.push(`use Acme\\Child\\{ClassC, ClassD as D};\n`);
  contents.push(`use Acme\\Child\\GrandChild\\{\n`);
  contents.push(`    ClassE,\n`);
  contents.push(`    ClassF as F,\n`);
  contents.push(`    ClassG,\n`);
  contents.push(`};\n`);
  contents.push(`use Acme\\Child\\GrandChild\\ClassH,\n`);
  contents.push(`    Acme\\Child\\GrandChild\\ClassI as I,\n`);
  contents.push(`    Acme\\Child\\GrandChild\\ClassJ;\n`);

  const ast = removeUnusedImportsParser.getAst(contents.join('\n'));
  const res = removeUnusedImportsParser.getUseNodes(ast.children);
  expect(5).toBe(res.length);
});

it('removeUnusedImports | without namespace', () => {
  const contents: string[] = [];
  contents.push(`<?php\n`);
  contents.push(`\n`);
  contents.push(`use Acme\\ClassA;\n`);
  contents.push(`use Acme\\ClassB as B;\n`);
  contents.push(`use Acme\\Child\\{ClassC, ClassD as D};\n`);
  contents.push(`use Acme\\Child\\GrandChild\\{\n`);
  contents.push(`    ClassE,\n`);
  contents.push(`    ClassF as F,\n`);
  contents.push(`    ClassG,\n`);
  contents.push(`};\n`);
  contents.push(`use Acme\\Child\\GrandChild\\ClassH,\n`);
  contents.push(`    Acme\\Child\\GrandChild\\ClassI as I,\n`);
  contents.push(`    Acme\\Child\\GrandChild\\ClassJ;\n`);

  const ast = removeUnusedImportsParser.getAst(contents.join('\n'));
  const res = removeUnusedImportsParser.getUseNodes(ast.children);
  expect(5).toBe(res.length);
});

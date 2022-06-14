import fs from 'fs';
import path from 'path';
import { expect, it } from 'vitest';

import * as inlineParametersParser from '../parsers/inlineParameters';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

it('inlineParametersInlayHints | count of call and new nodes', () => {
  const contents = fs.readFileSync(path.join(FIXTURES_DIR, 'inlay_hints_check.php'));
  const ast = inlineParametersParser.getAst(contents.toString());
  const res = inlineParametersParser.crawlAstToCallAndNewNode(ast.children);
  expect(22).toBe(res.length);
});

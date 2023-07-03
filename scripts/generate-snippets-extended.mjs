// This is a script to adjust and regenerate snippet items that cause problems
// when using the snippet expansion function of coc.nvim

import fs from 'node:fs';

const ORIGINAL_SNIPPET_PATH = new URL(`../data/snippets/original/php.code-snippets`, import.meta.url).pathname;
const ADJUSTMENT_SNIPPET_PATH = new URL(`../data/snippets/adjustment/php.code-snippets`, import.meta.url).pathname;
const EXTENDED_SNIPPET_PATH = new URL(`../data/snippets/extended/php.code-snippets`, import.meta.url).pathname;

await (async () => {
  const extendedJson = {};

  const originalData = await fs.promises.readFile(ORIGINAL_SNIPPET_PATH, { encoding: 'utf-8' });
  const originalJson = JSON.parse(originalData);
  const excludePrefixies = ['class_fun', 'const', 'property', 'doc_class', 'use_group', 'use_as'];
  Object.keys(originalJson).forEach((key) => {
    if (!excludePrefixies.includes(originalJson[key]['prefix'])) {
      extendedJson[key] = originalJson[key];
    }
  });

  const adjustmentData = await fs.promises.readFile(ADJUSTMENT_SNIPPET_PATH, { encoding: 'utf-8' });
  const adjustmentJson = JSON.parse(adjustmentData);
  Object.keys(adjustmentJson).forEach((key) => {
    extendedJson[key] = adjustmentJson[key];
  });

  fs.writeFileSync(EXTENDED_SNIPPET_PATH, JSON.stringify(extendedJson, null, 2));
})();

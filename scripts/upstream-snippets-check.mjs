import fs from 'node:fs';

const FEATCH_URL =
  'https://raw.githubusercontent.com/microsoft/vscode/master/extensions/php/snippets/php.code-snippets';
const RESOURCE_FILE_PATH = new URL(`../data/snippets/original/php.code-snippets`, import.meta.url).pathname;

await (async () => {
  const res = await fetch(FEATCH_URL);
  if (!res.ok) return;
  const remoteData = await res.text();

  const localData = await fs.promises.readFile(RESOURCE_FILE_PATH, { encoding: 'utf-8' });

  if (remoteData === localData) {
    console.log('OK');
    process.exit(0);
  } else {
    console.log('NG');
    process.exit(1);
  }
})();

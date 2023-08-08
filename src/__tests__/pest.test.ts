import { expect, test } from 'vitest';

import * as pestCommon from '../common/pest';
import * as phpParser from '../parsers/php/parser';
import * as testUtils from './testUtils';

test('Get pest test items', async () => {
  const code = testUtils.stripInitialNewline(`
<?php
describe('dummy test', function () {
    it('dummy of test 1', function () {
      // ...
    });

    test('dummy of test 2', function () {
      // ...
    });
});

test('dummy of test 3', function () {
  // ...
});
`);

  const ast = phpParser.getAstByParseCode(code)!;

  const testItems = pestCommon.getPestTestItems(ast);

  const expected = [
    {
      description: 'dummy of test 1',
      callName: 'it',
      startOffset: 47,
      endOffset: 103,
    },
    {
      description: 'dummy of test 2',
      callName: 'test',
      startOffset: 109,
      endOffset: 167,
    },
    {
      description: 'dummy of test 3',
      callName: 'test',
      startOffset: 173,
      endOffset: 223,
    },
  ];

  expect(testItems).toMatchObject(expected);
});

test('Get pest test description at editor offset', async () => {
  const editorOffset = 125;

  const testItems: pestCommon.PestTestItemType[] = [
    {
      description: 'dummy of test 1',
      callName: 'it',
      startOffset: 47,
      endOffset: 103,
    },
    {
      description: 'dummy of test 2',
      callName: 'test',
      startOffset: 109,
      endOffset: 167,
    },
  ];

  const pestTestDecription = pestCommon.getPestTestDescriptionAtEditorOffset(testItems, editorOffset);

  const expected = 'dummy of test 2';
  expect(pestTestDecription).toBe(expected);
});

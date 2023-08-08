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

test('Get phpunit style test items', async () => {
  // escape \ -> \\
  const code = testUtils.stripInitialNewline(`
<?php

use PHPUnit\\Framework\\TestCase;

class PhpUnitStyleTest extends TestCase
{
    public function testDummy1(): void
    {
        $expected = 'Dummy1';
        $this->assertSame('Dummy2', $expected);
    }

    public function testDummy2(): void
    {
        $expected = 'Dummy2';
        $this->assertSame('Dummy2', $expected);
    }
}
`);

  const ast = phpParser.getAstByParseCode(code)!;

  const testItems = pestCommon.getPhpUnitStyleTestItems(ast);

  const expected = [
    {
      methodName: 'testDummy1',
      startOffset: 86,
      endOffset: 210,
    },
    {
      methodName: 'testDummy2',
      startOffset: 216,
      endOffset: 340,
    },
  ];

  expect(testItems).toMatchObject(expected);
});

test('Get phpunit style test name at editor offset', async () => {
  const editorOffset = 220;

  const testItems: pestCommon.PhpUnitTestItemType[] = [
    {
      methodName: 'testDummy1',
      startOffset: 86,
      endOffset: 210,
    },
    {
      methodName: 'testDummy2',
      startOffset: 216,
      endOffset: 340,
    },
  ];

  const testName = pestCommon.getPhpUnitTestNameAtEditorOffset(testItems, editorOffset);

  const expected = 'testDummy2';
  expect(testName).toBe(expected);
});

import { expect, test } from 'vitest';

import * as phpunitCommon from '../common/phpunit';
import * as phpParser from '../parsers/php/parser';
import * as testUtils from './testUtils';

test('Get phpunit test items', async () => {
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

  const testItems = phpunitCommon.getPhpUnitTestItems(ast);

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

test('Get phpunit test name at editor offset', async () => {
  const editorOffset = 220;

  const testItems: phpunitCommon.PhpUnitTestItemType[] = [
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

  const testName = phpunitCommon.getPhpUnitTestNameAtEditorOffset(testItems, editorOffset);

  const expected = 'testDummy2';
  expect(testName).toBe(expected);
});

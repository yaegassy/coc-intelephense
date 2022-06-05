import { it, expect } from 'vitest';

import * as phpDocParser from '../parsers/phpDoc';

it('matchTypeDetailFromVarTag | @var int', () => {
  const line = '@var int';
  const res = phpDocParser.matchTypeDetailFromVarTag(line);

  expect(res).toEqual({ value: 'int', trimedInput: line.trim(), pattern: '@var\\s+(\\S+)$' });
});

it('matchTypeDetailFromVarTag | @var array<int, string>', () => {
  const line = '@var array<int, string>';
  const res = phpDocParser.matchTypeDetailFromVarTag(line);

  expect(res).toEqual({
    value: 'array<int, string>',
    trimedInput: line.trim(),
    pattern: '@var\\s+([\\w|<,\\-\\s\\\\]+[>]+)$',
  });
});

it('matchTypeDetailFromVarTag | @var int $number', () => {
  const line = '@var int $number';
  const res = phpDocParser.matchTypeDetailFromVarTag(line, 'number');

  expect(res).toEqual({ value: 'int', trimedInput: line.trim(), pattern: '@var\\s+(\\S+)\\s+(\\$number)$' });
});

it('matchTypeDetailFromVarTag | @var array<int, string> $sample', () => {
  const line = '@var array<int, string> $sample';
  const res = phpDocParser.matchTypeDetailFromVarTag(line, 'sample');

  expect(res).toEqual({
    value: 'array<int, string>',
    trimedInput: line.trim(),
    pattern: '@var\\s+([\\w|<,\\-\\s\\\\]+[>]+)\\s+(\\$sample)$',
  });
});

it('matchTypeDetailFromVarTag | @var int $sample comment... comment', () => {
  const line = '@var int $sample comment... comment';
  const res = phpDocParser.matchTypeDetailFromVarTag(line, 'sample');

  expect(res).toEqual({
    value: 'int',
    trimedInput: line.trim(),
    pattern: '@var\\s+(\\S+)\\s+(\\$sample)\\s+.*$',
  });
});

it('matchTypeDetailFromVarTag | @var array<int, string> $sample comment... comment', () => {
  const line = '@var array<int, string> $sample comment... comment';
  const res = phpDocParser.matchTypeDetailFromVarTag(line, 'sample');

  expect(res).toEqual({
    value: 'array<int, string>',
    trimedInput: line.trim(),
    pattern: '@var\\s+([\\w|<,\\-\\s\\\\]+[>]+)\\s+(\\$sample)\\s+.*$',
  });
});

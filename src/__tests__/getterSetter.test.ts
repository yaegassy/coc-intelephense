import { it, expect, describe } from 'vitest';
import fs from 'fs';
import path from 'path';

import * as getterSetterParser from '../parsers/getterSetter';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('getMethod', () => {
  it('getMethod | count of methods in the normal class', () => {
    const files = ['normal_class_with_namespace.php', 'normal_class_without_namespace.php'];

    files.forEach((f) => {
      const contents = fs.readFileSync(path.join(FIXTURES_DIR, f));
      const ast = getterSetterParser.getAst(contents.toString());
      const res = getterSetterParser.getMethods(ast.children);
      expect(res.length).toBe(2);
    });
  });

  it('getMethod | count of methods in the multiple class', () => {
    const files = ['multiple_class_with_namespace.php', 'multiple_class_without_namespace.php'];

    files.forEach((f) => {
      const contents = fs.readFileSync(path.join(FIXTURES_DIR, f));
      const ast = getterSetterParser.getAst(contents.toString());
      const res = getterSetterParser.getMethods(ast.children);
      expect(res.length).toBe(3);
    });
  });
});

describe('getClassesNodes', () => {
  it('getClassesNodes | count of classes in the normal class', () => {
    const files = ['normal_class_with_namespace.php', 'normal_class_without_namespace.php'];

    files.forEach((f) => {
      const contents = fs.readFileSync(path.join(FIXTURES_DIR, f));
      const ast = getterSetterParser.getAst(contents.toString());
      const res = getterSetterParser.getClassesNodes(ast.children);
      expect(res.length).toBe(1);
    });
  });

  it('getClassesNodes | count of classes in the multiple class', () => {
    const files = ['multiple_class_with_namespace.php', 'multiple_class_without_namespace.php'];

    files.forEach((f) => {
      const contents = fs.readFileSync(path.join(FIXTURES_DIR, f));
      const ast = getterSetterParser.getAst(contents.toString());
      const res = getterSetterParser.getClassesNodes(ast.children);
      expect(res.length).toBe(2);
    });
  });
});

it('getPropertiesWithClassDatail | count of properties', () => {
  const file = fs.readFileSync(path.join(FIXTURES_DIR, 'normal_class_with_namespace.php'));
  const ast = getterSetterParser.getAst(file.toString());
  const res = getterSetterParser.getPropertiesWithClassDetail(ast.children);
  expect(res.length).toBe(7);
});

it('getConstructorPropertiesWithClassDetail | count of properties', () => {
  const file = fs.readFileSync(path.join(FIXTURES_DIR, 'normal_class_with_namespace.php'));
  const ast = getterSetterParser.getAst(file.toString());
  const res = getterSetterParser.getConstructorPropertiesWithClassDetail(ast.children);
  expect(res.length).toBe(2);
});

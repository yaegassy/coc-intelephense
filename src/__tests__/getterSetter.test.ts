import { it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import * as getterSetterParser from '../parsers/getterSetter';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

it('getMethod | Classes contain namespaces', () => {
  const file = fs.readFileSync(path.join(FIXTURES_DIR, 'standardNamespaceClass.php'));
  const ast = getterSetterParser.getAst(file.toString());
  const res = getterSetterParser.getMethods(ast.children);
  expect(res.length).toBe(2);
});

it('getMethod | Classes not contain namespaces', () => {
  const file = fs.readFileSync(path.join(FIXTURES_DIR, 'standardNonNamespaceClass.php'));
  const ast = getterSetterParser.getAst(file.toString());
  const res = getterSetterParser.getMethods(ast.children);
  expect(res.length).toBe(2);
});

it('getMethod | Multiple classes contain namespace', () => {
  const file = fs.readFileSync(path.join(FIXTURES_DIR, 'multipleNamespaceClass.php'));
  const ast = getterSetterParser.getAst(file.toString());
  const res = getterSetterParser.getMethods(ast.children);
  expect(res.length).toBe(3);
});

it('getMethod | Multiple classes not contain namespace', () => {
  const file = fs.readFileSync(path.join(FIXTURES_DIR, 'multipleNonNamespaceClass.php'));
  const ast = getterSetterParser.getAst(file.toString());
  const res = getterSetterParser.getMethods(ast.children);
  expect(res.length).toBe(3);
});

it('getClassesNodes | Classes contain namespaces', () => {
  const file = fs.readFileSync(path.join(FIXTURES_DIR, 'standardNamespaceClass.php'));
  const ast = getterSetterParser.getAst(file.toString());
  const res = getterSetterParser.getClassesNodes(ast.children);
  expect(res.length).toBe(1);
});

it('getClassesNodes | Classes not contain namespaces', () => {
  const file = fs.readFileSync(path.join(FIXTURES_DIR, 'standardNonNamespaceClass.php'));
  const ast = getterSetterParser.getAst(file.toString());
  const res = getterSetterParser.getClassesNodes(ast.children);
  expect(res.length).toBe(1);
});

it('getClassesNodes | Multiple classes contain namespace', () => {
  const file = fs.readFileSync(path.join(FIXTURES_DIR, 'multipleNamespaceClass.php'));
  const ast = getterSetterParser.getAst(file.toString());
  const res = getterSetterParser.getClassesNodes(ast.children);
  expect(res.length).toBe(2);
});

it('getClassesNodes | Multiple classes not contain namespace', () => {
  const file = fs.readFileSync(path.join(FIXTURES_DIR, 'multipleNonNamespaceClass.php'));
  const ast = getterSetterParser.getAst(file.toString());
  const res = getterSetterParser.getClassesNodes(ast.children);
  expect(res.length).toBe(2);
});

it('getPropertiesWithClassInfo', () => {
  const file = fs.readFileSync(path.join(FIXTURES_DIR, 'standardNamespaceClass.php'));
  const ast = getterSetterParser.getAst(file.toString());
  const res = getterSetterParser.getPropertiesWithClassInfo(ast.children);
  expect(res.length).toBe(7);
});

it('getConstructorPropertiesWithClassInfo', () => {
  const file = fs.readFileSync(path.join(FIXTURES_DIR, 'standardNamespaceClass.php'));
  const ast = getterSetterParser.getAst(file.toString());
  const res = getterSetterParser.getConstructorPropertiesWithClassInfo(ast.children);
  expect(res.length).toBe(2);
});

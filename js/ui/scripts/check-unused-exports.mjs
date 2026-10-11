#!/usr/bin/env node
// Dead-code check for src/**/*.ts(x): an export nobody in src imports (or re-exports) is dead code.
// Zero extra dependencies - it uses the TypeScript compiler API already installed for `tsc -b`.
// `tsc`'s noUnusedLocals/noUnusedParameters (tsconfig.app.json) cover unused locals; this covers exports.
// Usage: node scripts/check-unused-exports.mjs   (from js/ui; `npm run lint:js`, wired into `make lint`)
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'tsconfig.app.json');
const cfg = ts.readConfigFile(configPath, ts.sys.readFile);
if (cfg.error) throw new Error(ts.flattenDiagnosticMessageText(cfg.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();

// Entry points whose exports are consumed outside src (by index.html / vite / vitest).
const ENTRY = new Set(['src/main.tsx']);
const rel = (f) => path.relative(root, f).split(path.sep).join('/');
const sources = program.getSourceFiles().filter((sf) => !sf.isDeclarationFile && rel(sf.fileName).startsWith('src/'));

// Collect, per module, the set of export names that some other source file references.
const used = new Map(); // fileName -> Set<name>
const markUsed = (file, name) => {
  if (!used.has(file)) used.set(file, new Set());
  used.get(file).add(name);
};
const resolveModule = (sf, spec) => {
  const r = ts.resolveModuleName(spec, sf.fileName, parsed.options, ts.sys);
  return r.resolvedModule?.resolvedFileName;
};
for (const sf of sources) {
  ts.forEachChild(sf, (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const target = resolveModule(sf, node.moduleSpecifier.text);
      if (!target) return;
      const clause = node.importClause;
      if (!clause) return;
      if (clause.name) markUsed(target, 'default');
      const nb = clause.namedBindings;
      if (nb && ts.isNamespaceImport(nb)) markUsed(target, '*');
      if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) markUsed(target, (el.propertyName ?? el.name).text);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const target = resolveModule(sf, node.moduleSpecifier.text);
      if (!target) return;
      if (!node.exportClause) markUsed(target, '*');
      else if (ts.isNamedExports(node.exportClause)) for (const el of node.exportClause.elements) markUsed(target, (el.propertyName ?? el.name).text);
    }
  });
  // Dynamic import('./x') with a string literal.
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      const target = resolveModule(sf, node.arguments[0].text);
      if (target) markUsed(target, '*');
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

const problems = [];
for (const sf of sources) {
  const r = rel(sf.fileName);
  if (ENTRY.has(r) || /\.test\.tsx?$/.test(r)) continue;
  const symbol = checker.getSymbolAtLocation(sf);
  if (!symbol) continue;
  const names = used.get(sf.fileName) ?? new Set();
  if (names.has('*')) continue;
  for (const exp of checker.getExportsOfModule(symbol)) {
    if (names.has(exp.name)) continue;
    const decl = exp.declarations?.[0];
    const { line } = decl ? ts.getLineAndCharacterOfPosition(decl.getSourceFile(), decl.getStart()) : { line: 0 };
    problems.push(`${r}:${line + 1}: export '${exp.name}' is never imported by another module in src/`);
  }
}

if (problems.length) {
  console.error('check-unused-exports: dead code found - remove the export or its definition:');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`check-unused-exports: ${sources.length} source files, every export is imported somewhere (ok)`);

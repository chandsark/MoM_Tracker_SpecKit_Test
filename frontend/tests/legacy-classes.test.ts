// SC-001 / FR-002: no screen keeps the pre-Tailwind styling. Class strings are split into whole
// class names (hyphens are part of a name), so `text-muted` never matches the legacy `muted`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', 'src');

const LEGACY = new Set([
  'row',
  'stack',
  'muted',
  'field',
  'secondary',
  'danger',
  'link',
  'button',
  'plain-list',
  'page-header',
  'form-error',
  'table-wrap',
  'banner',
  'tree',
  'summary',
  'filters',
  'tabs',
  'dialog',
  'dialog-backdrop',
  'dialog__actions',
  'app-header',
  'app-header__inner',
  'app-title',
  'app-nav',
  'app-main',
  'skip-link',
  'visually-hidden',
  'checkbox',
  'overdue',
  'breadcrumb',
  'badge-in_progress',
  'badge-medium',
  'badge-blocked',
  'badge-high',
  'badge-overdue',
  'badge-done',
  'badge-resolved',
  'badge-low',
  'badge-critical',
]);

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? tsxFiles(join(dir, e.name))
      : e.name.endsWith('.tsx')
        ? [join(dir, e.name)]
        : [],
  );
}

/** Every class name used in className="…", className={`…`} and string literals inside className={…}. */
export function classNamesIn(source: string): string[] {
  const quoted = (s: string) => [...s.matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]!);
  const attrs = source.match(/className=(?:"[^"]*"|\{`[^`]*`\}|\{[^}]*\})/g) ?? [];
  return attrs
    .flatMap((attr) => {
      const template = /`([^`]*)`/.exec(attr)?.[1];
      if (template === undefined) return quoted(attr);
      const holes = [...template.matchAll(/\$\{([^}]*)\}/g)].flatMap((m) => quoted(m[1]!));
      return [template.replace(/\$\{[^}]*\}/g, ' '), ...holes];
    })
    .flatMap((lit) => lit.split(/\s+/).filter(Boolean));
}

describe('legacy styling', () => {
  it('no component or page uses a pre-Tailwind class name', () => {
    const offenders = tsxFiles(SRC).flatMap((file) =>
      classNamesIn(readFileSync(file, 'utf8'))
        .filter((c) => LEGACY.has(c))
        .map((c) => `${file.slice(SRC.length + 1)}: ${c}`),
    );
    expect(offenders).toEqual([]);
  });

  it('the old stylesheets are gone', () => {
    expect(existsSync(join(SRC, 'styles', 'global.css'))).toBe(false);
    expect(existsSync(join(SRC, 'styles', 'tokens.css'))).toBe(false);
  });

  it('splits class strings into whole names', () => {
    expect(classNamesIn('<p className="text-muted btn-link">')).toEqual(['text-muted', 'btn-link']);
    expect(classNamesIn("<b className={`btn ${x ? 'btn-danger' : 'secondary'}`}>")).toEqual([
      'btn',
      'btn-danger',
      'secondary',
    ]);
  });
});

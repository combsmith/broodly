// __dirname is provided by Jest's CommonJS environment at runtime but lacks type definitions
// without @types/node; declare it locally rather than pulling in the full @types/node package.
declare const __dirname: string;

// Use require() for Node built-ins so this file works under Jest's module resolver.
const { readFileSync } = require('fs');
const { resolve } = require('path');

// Repo root, resolved from apps/mobile/__tests__.
const REPO_ROOT: string = resolve(__dirname, '../../..');

/**
 * Extract the bare package name from a pnpm override key.
 * Override keys may carry a version selector, e.g.
 *   "@tootallnate/once@<3.0.1" -> "@tootallnate/once"
 *   "lodash@>=4.0.0 <=4.17.23" -> "lodash"
 *   "@babel/core"              -> "@babel/core"
 */
function overrideKeyToPackageName(rawKey: string): string {
  const key = rawKey.trim().replace(/^['"]|['"]$/g, '');
  // For scoped packages the separating '@' is the one after index 0.
  const searchFrom = key.startsWith('@') ? 1 : 0;
  const at = key.indexOf('@', searchFrom);
  return at === -1 ? key : key.slice(0, at);
}

/** Parse the `overrides:` block of pnpm-workspace.yaml into a set of package names. */
function parseOverridePackages(): Set<string> {
  const text = readFileSync(resolve(REPO_ROOT, 'pnpm-workspace.yaml'), 'utf8');
  const lines = text.split('\n');
  const packages = new Set<string>();

  let inOverrides = false;
  for (const line of lines) {
    if (/^overrides:\s*$/.test(line)) {
      inOverrides = true;
      continue;
    }
    if (inOverrides) {
      if (line.trim() === '') continue;

      const trimmed = line.trim();
      if (trimmed.startsWith('#')) continue;

      // Block ends at the next top-level (non-indented, non-empty) key.
      if (trimmed !== '' && !/^\s/.test(line)) break;

      let key: string;
      if (trimmed.startsWith("'") || trimmed.startsWith('"')) {
        const quote = trimmed[0];
        const endQuoteIndex = trimmed.indexOf(quote, 1);
        if (endQuoteIndex === -1) continue;
        key = trimmed.slice(1, endQuoteIndex);
      } else {
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) continue;
        key = trimmed.slice(0, colonIndex);
      }
      packages.add(overrideKeyToPackageName(key));
    }
  }
  return packages;
}

/** Parse the npm ecosystem `ignore:` list of .github/dependabot.yml into a set of package names. */
function parseIgnoredPackages(): Set<string> {
  const text = readFileSync(resolve(REPO_ROOT, '.github/dependabot.yml'), 'utf8');
  const packages = new Set<string>();

  // Scope parsing to the npm ecosystem block to avoid false matches from
  // gomod, terraform, or other ecosystems that may have their own ignore lists.
  const npmIndex = text.indexOf('package-ecosystem: "npm"');
  if (npmIndex === -1) return packages;

  const nextEcosystemIndex = text.indexOf('- package-ecosystem:', npmIndex + 24);
  const npmBlock = nextEcosystemIndex === -1
    ? text.slice(npmIndex)
    : text.slice(npmIndex, nextEcosystemIndex);

  const re = /^[ \t]*-[ \t]+dependency-name:[ \t]*(['"]?)([^'"\n]+?)\1[ \t]*(?:#.*)?$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(npmBlock)) !== null) {
    packages.add(match[2].trim());
  }
  return packages;
}

/** Parse ignore entries that carry a `versions:` scope into name -> normalized ranges. */
function parseIgnoredVersionScopes(): Map<string, string[]> {
  const text = readFileSync(resolve(REPO_ROOT, '.github/dependabot.yml'), 'utf8');
  const scopes = new Map<string, string[]>();
  const re = /^[ \t]*-[ \t]+dependency-name:[ \t]*['"]?([^'"\n]+?)['"]?[ \t]*\n((?:[ \t]+(?:versions:|-[ \t]+['"][^\n]*)\n?)*)/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const ranges = [...match[2].matchAll(/-[ \t]+['"]([^'"\n]+)['"]/g)].map((m) => m[1]);
    if (ranges.length > 0) scopes.set(match[1].trim(), ranges);
  }
  return scopes;
}

/** Parse range-scoped override keys (e.g. "glob@>=9.0.0 <14.0.2") into name -> range. */
function parseOverrideRanges(): Map<string, string> {
  const text = readFileSync(resolve(REPO_ROOT, 'pnpm-workspace.yaml'), 'utf8');
  const ranges = new Map<string, string>();
  for (const m of text.matchAll(/^[ \t]+['"]([^'"\n]+)['"]:/gm)) {
    const key = m[1];
    const at = key.indexOf('@', key.startsWith('@') ? 1 : 0);
    if (at !== -1) ranges.set(key.slice(0, at), key.slice(at + 1));
  }
  return ranges;
}

describe('Dependabot ignore list stays in sync with pnpm overrides', () => {
  let overridePackages: Set<string>;
  let ignoredPackages: Set<string>;

  beforeAll(() => {
    overridePackages = parseOverridePackages();
    ignoredPackages = parseIgnoredPackages();
  });

  it('parses a non-empty override set', () => {
    expect(overridePackages.size).toBeGreaterThan(0);
  });

  it('ignores every override-remediated dependency in dependabot.yml', () => {
    // Dependabot cannot process pnpm overrides, so every override-pinned
    // dependency must be ignored or its security-update job fails
    // (security_update_not_possible / all_versions_ignored).
    // NOTE: This test compares package names only; version ranges are not validated.
    // Manually verify that override minimum versions stay at or above patched advisory thresholds.
    const missing = [...overridePackages].filter((p) => !ignoredPackages.has(p)).sort();
    expect(missing).toEqual([]);
  });

  it('has no stale ignore entries without a matching override', () => {
    const extra = [...ignoredPackages].filter((p) => !overridePackages.has(p)).sort();
    expect(extra).toEqual([]);
  });

  it('scopes glob and minimatch ignores to the override version ranges', () => {
    // Ignoring every version would also suppress security updates for versions
    // the overrides do not cover (e.g. glob@7.x, minimatch@3.x via test-exclude).
    const overrideRanges = parseOverrideRanges();
    const scopes = parseIgnoredVersionScopes();
    for (const name of ['glob', 'minimatch']) {
      const range = overrideRanges.get(name);
      expect(range).toBeDefined();
      const normalize = (r: string) => r.replace(/,/g, ' ').replace(/([<>=]+)\s+/g, '$1').replace(/\s+/g, ' ').trim();
      expect((scopes.get(name) ?? []).map(normalize)).toEqual([normalize(range as string)]);
    }
  });
});

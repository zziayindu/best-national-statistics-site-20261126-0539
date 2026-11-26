// make.fun's frontend dossier library for Node 22: one file, the Node standard library only, erasable TypeScript, so
// it runs as-is under `node main.ts` with no flags, no build and no install. Copy it to vendor/makefun-frontend.ts in
// your repository (a copy anywhere else counts as lines you wrote) and import it:
//
//   import { buildDossier } from './vendor/makefun-frontend.ts';
//   writeFileSync('/output/dossier.json', buildDossier('/output', {
//     text_max_bytes: 163840,
//     screenshots: { max: 3, max_bytes: 262144 },
//     app_max_files: 993,
//     app_max_bytes: 16777216,
//   }));
//
// The bounty's scorer runs this same file, byte for byte, on what you hand in, and requires your dossier.json to
// equal what buildDossier writes from your app/ and screenshots/.
//
// An entry hands in app/ (the frontend as static files a browser opens at app/index.html: the page, its ES modules or
// scripts, CSS, images and fonts, third-party code vendored under a directory named vendor, no build step at serve
// time) and screenshots/ (3 PNG or JPEG captures of the running app, the first by name the cover). Nothing of
// either is read over the network: buildDossier only reads files.
//
//   readAppTree(dir, caps)      every file and directory under app/, by path with its bytes and its class (source,
//                               vendored or asset) and the totals; caps (each optional) bound how many entries it
//                               holds, how many bytes and how long a path may be
//   classifyAppPath(path)       'source', 'vendored' or 'asset', by the bounty's source rule: a file under app/ with
//                               extension .html, .js, .mjs, .css or .json, not under a directory named vendor and not
//                               named *.min.js/*.min.mjs/*.min.css
//   htmlFacts(html)             a page's <script>, <link>, <base>, <style>, <img>, <source>, <video>, <audio> and
//                               <iframe> tags and its <script type="importmap"> blocks, in document order
//   importMapOf(facts)          the page's one import map, parsed (imports and scopes, a null value allowed), or why
//                               it has none
//   cleanRef(ref)               a reference as a browser's URL parser reads it: spaces and C0 controls trimmed, tabs
//                               and newlines dropped, a backslash a slash
//   isLocalRef(ref)             whether a reference names a path of the app's own server: no scheme and no leading //
//                               (relative like `main.js` or `../x`, or root-relative like `/x`)
//   refOrigin(ref)              an absolute reference's origin (`https://make.fun`), `data:` for a data URL, the scheme
//                               for any other; null for a local reference
//   isPathSpecifier(name)       whether a module specifier is a path in JavaScript's sense (/, ./ or ../): a bare name
//                               such as "preact" is not, whatever the import map then makes of it
//   resolveAppPath(ref, from)   the path under app/ a local reference names from the referring file's path ('' for
//                               app/ itself); null when it is not local, names nothing or climbs out of app/
//   pageBaseFrom(facts, page)   the path a page's relative references resolve from: its first <base href>, when that
//                               is local, else the page's own path
//   importMapMatch(map, name, from)
//                               what an import map says for a bare specifier imported from `from`: the scoped or
//                               top-level entry, found false when neither maps it, value null when a null entry blocks it
//   resolveModule(name, from, map, base)
//                               the path under app/ a module specifier names: a path specifier from the importer, a bare
//                               one through the import map (its value from the page's base); null for none
//   sourceImports(text)         a module's static import and export-from specifiers, in source order, by a lexical scan
//   dynamicImports(text)        a script's import() calls, in source order: each literal specifier, or null for a
//                               computed one, by the same scan
//   cssReferences(css)          a stylesheet's @import references, its url()s inside @font-face (fonts) and every other
//                               url(), in source order, by a lexical scan
//   importOrder(sources, facts) the source JS files in the order a depth-first walk of static imports reaches them from
//                               index.html's scripts
//   cssOrder(sources, facts)    the source CSS files in the order index.html's stylesheets and their @imports reach them
//   firstLoadOf(tree, facts, textOf)
//                               the files a first load of index.html fetches (see the Load block below), the files its
//                               literal import() calls fetch later, and the references of each naming no file of app/
//   sourceUrls(sources)         every absolute http(s)/ws(s) URL the source files name, each with the files naming it
//   canonicalJson(value)        JSON with sorted keys and no spaces: one spelling per value
//   buildDossier(dir, caps)     the dossier (makefun/dossier/v1) of an entry directory, as canonical JSON bytes
//
// The bounty's scorer gives buildDossier { text_max_bytes, screenshots: { max, max_bytes }, app_max_files,
// app_max_bytes, app_path_max_bytes } from its gate.json. Only text_max_bytes shapes the bytes; the other caps only
// refuse, so passing them too makes your program fail where the scorer would.
//
// THE TEXT. A "## Load" block, then "## Sources".
//
// The Load block, every figure computed from the files alone:
//   Totals: first load N files, G bytes gzip-9 (R raw); later by import() N files, G bytes gzip-9; whole app F files,
//   B bytes                                            the totals below on one line, first (a judge's outline of the
//                                                     text keeps a `Totals:` line and drops the per-file lines)
//   First load: N files, R bytes raw, G bytes gzip-9
//     app/<path>: r bytes raw, g bytes gzip-9          one line a file, in the order the walk reaches it (48 listed,
//                                                     the rest summed on one line)
//     not in app/: <reference> (<where>)               a first-load reference naming no file of app/: another origin's
//                                                     URL or a missing file (16 listed, the rest counted)
//   Loaded later by import(): N files, R bytes raw, G bytes gzip-9
//     app/<path>: r bytes raw, g bytes gzip-9          each file a dynamic import() of a literal path fetches after the
//                                                     first load, in the order reached (48 listed, the rest summed)
//     not in app/: <reference> (<where>)               such an import(), or a later module's import, naming no file of
//                                                     app/ (16 listed, the rest counted)
//     and n import() calls of a computed specifier, not followed (the first in app/<path>)    when there are any
//   Whole app: F files, B bytes; D directories
//   Source files: n (b bytes)
//   Vendored files: n (b bytes)                        then up to 24 of them by path and bytes
//   Assets: <ext> n (b bytes), ...                     by extension
//   URLs in the source: n                              then each distinct absolute URL (64 listed, each cut at 200
//                                                     characters) with the first source file naming it
// The first load is index.html; then, in document order, each <link> whose rel is stylesheet (not alternate) and the
// stylesheets its @imports reach, depth first, with the font files their @font-face url()s name (a data: URL is no
// file); each modulepreload and the modules its static imports reach; each preload; then the @imports and @font-face
// fonts of each inline <style>; then each <script src> of a JavaScript type (a module's static imports walked depth
// first) and each inline module script's static imports. A file counts once, where first reached. Relative references
// resolve from the page's base (pageBaseFrom), CSS url()s from their stylesheet, module specifiers from the importing
// module or through the import map. Raw bytes are the file's size; gzip-9 bytes are node:zlib gzipSync at level 9 of
// its bytes. Loaded later is what dynamic import() fetches after the first load: each import() call whose specifier is
// a string literal or a template literal with no substitution (dynamicImports), in each first-load .js or .mjs file in
// first-load order and then each inline script of a JavaScript type, resolved as a static import is, walked depth
// first (the module, its static imports, then its own import() calls), a file of the first load never counted again;
// an import() of any other specifier is counted, not followed. A URL is any http://, https://, ws:// or wss:// run in a
// source file up to a space, quote, bracket, brace, backslash, `$`, comma or semicolon, trailing . : ! ? dropped; URLs
// in vendored files and assets are not read.
//
// The sources: index.html first, then the source JS files importOrder reaches, then the source CSS files cssOrder
// reaches, then every other source file by path. A source file is one under app/ with extension .html, .js, .mjs,
// .css or .json, not under a directory named vendor and not named *.min.js, *.min.mjs or *.min.css; every other file is
// counted in the Load block, never shown. Each source follows a header line naming its path and bytes (`### app/<path>
// (<b> bytes)`: no line count, so a judge's outline of a many-file app fits every file's heading) and then its text in
// a fence. The text holds at most caps.text_max_bytes UTF-8 bytes: every source that fits goes in whole,
// in that order; the first that does not goes in up to its last complete line that fits (its fence closed, then a line
// naming how many of its lines are not shown), or not at all when not one line fits; nothing follows it but a last
// line naming how many whole files and how many bytes of source were left out. The text is deterministic: the same
// directory writes the same bytes.
//
// buildDossier throws DossierError on input it refuses: no app/ directory (or not a directory), an entry of app/ that
// is a symbolic link or other special file, app/ past app_max_files entries or app_max_bytes bytes or a path past
// app_path_max_bytes, no app/index.html (or one over 1 MiB), screenshots/ holding no image or more than the count cap,
// an image over its byte cap or neither PNG nor JPEG, and a text cap too small for the Load block and the cut line.
// Its error's `limit` names the cap that refused, when a cap did.
//
// The scorer's references row parses every module with acorn (its vendored copy), so the scans here are lexical only:
// they follow what a file says it loads for the dossier's figures and order, and their refusals are the gate's
// business, not this file's.

import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/** The dossier schema buildDossier writes (contracts/dossier.ts DOSSIER_SCHEMA). */
export const DOSSIER_SCHEMA = 'makefun/dossier/v1';
/** The most bytes a dossier holds (contracts/dossier.ts DOSSIER_MAX_BYTES): 4 MiB. */
export const DOSSIER_MAX_BYTES = 4 * 1024 * 1024;
/** The most images a dossier holds (contracts/dossier.ts DOSSIER_MAX_IMAGES). */
export const DOSSIER_MAX_IMAGES = 8;
/** The app's page: the one file app/ must hold. */
export const INDEX_HTML = 'index.html';
/** The most bytes app/index.html may be. */
export const INDEX_HTML_MAX_BYTES = 1024 * 1024;
/** The longest path an app file may have by default, in UTF-8 bytes relative to app/. */
export const APP_PATH_MAX_BYTES = 1000;
/** The gzip level the Load block's compressed sizes are taken at. */
export const GZIP_LEVEL = 9;
/** How many first-load files the Load block lists before it sums the rest. */
const FIRST_LOAD_LISTED = 48;
/** How many first-load references naming no file of app/ the Load block lists before it counts the rest. */
const MISSING_LISTED = 16;
/** How many vendored files the Load block lists by path before it counts the rest. */
const VENDORED_LISTED = 24;
/** How many distinct URLs the Load block lists before it counts the rest, and how much of each it shows. */
const URLS_LISTED = 64;
const URL_SHOWN_CHARS = 200;

/** The extensions a source file has (lowercase; matched case-insensitively). */
export const SOURCE_EXTENSIONS = ['html', 'js', 'mjs', 'css', 'json'] as const;
/** The names a generated file has: not source, whatever its extension. */
const GENERATED_NAME = /\.min\.(?:js|mjs|css)$/i;
/** A source file's extension. */
const SOURCE_NAME = new RegExp(`\\.(?:${SOURCE_EXTENSIONS.join('|')})$`, 'i');
/** A JavaScript file the import walks read. */
const MODULE_NAME = /\.(?:js|mjs)$/i;
/** A stylesheet the @import walks read. */
const CSS_NAME = /\.css$/i;
/** The <script type> values a browser runs as JavaScript ('' is no type attribute); 'module' runs as a module. */
const JS_TYPE = /^(?:|module|(?:text|application)\/(?:x-)?(?:javascript|ecmascript)(?:1\.[0-5])?|text\/jscript|text\/livescript)$/;

/** What a file under app/ is to the dossier: a source it shows, a vendored file or an asset it only counts. */
export type AppFileClass = 'source' | 'vendored' | 'asset';

/** A cap buildDossier or readAppTree refuses on, named in DossierError.limit. */
export type DossierLimit = 'text_max_bytes' | 'screenshots.max' | 'screenshots.max_bytes' | 'app_max_files' | 'app_max_bytes' | 'app_path_max_bytes';

/** Why buildDossier writes no dossier for a directory: its caps, its app/ or its screenshots. */
export class DossierError extends Error {
  /** The caller's cap the input is past (a key of DossierCaps or AppCaps), or null when the input itself is at fault. */
  readonly limit: DossierLimit | null;
  constructor(message: string, limit: DossierLimit | null = null) {
    super(message);
    this.name = 'DossierError';
    this.limit = limit;
  }
}

/**
 * What readAppTree is held to, each cap absent for none.
 *   app_max_files        the files and directories under app/, summed (one entry each, as the platform counts them).
 *   app_max_bytes        the files' sizes, summed (the bytes app/ costs, its directories costing none).
 *   app_path_max_bytes   each path's length in UTF-8 bytes, relative to app/ (APP_PATH_MAX_BYTES when absent).
 */
export interface AppCaps {
  app_max_files?: number;
  app_max_bytes?: number;
  app_path_max_bytes?: number;
}

/** One file under app/. */
export interface AppFile {
  /** POSIX path relative to app/, like `src/main.js`. */
  path: string;
  /** Its size in bytes. */
  bytes: number;
  cls: AppFileClass;
}

/** Every entry under app/, walked once. */
export interface AppTree {
  /** The files, in code-unit path order. */
  files: AppFile[];
  /** The directories' paths, in code-unit order (app/ itself is '' and not listed). */
  directories: string[];
  /** How many entries app/ holds: files and directories, the platform's own count. */
  count: number;
  /** The files' sizes, summed. */
  totalBytes: number;
}

/**
 * What buildDossier is held to: the text's cap in UTF-8 bytes, the screenshot caps (at most `max` images, each at
 * most `max_bytes` bytes; the dossier's own DOSSIER_MAX_IMAGES and DOSSIER_MAX_BYTES hold either way) and
 * readAppTree's caps. A bounty's gate.json may be passed whole: buildDossier reads only these keys.
 */
export interface DossierCaps {
  text_max_bytes: number;
  screenshots?: { max: number; max_bytes: number };
  app_max_files?: number;
  app_max_bytes?: number;
  app_path_max_bytes?: number;
}

// ---------------------------------------------------------------- bytes

const utf8 = new TextDecoder('utf-8');

/** Code-unit order, the same on every machine (localeCompare is not). */
const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const sha256Hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const byteLength = (s: string): number => Buffer.byteLength(s, 'utf8');

/** A string's bytes as text, for display only (invalid UTF-8 becomes U+FFFD). */
const text = (bytes: Uint8Array): string => utf8.decode(bytes);

/** The size of `bytes` gzipped at GZIP_LEVEL by node:zlib. */
export function gzipBytes(bytes: Uint8Array): number {
  return gzipSync(bytes, { level: GZIP_LEVEL }).length;
}

/** Lines of a source: 0 when empty, else its newlines plus one for a last line with none. */
function lineCount(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  let n = 0;
  for (const b of bytes) if (b === 0x0a) n++;
  return bytes[bytes.length - 1] === 0x0a ? n : n + 1;
}

/** A Markdown fence one backtick longer than the longest run in `body`, three at least. */
function fenceFor(body: string): string {
  let longest = 0;
  for (const run of body.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  return '`'.repeat(Math.max(3, longest + 1));
}

/** The fence's language tag for a source path. */
function languageOf(path: string): string {
  const ext = /\.([A-Za-z0-9]+)$/.exec(path)?.[1]?.toLowerCase() ?? '';
  if (ext === 'mjs' || ext === 'js') return 'js';
  if (ext === 'html') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'json') return 'json';
  return 'text';
}

// ---------------------------------------------------------------- the app tree

/** A caller's AppCaps checked: each given cap a whole number, each missing one Infinity (the path cap its default). */
function appCapsOf(caps: AppCaps, who: string): Record<keyof AppCaps, number> {
  const out = { app_max_files: Infinity, app_max_bytes: Infinity, app_path_max_bytes: APP_PATH_MAX_BYTES };
  for (const k of ['app_max_files', 'app_max_bytes', 'app_path_max_bytes'] as const) {
    const v = caps[k] as unknown;
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw new TypeError(`${who}: caps.${k} must be a whole number, not ${String(v)}`);
    out[k] = v;
  }
  return out;
}

/**
 * What a path under app/ is to the dossier: a source it shows, or a vendored file or an asset it only counts. A
 * generated name (*.min.js, *.min.mjs, *.min.css) and any path under a directory named vendor are vendored, a source
 * extension outside them is source, and everything else is an asset.
 */
export function classifyAppPath(path: string): AppFileClass {
  const segs = path.split('/');
  const base = segs[segs.length - 1] ?? '';
  const dirs = segs.slice(0, -1);
  if (dirs.includes('vendor') || GENERATED_NAME.test(base)) return 'vendored';
  return SOURCE_NAME.test(base) ? 'source' : 'asset';
}

/**
 * Every file and directory under app/, by path, with each file's bytes and class and the totals. Symbolic links and
 * other special files are refused, as are more than caps.app_max_files entries, more than caps.app_max_bytes bytes in
 * the files, and a path longer than caps.app_path_max_bytes. Nothing is read but the directory listing. Throws
 * DossierError.
 */
export function readAppTree(appDir: string, caps: AppCaps = {}): AppTree {
  const c = appCapsOf(caps, 'readAppTree');
  let root;
  try {
    root = lstatSync(appDir);
  } catch {
    throw new DossierError('app/: no such directory: an app is a directory of static files, its index.html at its root');
  }
  if (!root.isDirectory()) throw new DossierError('app/: not a directory (an app is a directory of static files)');
  const files: AppFile[] = [];
  const directories: string[] = [];
  const stack: string[] = [''];
  let count = 0;
  let totalBytes = 0;
  while (stack.length > 0) {
    const rel = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(rel === '' ? appDir : join(appDir, rel), { withFileTypes: true });
    } catch (err) {
      throw new DossierError(`app/${rel === '' ? '' : `${rel}/`}: cannot be read (${(err as Error).message})`);
    }
    for (const e of entries) {
      const path = rel === '' ? e.name : `${rel}/${e.name}`;
      const pathBytes = byteLength(path);
      if (pathBytes > c.app_path_max_bytes) {
        throw new DossierError(`app/${path}: a path of ${pathBytes} bytes, over the ${c.app_path_max_bytes} allowed (app_path_max_bytes)`, 'app_path_max_bytes');
      }
      const shown = `app/${path}`;
      let st;
      try {
        st = lstatSync(join(appDir, path));
      } catch {
        throw new DossierError(`${shown}: cannot be read`);
      }
      count++;
      if (count > c.app_max_files) {
        throw new DossierError(`app/: holds more than the ${c.app_max_files} files and directories allowed (app_max_files)`, 'app_max_files');
      }
      if (st.isDirectory()) {
        directories.push(path);
        stack.push(path);
      } else if (st.isFile()) {
        totalBytes += st.size;
        if (totalBytes > c.app_max_bytes) {
          throw new DossierError(`app/: its files come to more than the ${c.app_max_bytes} bytes allowed (app_max_bytes)`, 'app_max_bytes');
        }
        files.push({ path, bytes: st.size, cls: classifyAppPath(path) });
      } else {
        throw new DossierError(`${shown}: a symbolic link or special file (app/ holds plain files and directories only)`);
      }
    }
  }
  files.sort((a, b) => byCodeUnit(a.path, b.path));
  directories.sort(byCodeUnit);
  return { files, directories, count, totalBytes };
}

/** app/index.html's bytes from the tree, or why there is none: refused when missing, a directory or over the cap. */
function readIndexHtml(appDir: string, tree: AppTree): Uint8Array {
  const file = tree.files.find((f) => f.path === INDEX_HTML);
  if (file === undefined) {
    if (tree.directories.includes(INDEX_HTML)) throw new DossierError('buildDossier: app/index.html: a directory, not the page');
    throw new DossierError('buildDossier: app/index.html: no such file: an app is a directory of static files, its index.html at its root');
  }
  if (file.bytes > INDEX_HTML_MAX_BYTES) throw new DossierError(`buildDossier: app/index.html: ${file.bytes} bytes, over the ${INDEX_HTML_MAX_BYTES} a page may be`);
  try {
    return new Uint8Array(readFileSync(join(appDir, INDEX_HTML)));
  } catch (err) {
    throw new DossierError(`buildDossier: app/index.html: cannot be read (${(err as Error).message})`);
  }
}

// ---------------------------------------------------------------- the page

/** One <script> of a page. */
export interface HtmlScript {
  /** Its src attribute, or null when the script is inline. */
  src: string | null;
  /** Its type attribute, lowercased and trimmed ('' when absent). */
  type: string;
  /** An inline script's text ('' for one with src or no body). */
  text: string;
}

/** One <link> of a page. */
export interface HtmlLink {
  href: string;
  /** Its rel attribute, lowercased and trimmed. */
  rel: string;
  /** Its as attribute, lowercased and trimmed ('' when absent). */
  as: string;
}

/** One element of a page that loads a file through its src attribute: <img>, <source>, <video>, <audio> or <iframe>. */
export interface HtmlResource {
  /** Its tag name, lowercased. */
  tag: string;
  /** Its src attribute. */
  src: string;
}

/** The tags whose src is a resource the page loads. */
const RESOURCE_TAGS = ['img', 'source', 'video', 'audio', 'iframe'] as const;

/** One <script type="importmap"> block. */
export interface HtmlImportMap {
  /** Its JSON, when it parsed. */
  value: unknown;
  /** Why its text is not JSON, or null. */
  error: string | null;
}

/** What a page's markup says about the files it loads. */
export interface HtmlFacts {
  /** Every <script> but import maps, in document order. */
  scripts: HtmlScript[];
  /** Every <link> with an href, in document order. */
  links: HtmlLink[];
  /** Every <img>, <source>, <video>, <audio> and <iframe> with a src, in document order. */
  resources: HtmlResource[];
  /** Every <script type="importmap">, in document order. */
  importMaps: HtmlImportMap[];
  /** Every <base href>'s href, in document order (a browser uses the first). */
  bases: string[];
  /** Every inline <style>'s text, in document order. */
  styles: string[];
}

/** HTML's whitespace (a CR is one too: the parser reads CR LF and a lone CR as LF). */
const HTML_SPACE = /[\t\n\f\r ]/;

/**
 * The index of `>` ending a tag whose name starts at `from` (or whose name was read up to `from`), as a browser's
 * tokenizer finds it: the rest of the name, then attributes, a quote quoting only where an attribute's value starts
 * (`<p class=a'b>` ends at its first `>`); -1 when the tag never ends.
 */
function tagEnd(html: string, from: number): number {
  const n = html.length;
  const space = (k: number): boolean => k < n && HTML_SPACE.test(html[k]!);
  let i = from;
  while (i < n && !HTML_SPACE.test(html[i]!) && html[i] !== '/' && html[i] !== '>') i++;
  for (;;) {
    while (i < n && (HTML_SPACE.test(html[i]!) || html[i] === '/')) i++;
    if (i >= n) return -1;
    if (html[i] === '>') return i;
    // An attribute's name: its first character may be anything (an `=` or a quote among them), then up to a space, / > or =.
    i++;
    while (i < n && !HTML_SPACE.test(html[i]!) && html[i] !== '/' && html[i] !== '>' && html[i] !== '=') i++;
    while (space(i)) i++;
    if (i >= n) return -1;
    if (html[i] !== '=') continue;
    i++;
    while (space(i)) i++;
    if (i >= n) return -1;
    const quote = html[i]!;
    if (quote === '"' || quote === "'") {
      const close = html.indexOf(quote, i + 1);
      if (close < 0) return -1;
      i = close + 1;
      continue;
    }
    if (quote === '>') return i;
    while (i < n && !HTML_SPACE.test(html[i]!) && html[i] !== '>') i++;
  }
}

/**
 * Where a comment opening at `at` (`<!--`) ends, just past it, as a browser ends it: `<!-->` and `<!--->` are whole
 * comments, any other runs to its first `-->` or `--!>`, and one never closed runs to the end of the page.
 */
function commentEnd(html: string, at: number): number {
  const body = at + 4;
  if (html[body] === '>') return body + 1;
  if (html.startsWith('->', body)) return body + 2;
  const plain = html.indexOf('-->', body);
  const bang = html.indexOf('--!>', body);
  if (plain < 0 && bang < 0) return html.length;
  if (bang < 0 || (plain >= 0 && plain < bang)) return plain + 3;
  return bang + 4;
}

/** A tag body's attributes, names lowercased, values unquoted; a present attribute with no value is ''. The first of a name wins. */
function attributesOf(body: string): Map<string, string> {
  const out = new Map<string, string>();
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /[\s/]/.test(body[i]!)) i++;
    if (i >= body.length) break;
    const start = i;
    while (i < body.length && !/[\s=/>]/.test(body[i]!)) i++;
    const name = body.slice(start, i).toLowerCase();
    while (i < body.length && /\s/.test(body[i]!)) i++;
    let value = '';
    if (body[i] === '=') {
      i++;
      while (i < body.length && /\s/.test(body[i]!)) i++;
      const quote = body[i];
      if (quote === '"' || quote === "'") {
        const end = body.indexOf(quote, i + 1);
        value = body.slice(i + 1, end < 0 ? body.length : end);
        i = end < 0 ? body.length : end + 1;
      } else {
        // An unquoted value runs to whitespace or the tag's >; a / inside it is part of the value.
        const s = i;
        while (i < body.length && !/[\s>]/.test(body[i]!)) i++;
        value = body.slice(s, i);
      }
    }
    if (name !== '' && !out.has(name)) out.set(name, decodeEntities(value));
  }
  return out;
}

/** The character references an attribute value may carry for a URL's punctuation, decoded (others are left as they are). */
function decodeEntities(value: string): string {
  if (!value.includes('&')) return value;
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", sol: '/', colon: ':', period: '.', tab: '\t', newline: '\n', bsol: '\\', quest: '?', num: '#', equals: '=', percnt: '%' };
  return value.replace(/&(?:#(\d{1,7})|#[xX]([0-9A-Fa-f]{1,6})|([A-Za-z]+));?/g, (whole, dec: string | undefined, hex: string | undefined, name: string | undefined) => {
    const cp = dec !== undefined ? Number.parseInt(dec, 10) : hex !== undefined ? Number.parseInt(hex, 16) : null;
    if (cp !== null) return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : whole;
    const lower = (name ?? '').toLowerCase();
    return Object.hasOwn(named, lower) && name === lower ? named[lower]! : whole;
  });
}

/**
 * The index of the end tag `</name` closing a raw-text element, at or after `from`, ASCII case-insensitively and
 * followed by a space, / or > (as a browser closes one: `</scripts>` does not); -1 when there is none.
 */
function closeIndexOf(html: string, from: number, name: string): number {
  const needle = `</${name}`;
  for (let i = from; i + needle.length <= html.length; i++) {
    if (html[i] !== '<') continue;
    let hit = true;
    for (let j = 1; j < needle.length; j++) {
      const a = html[i + j]!.toLowerCase();
      if (a !== needle[j]) {
        hit = false;
        break;
      }
    }
    const after = html[i + needle.length];
    if (hit && after !== undefined && (after === '/' || after === '>' || HTML_SPACE.test(after))) return i;
  }
  return -1;
}

/** Whether the tag at `at` (just past '<') is `name`, followed by no name character. */
const tagIs = (html: string, at: number, name: string): boolean => html.slice(at, at + name.length).toLowerCase() === name && !/[A-Za-z0-9-]/.test(html[at + name.length] ?? '');

/**
 * Every <script>, <link href>, <base href>, <style>, <img src>, <source src>, <video src>, <audio src>, <iframe src>
 * and <script type="importmap"> of a page, in document order. Comments hide the tags inside them, ended where a
 * browser ends them (`<!-->`, `<!--->`, the first `-->` or `--!>`); `<!...>` (the document type), `<?...>` and a
 * `</` not followed by a letter are bogus comments that end at their first `>`; a `<` not followed by a letter, `!`,
 * `/` or `?` is text. A tag ends at its first `>` outside a quoted attribute value, a quote quoting only where a value
 * starts. This is a tag scan, not an HTML parser: it reads the attributes these tags carry and nothing else.
 */
export function htmlFacts(html: string): HtmlFacts {
  const scripts: HtmlScript[] = [];
  const links: HtmlLink[] = [];
  const resources: HtmlResource[] = [];
  const importMaps: HtmlImportMap[] = [];
  const bases: string[] = [];
  const styles: string[] = [];
  let i = 0;
  while (i < html.length) {
    const at = html.indexOf('<', i);
    if (at < 0) break;
    if (html.startsWith('<!--', at)) {
      i = commentEnd(html, at);
      continue;
    }
    const next = html[at + 1] ?? '';
    if (next === '!' || next === '?' || (next === '/' && !/[A-Za-z]/.test(html[at + 2] ?? ''))) {
      // A bogus comment (the document type among them): it ends at its first `>`, quotes or not.
      const end = html.indexOf('>', at + 2);
      i = end < 0 ? html.length : end + 1;
      continue;
    }
    if (next !== '/' && !/[A-Za-z]/.test(next)) {
      i = at + 1;
      continue;
    }
    const name = at + 1;
    if (tagIs(html, name, 'script')) {
      const end = tagEnd(html, name + 6);
      if (end < 0) break;
      const attrs = attributesOf(html.slice(name + 6, end));
      const type = (attrs.get('type') ?? '').trim().toLowerCase();
      const src = attrs.get('src') ?? null;
      const close = closeIndexOf(html, end + 1, 'script');
      const body = src === null ? html.slice(end + 1, close < 0 ? html.length : close) : '';
      i = close < 0 ? html.length : close + 8;
      if (type === 'importmap') {
        let value: unknown = null;
        let error: string | null = null;
        try {
          value = JSON.parse(body);
        } catch (err) {
          error = (err as Error).message;
        }
        importMaps.push({ value, error });
      } else {
        scripts.push({ src, type, text: body });
      }
      continue;
    }
    if (tagIs(html, name, 'style')) {
      const end = tagEnd(html, name + 5);
      if (end < 0) break;
      const close = closeIndexOf(html, end + 1, 'style');
      styles.push(html.slice(end + 1, close < 0 ? html.length : close));
      i = close < 0 ? html.length : close + 7;
      continue;
    }
    if (tagIs(html, name, 'link')) {
      const end = tagEnd(html, name + 4);
      if (end < 0) break;
      const attrs = attributesOf(html.slice(name + 4, end));
      const href = attrs.get('href');
      if (href !== undefined) links.push({ href, rel: (attrs.get('rel') ?? '').trim().toLowerCase(), as: (attrs.get('as') ?? '').trim().toLowerCase() });
      i = end + 1;
      continue;
    }
    if (tagIs(html, name, 'base')) {
      const end = tagEnd(html, name + 4);
      if (end < 0) break;
      const href = attributesOf(html.slice(name + 4, end)).get('href');
      if (href !== undefined) bases.push(href);
      i = end + 1;
      continue;
    }
    const tag = RESOURCE_TAGS.find((t) => tagIs(html, name, t));
    if (tag !== undefined) {
      const end = tagEnd(html, name + tag.length);
      if (end < 0) break;
      const src = attributesOf(html.slice(name + tag.length, end)).get('src');
      if (src !== undefined) resources.push({ tag, src });
      i = end + 1;
      continue;
    }
    const end = tagEnd(html, name);
    i = end < 0 ? html.length : end + 1;
  }
  return { scripts, links, resources, importMaps, bases, styles };
}

/** Whether a <script type> is one a browser runs as JavaScript (classic or module). */
export function isJavaScriptType(type: string): boolean {
  return JS_TYPE.test(type);
}

/** A <link rel>'s tokens. */
export const relTokens = (rel: string): string[] => rel.split(/\s+/).filter((t) => t !== '');

/** A page's import map: its imports and scopes, each a specifier to a reference; a null value blocks its specifier. */
export interface ImportMap {
  imports: Record<string, string | null>;
  scopes: Record<string, Record<string, string | null>>;
}

/** A page's one import map, or why it has none: `map` is null when `error` says why (no map at all is no error). */
export interface ImportMapRead {
  map: ImportMap | null;
  error: string | null;
}

/** Whether `value` is a plain object. */
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** An own enumerable property set whatever its key: a "__proto__" key stays a key, never the prototype. */
function setOwn<T>(o: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(o, key, { value, enumerable: true, writable: true, configurable: true });
}

/**
 * The page's single import map, parsed, or why there is none. A page with no import map has map null and error null
 * (an app needs none); two maps, or one that is not a JSON object of string or null values, is an error. A null value
 * is kept: it blocks its specifier.
 */
export function importMapOf(facts: HtmlFacts): ImportMapRead {
  if (facts.importMaps.length === 0) return { map: null, error: null };
  if (facts.importMaps.length > 1) return { map: null, error: `the page holds ${facts.importMaps.length} import maps: a page holds one` };
  const only = facts.importMaps[0]!;
  if (only.error !== null) return { map: null, error: `the page's import map is not JSON (${only.error})` };
  if (!isObject(only.value)) return { map: null, error: "the page's import map is not a JSON object" };
  const imports: Record<string, string | null> = {};
  const importsRaw = only.value.imports;
  if (importsRaw !== undefined) {
    if (!isObject(importsRaw)) return { map: null, error: 'the page\'s import map holds an "imports" that is not an object' };
    for (const [key, value] of Object.entries(importsRaw)) {
      if (value !== null && typeof value !== 'string') return { map: null, error: `the page's import map maps ${JSON.stringify(key)} to no string` };
      setOwn(imports, key, value);
    }
  }
  const scopes: Record<string, Record<string, string | null>> = {};
  const scopesRaw = only.value.scopes;
  if (scopesRaw !== undefined) {
    if (!isObject(scopesRaw)) return { map: null, error: 'the page\'s import map holds a "scopes" that is not an object' };
    for (const [scope, entries] of Object.entries(scopesRaw)) {
      if (!isObject(entries)) return { map: null, error: `the page's import map scope ${JSON.stringify(scope)} is not an object` };
      const inner: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(entries)) {
        if (value !== null && typeof value !== 'string') return { map: null, error: `the page's import map scope ${JSON.stringify(scope)} maps ${JSON.stringify(key)} to no string` };
        setOwn(inner, key, value);
      }
      setOwn(scopes, scope, inner);
    }
  }
  return { map: { imports, scopes }, error: null };
}

// ---------------------------------------------------------------- references

/** A URI scheme's leading `name:`. */
const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

/**
 * A reference as a browser's URL parser reads it: leading and trailing spaces and C0 controls trimmed, every tab, LF
 * and CR inside dropped, and every backslash read as a slash (as an http(s) URL reads it).
 */
export function cleanRef(ref: string): string {
  // eslint-disable-next-line no-control-regex
  return ref.replace(/^[\u0000- ]+|[\u0000- ]+$/g, '').replace(/[\t\n\r]/g, '').replace(/\\/g, '/');
}

/** Whether a reference names a path of the app's own server: not empty, no scheme and no leading //. */
export function isLocalRef(ref: string): boolean {
  const r = cleanRef(ref);
  return r.length > 0 && !URI_SCHEME.test(r) && !r.startsWith('//');
}

/**
 * An absolute reference's origin as a browser reads it on an https page: `https://make.fun` for
 * `https://make.fun/api/x` or `//make.fun/x`; `data:` for a data URL; the scheme (like `javascript:` or `blob:`) for
 * any other with no host; null for a local reference. A reference no URL parser takes is its scheme, or `invalid`.
 */
export function refOrigin(ref: string): string | null {
  const r = cleanRef(ref);
  if (r.length === 0 || isLocalRef(r)) return null;
  let url: URL;
  try {
    url = new URL(r, 'https://local.invalid/');
  } catch {
    return URI_SCHEME.exec(r)?.[0]?.toLowerCase() ?? 'invalid';
  }
  if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'ws:' || url.protocol === 'wss:') return url.origin;
  return url.protocol;
}

/** Whether a module specifier is a path in JavaScript's sense: it starts with /, ./ or ../. */
export function isPathSpecifier(specifier: string): boolean {
  return specifier.startsWith('/') || specifier.startsWith('./') || specifier.startsWith('../');
}

/** A path segment percent-decoded, or as written when it does not decode. */
function decodeSegment(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

/**
 * The path under app/ that the local reference `ref` names, resolved against the referring file's path (`from`, POSIX
 * and relative to app/, like `src/main.js`; a page is its own path): a leading / starts at app/ (the app served at its
 * server's root), else the referring file's directory. Its query and fragment are dropped, each segment
 * percent-decoded. '' is app/ itself. Null when `ref` is not local, names nothing (empty, or only a query or
 * fragment), or climbs out of app/.
 */
export function resolveAppPath(ref: string, from: string): string | null {
  const r = cleanRef(ref);
  if (!isLocalRef(r)) return null;
  const cut = r.search(/[?#]/);
  const raw = cut < 0 ? r : r.slice(0, cut);
  if (raw === '') return null;
  const parts = raw.startsWith('/') ? [] : from.split('/').slice(0, -1);
  for (const piece of raw.split('/')) {
    const seg = decodeSegment(piece);
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (parts.length === 0) return null;
      parts.pop();
      continue;
    }
    parts.push(seg);
  }
  return parts.join('/');
}

/**
 * The path a page's relative references resolve from: a file path whose directory is the page's base. Its first
 * <base href>, when that is local and stays inside app/ (a base naming a directory, like `/` or `sub/`, is that
 * directory), else the page's own path. A base on another origin is the gate's refusal, not this function's.
 */
export function pageBaseFrom(facts: HtmlFacts, page: string): string {
  const href = facts.bases[0];
  if (href === undefined || !isLocalRef(href)) return page;
  const r = cleanRef(href);
  const cut = r.search(/[?#]/);
  const raw = cut < 0 ? r : r.slice(0, cut);
  if (raw === '') return page;
  const dirLike = raw.endsWith('/') || /(?:^|\/)\.\.?$/.test(raw);
  const target = resolveAppPath(dirLike ? `${raw.endsWith('/') ? raw : `${raw}/`}_` : raw, page);
  return target === null ? page : target;
}

/** What an import map says about a specifier: found false when it maps nothing, or value null when a null entry blocks it. */
export interface ImportMapMatch {
  found: boolean;
  value: string | null;
}

/** The entry for a specifier in one map: an exact own key, else the longest own key ending in / that prefixes it. */
function entryOf(entries: Record<string, string | null>, specifier: string): ImportMapMatch {
  if (Object.hasOwn(entries, specifier)) return { found: true, value: entries[specifier]! };
  let best: string | null = null;
  for (const key of Object.keys(entries)) {
    if (key.endsWith('/') && specifier.startsWith(key) && (best === null || key.length > best.length)) best = key;
  }
  if (best === null) return { found: false, value: null };
  const base = entries[best]!;
  if (base === null) return { found: true, value: null };
  return { found: true, value: `${base}${specifier.slice(best.length)}` };
}

/**
 * The app path a scope key names from the page's base, or null when it names none (another origin's): a key ending in
 * / is a directory prefix (its path ending in /, or '' for app/ itself), any other key one file's path.
 */
function scopePath(scope: string, base: string): string | null {
  const r = cleanRef(scope);
  const cut = r.search(/[?#]/);
  const raw = cut < 0 ? r : r.slice(0, cut);
  if (!isLocalRef(raw)) return null;
  const target = resolveAppPath(raw.endsWith('/') ? `${raw}_` : raw, base);
  if (target === null) return null;
  return raw.endsWith('/') ? target.slice(0, -1) : target;
}

/** Whether a module at `from` is in the scope at `prefix` (scopePath's): under a directory prefix, or that very file. */
const inScope = (prefix: string, from: string): boolean => (prefix === '' || prefix.endsWith('/') ? from.startsWith(prefix) : from === prefix);

/**
 * What the page's import map says for `specifier` imported from `from` (a path under app/; the page's own path for an
 * inline script): a matching scope's map first, its longest URL prefix winning, then the top-level imports. `base` is
 * the page's base (pageBaseFrom), which scope keys resolve from.
 */
export function importMapMatch(map: ImportMap | null, specifier: string, from: string = INDEX_HTML, base: string = INDEX_HTML): ImportMapMatch {
  if (map === null) return { found: false, value: null };
  let best: { prefix: string; entries: Record<string, string | null> } | null = null;
  for (const [scope, entries] of Object.entries(map.scopes)) {
    const prefix = scopePath(scope, base);
    if (prefix === null || !inScope(prefix, from)) continue;
    if (best === null || prefix.length > best.prefix.length) best = { prefix, entries };
  }
  if (best !== null) {
    const scoped = entryOf(best.entries, specifier);
    if (scoped.found) return scoped;
  }
  return entryOf(map.imports, specifier);
}

/**
 * Whether an import map's value is one a browser takes: a path (/, ./ or ../) or an absolute URL. Any other value
 * (a bare `vendor/x.js`) is no address, so a browser drops its entry.
 */
export function isMapAddress(value: string): boolean {
  const r = cleanRef(value);
  return isPathSpecifier(r) || URI_SCHEME.test(r);
}

/**
 * The path under app/ a module specifier names, or null when it names none there: a path specifier resolves from the
 * importing file `from`; an absolute URL names no file of app/; a bare specifier goes through the import map, its
 * value resolving from the page's base `base` (a value that is no address names nothing).
 */
export function resolveModule(specifier: string, from: string, map: ImportMap | null, base: string = INDEX_HTML): string | null {
  const s = cleanRef(specifier);
  if (isPathSpecifier(s)) return resolveAppPath(s, from);
  if (URI_SCHEME.test(s)) return null;
  const match = importMapMatch(map, specifier, from, base);
  if (!match.found || match.value === null || !isMapAddress(match.value)) return null;
  return resolveAppPath(match.value, base);
}

// ---------------------------------------------------------------- static imports

const IDENT_START = /[A-Za-z_$]/;
const IDENT = /[A-Za-z0-9_$]/;

/**
 * A module's static import and export-from specifiers, in source order, by a lexical scan: comments, strings,
 * template literals and regular-expression literals are skipped, so the words inside them are never read as imports.
 * This is not a parser; it recognizes `import 'x'`, `import ... from 'x'`, `export ... from 'x'` and
 * `export * from 'x'`, and leaves anything else alone (`import(...)` and `import.meta` among it).
 */
export function sourceImports(source: string): string[] {
  return scanImports(source).statics;
}

/**
 * A script's or module's dynamic import() calls, in source order, by the same lexical scan as sourceImports: each
 * call's specifier when it is a string literal or a template literal with no substitution (`import('./x.js')`,
 * ``import(`./x.js`)``, an options argument after it allowed), or null when it is anything else (computed, like
 * `import(base + 'x.js')` or ``import(`./${name}.js`)``). A method named import (`o.import('x')`) is no call of it.
 */
export function dynamicImports(source: string): (string | null)[] {
  return scanImports(source).dynamics;
}

/** sourceImports' and dynamicImports' one scan. */
function scanImports(source: string): { statics: string[]; dynamics: (string | null)[] } {
  const out: string[] = [];
  const dynamics: (string | null)[] = [];
  const n = source.length;
  let i = 0;
  /** The last significant (non-space, non-comment) character, for the regex-versus-division guess. */
  const regexPosition = (prev: string): boolean => prev === '' || '([{,;:=!&|?+-*%^~<>'.includes(prev);
  let prev = '';

  const skipSpace = (): void => {
    for (;;) {
      while (i < n && /\s/.test(source[i]!)) i++;
      if (source.startsWith('//', i)) {
        while (i < n && source[i] !== '\n') i++;
        continue;
      }
      if (source.startsWith('/*', i)) {
        const end = source.indexOf('*/', i + 2);
        i = end < 0 ? n : end + 2;
        continue;
      }
      return;
    }
  };
  const skipString = (quote: string): string | null => {
    i++;
    let s = '';
    while (i < n) {
      const ch = source[i]!;
      if (ch === quote) {
        i++;
        return s;
      }
      if (ch === '\\') {
        const next = source[i + 1];
        if (next === undefined) return null;
        s += next === 'n' ? '\n' : next === 't' ? '\t' : next === 'r' ? '\r' : next;
        i += 2;
        continue;
      }
      if (ch === '\n') return null;
      s += ch;
      i++;
    }
    return null;
  };
  const skipTemplate = (): void => {
    i++;
    while (i < n) {
      const ch = source[i]!;
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === '`') {
        i++;
        return;
      }
      i++;
    }
  };
  const skipRegex = (): void => {
    i++;
    let inClass = false;
    while (i < n) {
      const ch = source[i]!;
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === '[') inClass = true;
      else if (ch === ']') inClass = false;
      else if (ch === '/' && !inClass) {
        i++;
        return;
      } else if (ch === '\n') return;
      i++;
    }
  };
  const readWord = (): string => {
    const start = i;
    while (i < n && IDENT.test(source[i]!)) i++;
    return source.slice(start, i);
  };
  /** Reads a string literal at i, or null; advances past it either way. */
  const maybeString = (): string | null => {
    skipSpace();
    const ch = source[i];
    if (ch !== '"' && ch !== "'") return null;
    return skipString(ch);
  };
  /** From just after `import`/`export`, reads a clause and its `from 'x'`; returns the specifier or null. */
  const clause = (stopAt: string[]): string | null => {
    for (;;) {
      skipSpace();
      if (i >= n) return null;
      const ch = source[i]!;
      if (stopAt.includes(ch)) return null;
      if (ch === '"' || ch === "'") return skipString(ch);
      if (ch === '{' || ch === '}' || ch === ',' || ch === '*') {
        i++;
        continue;
      }
      if (IDENT_START.test(ch)) {
        const word = readWord();
        if (word === 'from') return maybeString();
        continue;
      }
      return null;
    }
  };

  /** A template literal at i with no substitution, its escapes read as skipString reads them; null (i unchanged) for one with a `${`. */
  const plainTemplate = (): string | null => {
    let j = i + 1;
    let s = '';
    while (j < n) {
      const ch = source[j]!;
      if (ch === '`') {
        i = j + 1;
        return s;
      }
      if (ch === '\\') {
        const next = source[j + 1];
        if (next === undefined) return null;
        s += next === 'n' ? '\n' : next === 't' ? '\t' : next === 'r' ? '\r' : next;
        j += 2;
        continue;
      }
      if (ch === '$' && source[j + 1] === '{') return null;
      s += ch;
      j++;
    }
    return null;
  };
  /**
   * From the `(` of an import( call: its literal specifier, read and passed, when the argument is a literal alone (an
   * options argument may follow), else null with i just past the `(` so the scan reads the argument as code.
   */
  const dynamicCall = (): void => {
    const open = i;
    i++;
    skipSpace();
    const ch = source[i];
    let spec: string | null = null;
    if (ch === '"' || ch === "'") spec = skipString(ch);
    else if (ch === '`') spec = plainTemplate();
    if (spec !== null) {
      skipSpace();
      if (source[i] === ')' || source[i] === ',') {
        dynamics.push(spec);
        prev = 'a';
        return;
      }
    }
    dynamics.push(null);
    i = open + 1;
    prev = '(';
  };

  while (i < n) {
    skipSpace();
    if (i >= n) break;
    const ch = source[i]!;
    if (ch === '"' || ch === "'") {
      skipString(ch);
      prev = ch;
      continue;
    }
    if (ch === '`') {
      skipTemplate();
      prev = '`';
      continue;
    }
    if (ch === '/') {
      if (regexPosition(prev)) skipRegex();
      else i++;
      prev = '/';
      continue;
    }
    if (IDENT_START.test(ch)) {
      const member = prev === '.';
      const word = readWord();
      prev = 'a';
      if (word === 'import') {
        skipSpace();
        if (source[i] === '(' && !member) {
          dynamicCall();
          continue;
        }
        if (source[i] === '(' || source[i] === '.') continue;
        const spec = clause(['=', ';']);
        if (spec !== null) out.push(spec);
        continue;
      }
      if (word === 'export') {
        skipSpace();
        if (source[i] !== '*' && source[i] !== '{') continue;
        const spec = clause(['=', ';']);
        if (spec !== null) out.push(spec);
        continue;
      }
      continue;
    }
    prev = ch;
    i++;
  }
  return { statics: out, dynamics };
}

// ---------------------------------------------------------------- stylesheets

/** One reference a stylesheet makes: an @import, a url() inside @font-face (a font), or any other url(). */
export interface CssReference {
  kind: 'import' | 'font' | 'url';
  ref: string;
}

/** A CSS string or url() body's escapes decoded: a hex escape is its code point, an escaped newline nothing, any other escaped character itself. */
function cssUnescape(s: string): string {
  return s.replace(/\\(?:([0-9A-Fa-f]{1,6})[ \t\n\r\f]?|(\r\n|[\n\r\f])|([\s\S]))/g, (_w, hex: string | undefined, nl: string | undefined, ch: string | undefined) => {
    if (hex !== undefined) {
      const cp = Number.parseInt(hex, 16);
      return cp > 0 && cp <= 0x10ffff && (cp < 0xd800 || cp > 0xdfff) ? String.fromCodePoint(cp) : '�';
    }
    if (nl !== undefined) return '';
    return ch ?? '';
  });
}

/**
 * A stylesheet's references in source order, by a lexical scan (comments skipped, strings read whole): each
 * `@import "x"` or `@import url(x)` (kind import), each url() inside an @font-face block (kind font), and every other
 * url() (kind url). The `src` of a font may also be a local() name, which names no file and is not returned.
 */
export function cssReferences(css: string): CssReference[] {
  const out: CssReference[] = [];
  const n = css.length;
  let i = 0;
  const blocks: boolean[] = [];
  let pendingFontFace = false;
  let pendingImport = false;
  let fontDepth = 0;
  const readString = (quote: string): string => {
    let j = i + 1;
    let raw = '';
    while (j < n) {
      const ch = css[j]!;
      if (ch === '\\' && j + 1 < n) {
        raw += css.slice(j, j + 2);
        j += 2;
        continue;
      }
      if (ch === quote || ch === '\n') {
        j++;
        break;
      }
      raw += ch;
      j++;
    }
    i = j;
    return cssUnescape(raw);
  };
  while (i < n) {
    const ch = css[i]!;
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? n : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const value = readString(ch);
      if (pendingImport) {
        out.push({ kind: 'import', ref: value });
        pendingImport = false;
      }
      continue;
    }
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === '@') {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_-]/.test(css[j]!)) j++;
      const word = css.slice(i + 1, j).toLowerCase();
      if (word === 'import') pendingImport = true;
      else if (word === 'font-face') pendingFontFace = true;
      i = j;
      continue;
    }
    if ((ch === 'u' || ch === 'U') && css.slice(i, i + 4).toLowerCase() === 'url(' && !/[A-Za-z0-9_-]/.test(css[i - 1] ?? '')) {
      i += 4;
      while (i < n && /\s/.test(css[i]!)) i++;
      let value: string;
      if (css[i] === '"' || css[i] === "'") {
        value = readString(css[i]!);
        const close = css.indexOf(')', i);
        i = close < 0 ? n : close + 1;
      } else {
        let j = i;
        let raw = '';
        while (j < n && css[j] !== ')') {
          if (css[j] === '\\' && j + 1 < n) {
            raw += css.slice(j, j + 2);
            j += 2;
            continue;
          }
          raw += css[j];
          j++;
        }
        value = cssUnescape(raw.trim());
        i = j < n ? j + 1 : n;
      }
      out.push({ kind: pendingImport ? 'import' : fontDepth > 0 ? 'font' : 'url', ref: value });
      pendingImport = false;
      continue;
    }
    if (ch === '{') {
      blocks.push(pendingFontFace);
      if (pendingFontFace) fontDepth++;
      pendingFontFace = false;
      pendingImport = false;
      i++;
      continue;
    }
    if (ch === '}') {
      if (blocks.pop() === true) fontDepth--;
      i++;
      continue;
    }
    if (ch === ';') {
      pendingImport = false;
      pendingFontFace = false;
    }
    i++;
  }
  return out;
}

// ---------------------------------------------------------------- order and first load

/** A source file of an app: its path under app/ and its bytes. */
export interface AppSource {
  path: string;
  bytes: Uint8Array;
}

/**
 * The source JS files of an app in the order a depth-first walk of static imports reaches them from index.html: each
 * <script> of a JavaScript type in document order, its src resolved from the page's base or, for an inline module
 * script, its imports, then each reached file's own static imports in source order, the first time a path is reached.
 * Specifiers resolve as resolveModule says; one that resolves to no source JS file is skipped, and a file reached once
 * is never walked twice. `sources` is every source file of app/ (index.html included, which is never in the result).
 */
export function importOrder(sources: readonly AppSource[], facts: HtmlFacts): string[] {
  const byPath = new Map(sources.map((s) => [s.path, s]));
  const map = importMapOf(facts).map;
  const base = pageBaseFrom(facts, INDEX_HTML);
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (path: string | null): void => {
    if (path === null || seen.has(path) || !MODULE_NAME.test(path) || !byPath.has(path)) return;
    seen.add(path);
    order.push(path);
    for (const specifier of sourceImports(text(byPath.get(path)!.bytes))) visit(resolveModule(specifier, path, map, base));
  };
  for (const script of facts.scripts) {
    if (!isJavaScriptType(script.type)) continue;
    if (script.src !== null) visit(resolveAppPath(script.src, base));
    else if (script.type === 'module') for (const specifier of sourceImports(script.text)) visit(resolveModule(specifier, INDEX_HTML, map, base));
  }
  return order;
}

/** Whether a <link>'s rel makes it a stylesheet the page applies on load (a stylesheet that is not an alternate). */
const isLoadedStylesheet = (rel: string): boolean => {
  const tokens = relTokens(rel);
  return tokens.includes('stylesheet') && !tokens.includes('alternate');
};

/**
 * The source CSS files of an app in the order index.html's stylesheets reach them: each <link rel=stylesheet> in
 * document order and then each inline <style>, each stylesheet's @imports walked depth first, the first time a path is
 * reached. `sources` is every source file of app/.
 */
export function cssOrder(sources: readonly AppSource[], facts: HtmlFacts): string[] {
  const byPath = new Map(sources.map((s) => [s.path, s]));
  const base = pageBaseFrom(facts, INDEX_HTML);
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (path: string | null): void => {
    if (path === null || seen.has(path) || !CSS_NAME.test(path) || !byPath.has(path)) return;
    seen.add(path);
    order.push(path);
    for (const r of cssReferences(text(byPath.get(path)!.bytes))) if (r.kind === 'import') visit(resolveAppPath(r.ref, path));
  };
  for (const link of facts.links) if (isLoadedStylesheet(link.rel)) visit(resolveAppPath(link.href, base));
  for (const style of facts.styles) for (const r of cssReferences(style)) if (r.kind === 'import') visit(resolveAppPath(r.ref, base));
  return order;
}

/** A first-load reference that names no file of app/: another origin's URL, or a path app/ does not hold. */
export interface LoadMiss {
  ref: string;
  /** Where the reference is, like `index.html's <script src>` or `imported by app/src/main.js`. */
  where: string;
}

/**
 * The files a first load fetches, in the order reached, and the first-load references naming no file of app/; then
 * the files the page's literal import() calls fetch later, and what of theirs names no file of app/.
 */
export interface FirstLoadPaths {
  paths: string[];
  missing: LoadMiss[];
  /** The files a dynamic import() with a literal specifier reaches, with the static imports they pull in, in the order reached; none of the first load's. */
  later: string[];
  /** The import() specifiers, and the later modules' imports, that name no file of app/. */
  laterMissing: LoadMiss[];
  /** Where each import() with a computed specifier is (`app/<path>` or `index.html's inline script <k>`), one entry a call: the walk follows none. */
  computed: string[];
}

/**
 * The files a first load of index.html fetches, in the order the walk reaches them (the header's Load block says the
 * order), each once, with every first-load reference that names no file of app/; then the files the dynamic import()
 * calls of the page's scripts and of every module reached fetch later (each literal specifier walked depth first: the
 * module, its static imports, then its own import() calls), none counted twice. `textOf` reads a file's text by path
 * (it is called only for .js, .mjs and .css files the walk reaches).
 */
export function firstLoadOf(tree: AppTree, facts: HtmlFacts, textOf: (path: string) => string): FirstLoadPaths {
  const files = new Set(tree.files.map((f) => f.path));
  const map = importMapOf(facts).map;
  const base = pageBaseFrom(facts, INDEX_HTML);
  const paths: string[] = [];
  const missing: LoadMiss[] = [];
  const seen = new Set<string>();
  const add = (path: string): boolean => {
    if (seen.has(path)) return false;
    seen.add(path);
    paths.push(path);
    return true;
  };
  /** A reference resolved to a file of app/, or recorded as missing. */
  const fileOf = (target: string | null, ref: string, where: string): string | null => {
    if (target !== null && files.has(target)) return target;
    missing.push({ ref, where });
    return null;
  };
  const walkModule = (path: string): void => {
    if (!add(path) || !MODULE_NAME.test(path)) return;
    for (const specifier of sourceImports(textOf(path))) {
      const target = fileOf(resolveModule(specifier, path, map, base), specifier, `imported by app/${path}`);
      if (target !== null) walkModule(target);
    }
  };
  /** A font a first-load stylesheet's @font-face names (from `from`, a stylesheet's path or the page's base), added; a data: URL is no file. */
  const font = (ref: string, from: string, where: string): void => {
    if (cleanRef(ref) === '' || refOrigin(ref) === 'data:') return;
    const target = fileOf(resolveAppPath(ref, from), ref, where);
    if (target !== null) add(target);
  };
  const walkCss = (path: string): void => {
    if (!add(path) || !CSS_NAME.test(path)) return;
    for (const r of cssReferences(textOf(path))) {
      if (r.kind === 'font') font(r.ref, path, `@font-face in app/${path}`);
      if (r.kind !== 'import') continue;
      const target = fileOf(resolveAppPath(r.ref, path), r.ref, `@import in app/${path}`);
      if (target !== null) walkCss(target);
    }
  };
  add(INDEX_HTML);
  for (const link of facts.links) {
    const rels = relTokens(link.rel);
    if (isLoadedStylesheet(link.rel)) {
      const target = fileOf(resolveAppPath(link.href, base), link.href, "index.html's <link rel=stylesheet>");
      if (target !== null) walkCss(target);
    } else if (rels.includes('modulepreload')) {
      const target = fileOf(resolveAppPath(link.href, base), link.href, "index.html's <link rel=modulepreload>");
      if (target !== null) walkModule(target);
    } else if (rels.includes('preload')) {
      const target = fileOf(resolveAppPath(link.href, base), link.href, "index.html's <link rel=preload>");
      if (target !== null) add(target);
    }
  }
  facts.styles.forEach((style, k) => {
    for (const r of cssReferences(style)) {
      if (r.kind === 'font') font(r.ref, base, `@font-face in index.html's <style> ${k + 1}`);
      if (r.kind !== 'import') continue;
      const target = fileOf(resolveAppPath(r.ref, base), r.ref, `@import in index.html's <style> ${k + 1}`);
      if (target !== null) walkCss(target);
    }
  });
  facts.scripts.forEach((script, k) => {
    if (!isJavaScriptType(script.type)) return;
    if (script.src !== null) {
      const target = fileOf(resolveAppPath(script.src, base), script.src, "index.html's <script src>");
      if (target === null) return;
      if (script.type === 'module') walkModule(target);
      else add(target);
    } else if (script.type === 'module') {
      for (const specifier of sourceImports(script.text)) {
        const target = fileOf(resolveModule(specifier, INDEX_HTML, map, base), specifier, `imported by index.html's inline module script ${k + 1}`);
        if (target !== null) walkModule(target);
      }
    }
  });

  // Later: what the import() calls reach, from every first-load script and module, then each inline script.
  const later: string[] = [];
  const laterMissing: LoadMiss[] = [];
  const computed: string[] = [];
  const laterFile = (target: string | null, ref: string, where: string): string | null => {
    if (target !== null && files.has(target)) return target;
    laterMissing.push({ ref, where });
    return null;
  };
  const dynamicFrom = (code: string, from: string, where: string): void => {
    for (const specifier of dynamicImports(code)) {
      if (specifier === null) {
        computed.push(where);
        continue;
      }
      const target = laterFile(resolveModule(specifier, from, map, base), specifier, `import() in ${where}`);
      if (target !== null) walkLater(target);
    }
  };
  const walkLater = (path: string): void => {
    if (seen.has(path)) return;
    seen.add(path);
    later.push(path);
    if (!MODULE_NAME.test(path)) return;
    const code = textOf(path);
    for (const specifier of sourceImports(code)) {
      const target = laterFile(resolveModule(specifier, path, map, base), specifier, `imported by app/${path}`);
      if (target !== null) walkLater(target);
    }
    dynamicFrom(code, path, `app/${path}`);
  };
  for (const path of [...paths]) if (MODULE_NAME.test(path)) dynamicFrom(textOf(path), path, `app/${path}`);
  facts.scripts.forEach((script, k) => {
    if (script.src === null && isJavaScriptType(script.type)) dynamicFrom(script.text, INDEX_HTML, `index.html's inline script ${k + 1}`);
  });
  return { paths, missing, later, laterMissing, computed };
}

/** An absolute http(s) or ws(s) URL in source text: up to a space, quote, bracket, brace, backslash, $, comma or semicolon. */
const URL_IN_TEXT = /\b(?:https?|wss?):\/\/[^\s"'`<>()[\]{}\\^|$,;]+/gi;

/** One distinct URL the source names, with the source files naming it in path order. */
export interface SourceUrl {
  url: string;
  files: string[];
}

/**
 * Every distinct absolute http://, https://, ws:// or wss:// URL the source files name, in code-unit order, each with
 * the files naming it (in the order `sources` gives them). A URL runs to a space, quote, bracket, brace, backslash, $,
 * comma or semicolon, its trailing . : ! ? dropped.
 */
export function sourceUrls(sources: readonly AppSource[]): SourceUrl[] {
  const found = new Map<string, string[]>();
  for (const s of sources) {
    for (const m of text(s.bytes).matchAll(URL_IN_TEXT)) {
      const url = m[0].replace(/[.:!?]+$/, '');
      if (!/^[A-Za-z]+:\/\/[^/]/.test(url)) continue;
      const at = found.get(url);
      if (at === undefined) found.set(url, [s.path]);
      else if (at[at.length - 1] !== s.path) at.push(s.path);
    }
  }
  return [...found.keys()].sort(byCodeUnit).map((url) => ({ url, files: found.get(url)! }));
}

// ---------------------------------------------------------------- canonical JSON

/**
 * JSON with every object's keys in code-unit order and no whitespace: one spelling per value. Takes null, booleans,
 * finite numbers, strings, arrays and plain objects; throws TypeError on anything else (undefined, a function, a
 * bigint, NaN, Infinity, a class instance).
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`canonicalJson: ${value} is not a finite number`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError('canonicalJson: only plain objects and arrays');
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort(byCodeUnit)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(',')}}`;
  }
  throw new TypeError(`canonicalJson: a ${typeof value} has no JSON form`);
}

// ---------------------------------------------------------------- the dossier

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
/** contracts/dossier.ts DossierImageName. */
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

const opensWith = (bytes: Uint8Array, magic: readonly number[], at = 0): boolean => bytes.length >= at + magic.length && magic.every((b, i) => bytes[at + i] === b);

/** A file's extension, lowercased, for the Load block's asset counts ('(none)' when it has none). */
const extensionOf = (path: string): string => {
  const base = path.split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : '(none)';
};

/** One first-load file with its raw and gzip-9 sizes. */
export interface LoadFile {
  path: string;
  raw: number;
  gzip: number;
}

/** A URL as the Load block shows it: at most URL_SHOWN_CHARS characters, a longer one cut with an ellipsis. */
function shownUrl(url: string): string {
  const chars = [...url];
  return chars.length <= URL_SHOWN_CHARS ? url : `${chars.slice(0, URL_SHOWN_CHARS - 1).join('')}…`;
}

/** A load's lines: its heading with the totals, a line a file (FIRST_LOAD_LISTED listed, the rest summed), then its references naming no file of app/. */
function loadLines(heading: string, load: readonly LoadFile[], missing: readonly LoadMiss[], what: string): string[] {
  const raw = load.reduce((n, f) => n + f.raw, 0);
  const gzip = load.reduce((n, f) => n + f.gzip, 0);
  const lines = [`${heading}: ${load.length} file${load.length === 1 ? '' : 's'}, ${raw} bytes raw, ${gzip} bytes gzip-${GZIP_LEVEL}`];
  for (const f of load.slice(0, FIRST_LOAD_LISTED)) lines.push(`  app/${f.path}: ${f.raw} bytes raw, ${f.gzip} bytes gzip-${GZIP_LEVEL}`);
  if (load.length > FIRST_LOAD_LISTED) {
    const rest = load.slice(FIRST_LOAD_LISTED);
    lines.push(`  and ${rest.length} more file${rest.length === 1 ? '' : 's'}: ${rest.reduce((n, f) => n + f.raw, 0)} bytes raw, ${rest.reduce((n, f) => n + f.gzip, 0)} bytes gzip-${GZIP_LEVEL}`);
  }
  for (const m of missing.slice(0, MISSING_LISTED)) lines.push(`  not in app/: ${shownUrl(m.ref)} (${m.where})`);
  if (missing.length > MISSING_LISTED) lines.push(`  and ${missing.length - MISSING_LISTED} more ${what} reference${missing.length - MISSING_LISTED === 1 ? '' : 's'} not in app/`);
  return lines;
}

/** A load's totals as the `Totals:` line says them: `N files, G bytes gzip-9`, then ` (R raw)` when `raw`. */
function loadTotals(load: readonly LoadFile[], raw: boolean): string {
  const gzip = load.reduce((n, f) => n + f.gzip, 0);
  const rawText = raw ? ` (${load.reduce((n, f) => n + f.raw, 0)} raw)` : '';
  return `${load.length} file${load.length === 1 ? '' : 's'}, ${gzip} bytes gzip-${GZIP_LEVEL}${rawText}`;
}

/**
 * The `## Load` block's lines: the `Totals:` line (the first load's, what import() loads later and the whole app's, on
 * one line), the first load's files and totals, what import() loads later, the whole app by class, and the URLs in the
 * source.
 */
function loadBlockLines(tree: AppTree, load: LoadFile[], missing: readonly LoadMiss[], later: LoadFile[], laterMissing: readonly LoadMiss[], computed: readonly string[], urls: readonly SourceUrl[]): string[] {
  const source = tree.files.filter((f) => f.cls === 'source');
  const vendored = tree.files.filter((f) => f.cls === 'vendored');
  const assets = tree.files.filter((f) => f.cls === 'asset');
  const sum = (list: readonly AppFile[]): number => list.reduce((n, f) => n + f.bytes, 0);
  const totals = `Totals: first load ${loadTotals(load, true)}; later by import() ${loadTotals(later, false)}; whole app ${tree.files.length} file${tree.files.length === 1 ? '' : 's'}, ${tree.totalBytes} bytes`;
  const lines = ['## Load', '', totals, ...loadLines('First load', load, missing, 'first-load'), ...loadLines('Loaded later by import()', later, laterMissing, 'import()')];
  if (computed.length > 0) {
    lines.push(`  and ${computed.length} import() call${computed.length === 1 ? '' : 's'} of a computed specifier, not followed (the first in ${computed[0]!.startsWith('app/') ? '' : 'app/'}${computed[0]})`);
  }
  lines.push(`Whole app: ${tree.files.length} file${tree.files.length === 1 ? '' : 's'}, ${tree.totalBytes} bytes; ${tree.directories.length} director${tree.directories.length === 1 ? 'y' : 'ies'}`);
  lines.push(`Source files: ${source.length} (${sum(source)} bytes)`);
  lines.push(`Vendored files: ${vendored.length} (${sum(vendored)} bytes)`);
  if (vendored.length > 0) {
    const listed = vendored.slice(0, VENDORED_LISTED).map((f) => `app/${f.path} (${f.bytes} bytes)`);
    const more = vendored.length > VENDORED_LISTED ? `, and ${vendored.length - VENDORED_LISTED} more` : '';
    lines.push(`  ${listed.join(', ')}${more}`);
  }
  const byExt = new Map<string, { n: number; bytes: number }>();
  for (const f of assets) {
    const ext = extensionOf(f.path);
    const at = byExt.get(ext) ?? { n: 0, bytes: 0 };
    at.n++;
    at.bytes += f.bytes;
    byExt.set(ext, at);
  }
  const extText = [...byExt]
    .sort((a, b) => byCodeUnit(a[0], b[0]))
    .map(([ext, at]) => `${ext} ${at.n} (${at.bytes} bytes)`)
    .join(', ');
  lines.push(`Assets: ${extText === '' ? 'none' : extText}`);
  lines.push(`URLs in the source: ${urls.length}`);
  for (const u of urls.slice(0, URLS_LISTED)) {
    const more = u.files.length > 1 ? ` and ${u.files.length - 1} more file${u.files.length === 2 ? '' : 's'}` : '';
    lines.push(`  ${shownUrl(u.url)} (app/${u.files[0]}${more})`);
  }
  if (urls.length > URLS_LISTED) lines.push(`  and ${urls.length - URLS_LISTED} more`);
  return lines;
}

/** A distinct source as the dossier shows it. */
interface SourceCode {
  norm: Uint8Array;
  text: string;
  fence: string;
  /** The fenced block: the fence and its language, the text (a last LF added when it lacks one), the fence, a blank line. */
  block: string;
  blockBytes: number;
  lines: number;
}

/**
 * A source's section cut inside its text: its heading, its first k lines in its fence (closed), a line naming how
 * many of its lines are not shown, then `tail(hidden)` (the cut line, given the source bytes this file leaves out),
 * k the most lines (at least one, fewer than all) whose whole fits in `room` UTF-8 bytes; null when not one line
 * fits. It cuts only after a line's LF, which is never inside a UTF-8 sequence nor a replacement character's bytes,
 * so no character is split, and a line's shown bytes are those of its text.
 */
function sourceHead(heading: string, code: { norm: Uint8Array; text: string; fence: string }, language: string, room: number, tail: (hidden: number) => string): string | null {
  const total = lineCount(code.norm);
  const lines = code.text.split('\n');
  const open = `${code.fence}${language}\n`;
  const close = `${code.fence}\n\n`;
  const note = (k: number): string => `[${total - k} of this file's ${total} lines not shown.]\n`;
  const fixed = byteLength(heading) + byteLength(open) + byteLength(close);
  let best = 0;
  let shown = 0;
  let raw = 0;
  for (let k = 1; k < total; k++) {
    shown += byteLength(lines[k - 1]!) + 1;
    raw = code.norm.indexOf(0x0a, raw) + 1;
    if (fixed + shown + byteLength(note(k)) + byteLength(tail(code.norm.length - raw)) <= room) best = k;
  }
  if (best === 0) return null;
  let rawEnd = 0;
  for (let k = 0; k < best; k++) rawEnd = code.norm.indexOf(0x0a, rawEnd) + 1;
  const head = lines.slice(0, best).map((l) => `${l}\n`).join('');
  return `${heading}${open}${head}${close}${note(best)}${tail(code.norm.length - rawEnd)}`;
}

/**
 * The dossier (makefun/dossier/v1, contracts/dossier.ts) of an entry directory, as canonical JSON bytes: `dir/app/`'s
 * files and `dir/screenshots/`'s PNG and JPEG files (names starting with '.' skipped). `images` are the screenshots in
 * name order, the first the cover; `text` is the "## Load" block then "## Sources", as this file's header says. Throws
 * DossierError on an app tree it cannot read or one past a cap (readAppTree), a missing app/index.html, screenshots no
 * dossier can hold, a text cap that cannot hold the Load block and the cut line, or a dossier past DOSSIER_MAX_BYTES.
 */
export function buildDossier(dir: string, caps: DossierCaps): Uint8Array {
  const max = caps.text_max_bytes;
  if (!Number.isSafeInteger(max) || max <= 0) throw new DossierError(`buildDossier: caps.text_max_bytes must be a positive integer, not ${String(max)}`, 'text_max_bytes');
  // The binding screenshot caps, each with whose it is: the caller's when given and tighter, else the dossier's.
  let maxImages = { n: DOSSIER_MAX_IMAGES, whose: 'a dossier holds' };
  let maxImageBytes = { n: DOSSIER_MAX_BYTES, whose: 'a dossier holds' };
  if (caps.screenshots !== undefined) {
    const s = caps.screenshots as { max?: unknown; max_bytes?: unknown } | null;
    if (typeof s !== 'object' || s === null) throw new DossierError('buildDossier: caps.screenshots must be an object {max, max_bytes}');
    for (const k of ['max', 'max_bytes'] as const) {
      const v = s[k];
      if (typeof v !== 'number' || !Number.isSafeInteger(v) || v <= 0) throw new DossierError(`buildDossier: caps.screenshots.${k} must be a positive integer, not ${String(v)}`, `screenshots.${k}`);
    }
    if ((s.max as number) < maxImages.n) maxImages = { n: s.max as number, whose: 'caps.screenshots.max allows' };
    if ((s.max_bytes as number) < maxImageBytes.n) maxImageBytes = { n: s.max_bytes as number, whose: 'caps.screenshots.max_bytes allows' };
  }
  const appCaps: AppCaps = {};
  for (const k of ['app_max_files', 'app_max_bytes', 'app_path_max_bytes'] as const) {
    const v = caps[k] as unknown;
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw new DossierError(`buildDossier: caps.${k} must be a whole number, not ${String(v)}`, k);
    appCaps[k] = v;
  }

  const appDir = join(dir, 'app');
  const tree = readAppTree(appDir, appCaps);
  const htmlBytes = readIndexHtml(appDir, tree);
  const html = htmlFacts(text(htmlBytes));

  // Every file the walks read is read once, here, and kept by path.
  const fileBytes = new Map<string, Uint8Array>([[INDEX_HTML, htmlBytes]]);
  const bytesOf = (path: string): Uint8Array => {
    let b = fileBytes.get(path);
    if (b === undefined) {
      try {
        b = new Uint8Array(readFileSync(join(appDir, path)));
      } catch (err) {
        throw new DossierError(`buildDossier: app/${path}: cannot be read (${(err as Error).message})`);
      }
      fileBytes.set(path, b);
    }
    return b;
  };
  const sources: AppSource[] = tree.files.filter((f) => f.cls === 'source').map((f) => ({ path: f.path, bytes: bytesOf(f.path) }));
  const byPath = new Map(sources.map((s) => [s.path, s]));

  const firstLoad = firstLoadOf(tree, html, (path) => text(bytesOf(path)));
  const sized = (path: string): LoadFile => {
    const b = bytesOf(path);
    return { path, raw: b.length, gzip: gzipBytes(b) };
  };
  const load = firstLoad.paths.map(sized);
  const later = firstLoad.later.map(sized);
  const urls = sourceUrls(sources);

  const modules = importOrder(sources, html).filter((p) => p !== INDEX_HTML);
  const styles = cssOrder(sources, html).filter((p) => !modules.includes(p));
  const seen = new Set<string>([INDEX_HTML, ...modules, ...styles]);
  const rest = sources.map((s) => s.path).filter((p) => !seen.has(p)).sort(byCodeUnit);
  const order = [INDEX_HTML, ...modules, ...styles, ...rest];

  const codeOf = (path: string): SourceCode | null => {
    const file = byPath.get(path);
    if (file === undefined) return null;
    const t = text(file.bytes);
    const fence = fenceFor(t);
    const block = `${fence}${languageOf(path)}\n${t}${t.endsWith('\n') ? '' : '\n'}${fence}\n\n`;
    return { norm: file.bytes, text: t, fence, block, blockBytes: byteLength(block), lines: lineCount(file.bytes) };
  };

  const shotNames = (() => {
    const shotsDir = join(dir, 'screenshots');
    let shotDirStat;
    try {
      shotDirStat = lstatSync(shotsDir);
    } catch {
      throw new DossierError('buildDossier: no screenshots/ directory: an entry hands in 3 screenshots of its running app, the first by name the cover');
    }
    if (!shotDirStat.isDirectory()) throw new DossierError('buildDossier: screenshots is not a directory: an entry hands in 3 screenshots of its running app, the first by name the cover');
    try {
      return readdirSync(shotsDir, { withFileTypes: true })
        .filter((e) => e.isFile() && !e.name.startsWith('.'))
        .map((e) => e.name)
        .sort(byCodeUnit);
    } catch (err) {
      throw new DossierError(`buildDossier: screenshots/ cannot be read (${(err as Error).message})`);
    }
  })();
  if (shotNames.length === 0) throw new DossierError('buildDossier: screenshots/ holds no image: the first is the cover');
  if (shotNames.length > maxImages.n) throw new DossierError(`buildDossier: screenshots/ holds ${shotNames.length} files, over the ${maxImages.n} ${maxImages.whose}`, 'screenshots.max');
  const images = shotNames.map((name) => {
    if (!IMAGE_NAME.test(name)) throw new DossierError(`buildDossier: screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters, not starting with . or -`);
    const size = lstatSync(join(dir, 'screenshots', name)).size;
    if (size > maxImageBytes.n) throw new DossierError(`buildDossier: screenshots/${name} is ${size} bytes, over the ${maxImageBytes.n} ${maxImageBytes.whose}`, 'screenshots.max_bytes');
    const bytes = new Uint8Array(readFileSync(join(dir, 'screenshots', name)));
    if (bytes.length > maxImageBytes.n) throw new DossierError(`buildDossier: screenshots/${name} is ${bytes.length} bytes, over the ${maxImageBytes.n} ${maxImageBytes.whose}`, 'screenshots.max_bytes');
    const media_type = opensWith(bytes, PNG_MAGIC) ? 'image/png' : opensWith(bytes, JPEG_MAGIC) ? 'image/jpeg' : null;
    if (media_type === null) throw new DossierError(`buildDossier: screenshots/${name} is neither a PNG nor a JPEG`);
    return { name, media_type, sha256: sha256Hex(bytes), base64: Buffer.from(bytes).toString('base64') };
  });

  const head = [...loadBlockLines(tree, load, firstLoad.missing, later, firstLoad.laterMissing, firstLoad.computed, urls), '', '## Sources', '', ''].join('\n');
  const sections = order.map((path) => {
    const code = codeOf(path);
    const lines = code === null ? 0 : code.lines;
    const bytes = code === null ? 0 : code.norm.length;
    const heading = `### app/${path} (${bytes} bytes)\n\n`;
    const shown = lines === 0 ? null : code;
    return { heading, code: shown, size: byteLength(heading) + (shown === null ? 0 : shown.blockBytes), bytes };
  });
  // restBytes[k]: the source bytes of the files after section k.
  const restBytes = new Array<number>(sections.length + 1).fill(0);
  for (let k = sections.length - 1; k >= 0; k--) restBytes[k] = restBytes[k + 1]! + (k + 1 < sections.length ? sections[k + 1]!.bytes : 0);

  const cutLine = (files: number, bytes: number): string => `[Cut at ${max} bytes: ${files} file${files === 1 ? '' : 's'} and ${bytes} bytes of source left out.]\n`;
  let out = head;
  let used = byteLength(head);
  let kept = 0;
  for (; kept < sections.length; kept++) {
    const section = sections[kept]!;
    const restCount = sections.length - kept - 1;
    const tail = restCount === 0 ? 0 : byteLength(cutLine(restCount, restBytes[kept]!));
    if (used + section.size + tail > max) break;
    out += section.code === null ? section.heading : `${section.heading}${section.code.block}`;
    used += section.size;
  }
  if (kept < sections.length) {
    // The first source that does not fit whole: its head, up to its last complete line that fits, then nothing more.
    const first = sections[kept]!;
    const restCount = sections.length - kept - 1;
    const after = restBytes[kept]!;
    const part = first.code === null ? null : sourceHead(first.heading, first.code, languageOf(order[kept]!), max - used, (hidden) => cutLine(restCount, after + hidden));
    out += part ?? cutLine(restCount + 1, after + first.bytes);
  }
  if (byteLength(out) > max) throw new DossierError(`buildDossier: caps.text_max_bytes ${max} cannot hold even the Load block and the cut line`, 'text_max_bytes');

  const doc = { schema: DOSSIER_SCHEMA, cover: 0, text: out.replace(/\n+$/, '\n'), images };
  const bytes = Buffer.from(canonicalJson(doc), 'utf8');
  if (bytes.length > DOSSIER_MAX_BYTES) throw new DossierError(`buildDossier: the dossier is ${bytes.length} bytes, over the ${DOSSIER_MAX_BYTES} one holds`);
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length);
}

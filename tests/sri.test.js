// T1: bibliotecas locais com integridade conferida e nenhuma referência a CDN.
"use strict";
const { it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path");
const { check } = require("../tools/sri");
const ROOT = path.resolve(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

it("integrity das páginas e vendor/SHA384SUMS batem com os arquivos", () => {
  assert.deepEqual(check(false), []);
});
it("nenhuma página ou script aponta para outro host", () => {
  for (const f of ["index.html", "local-ia/index.html", "assets/ats.js", "assets/ats.css", "local-ia/ia.js", "vendor/fonts/fonts.css"])
    assert.doesNotMatch(read(f), /(src|href|url)\s*[=(]\s*["']?https?:/i, f);
});
it("as duas páginas têm a mesma CSP, sem unsafe-eval nem script inline", () => {
  const csp = f => (read(f).match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1];
  const a = csp("index.html");
  assert.ok(a, "CSP ausente");
  assert.equal(csp("local-ia/index.html"), a);
  assert.match(a, /script-src 'self';/);
  assert.doesNotMatch(a, /unsafe-eval|script-src[^;]*unsafe-inline/);
  for (const f of ["index.html", "local-ia/index.html"]) assert.doesNotMatch(read(f), /<script>(?!<\/script>)/, `${f}: script inline`);
});

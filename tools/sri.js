#!/usr/bin/env node
// Integridade (SRI) das bibliotecas em vendor/.
//   node tools/sri.js --write   grava integrity="sha384-..." nas páginas e vendor/SHA384SUMS
//   node tools/sri.js           só confere; sai com erro se algo não bate
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.resolve(__dirname, "..");
const PAGES = ["index.html", "local-ia/index.html"];
const sha384 = f => "sha384-" + crypto.createHash("sha384").update(fs.readFileSync(f)).digest("base64");

function vendorFiles(dir = path.join(ROOT, "vendor")) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? vendorFiles(p) : /\.(js|css|woff2)$/.test(e.name) ? [p] : [];
  }).sort();
}
function sums() {
  return vendorFiles().map(f => `${sha384(f)}  ${path.relative(ROOT, f).split(path.sep).join("/")}`).join("\n") + "\n";
}
// Cada <script src> e <link href> de vendor/ precisa de integrity igual ao hash do arquivo.
function fixPage(rel, write) {
  const file = path.join(ROOT, rel), dir = path.dirname(file);
  const html = fs.readFileSync(file, "utf8"), problems = [];
  const out = html.replace(/(<(?:script src|link rel="stylesheet" href)=")([^"]*vendor\/[^"]+)" integrity="([^"]*)"/g, (m, head, src, cur) => {
    const want = sha384(path.resolve(dir, src));
    if (cur !== want) problems.push(`${rel}: ${src} tem "${cur}", esperado "${want}"`);
    return `${head}${src}" integrity="${want}"`;
  });
  if (/<(?:script src|link rel="stylesheet" href)="[^"]*vendor\/[^"]+"(?! integrity)/.test(html)) problems.push(`${rel}: recurso de vendor/ sem integrity`);
  if (write && out !== html) fs.writeFileSync(file, out);
  return problems;
}
function check(write) {
  const problems = PAGES.flatMap(p => fixPage(p, write));
  const sumsFile = path.join(ROOT, "vendor/SHA384SUMS"), want = sums();
  const cur = fs.existsSync(sumsFile) ? fs.readFileSync(sumsFile, "utf8") : "";
  if (cur !== want) problems.push("vendor/SHA384SUMS desatualizado");
  if (write) fs.writeFileSync(sumsFile, want);
  return problems;
}
module.exports = { check, sha384 };
if (require.main === module) {
  const write = process.argv.includes("--write");
  const problems = check(write);
  if (write) console.log("SRI atualizado.");
  else if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  else console.log("SRI ok.");
}

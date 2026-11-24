// Utilitários dos testes: servidor estático, navegador e coleta de erros.
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const FIX = path.join(__dirname, "fixtures");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2", ".pdf": "application/pdf", ".json": "application/json" };

// Serve a raiz do repositório, como o GitHub Pages faria.
function staticServer() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const file = path.join(ROOT, path.normalize(p));
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, "127.0.0.1", () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}

async function launch() {
  // Sem proxy: os testes só falam com 127.0.0.1. Qualquer pedido para fora é um erro.
  return chromium.launch();
}

// Abre a página e registra erros de console, exceções, violações de CSP e pedidos a outros hosts.
async function openPage(browser, url) {
  const page = await browser.newPage();
  page.setDefaultTimeout(8000); // falha logo em vez de esperar 30 s por passo
  const errors = [], external = [];
  const origin = new URL(url).origin;
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", e =>
      console.error(`CSP: ${e.violatedDirective} bloqueou ${e.blockedURI || "(inline)"}`));
  });
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("request", r => { const u = r.url(); if (/^https?:/.test(u) && !u.startsWith(origin)) external.push(u); });
  page.on("requestfailed", r => errors.push(`falhou: ${r.url()} ${r.failure() && r.failure().errorText}`));
  await page.goto(url, { waitUntil: "load" });
  return { page, errors, external };
}

// Lê um arquivo de fixture dentro da página e devolve o doc já processado pelo leitor do site.
async function readFixture(page, name) {
  const b64 = fs.readFileSync(path.join(FIX, name)).toString("base64");
  return page.evaluate(async ({ b64, name }) => {
    const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    return name.endsWith(".pdf") ? readPdf(buf) : readDocx(buf);
  }, { b64, name });
}

module.exports = { ROOT, FIX, staticServer, launch, openPage, readFixture };

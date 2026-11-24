// As duas páginas de ponta a ponta: site estático e versão local (server.py + Ollama falso).
"use strict";
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http"), path = require("path"), net = require("net");
const { spawn } = require("child_process");
const { ROOT, FIX, staticServer, launch, openPage } = require("./helpers");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

// Fluxo comum: exemplo → aba sugerida → remover → enviar PDF e .docx pelo campo de arquivo.
async function commonFlow(url) {
  const { page, errors, external } = await openPage(browser, url);
  assert.equal(await page.textContent("#go"), "Analisar currículo");
  await page.click("#demo");
  await page.waitForSelector("#out .ring");
  await page.click("#tab-sug");
  const paper = await page.innerText("#sug-paper");
  assert.match(paper, /^MARIA EXEMPLO/);
  assert.match(paper, /EXPERIÊNCIA/);
  assert.equal(await page.isDisabled("#sug-dl"), false);
  // marcar uma palavra faltante redesenha a aba e mantém a escolha
  const kw = await page.getAttribute("#sug-side input[data-kw]", "data-kw");
  await page.click(`#sug-side input[data-kw="${kw}"]`);
  assert.equal(await page.isChecked(`#sug-side input[data-kw="${kw}"]`), true);
  // baixar o .docx sugerido
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#sug-dl")]);
  assert.match(dl.suggestedFilename(), /\.docx$/);
  // clearFile limpa a aba sugerida mesmo sem trocar de aba (setView já redesenharia)
  await page.evaluate(() => { clearFile(); });
  assert.equal(await page.innerHTML("#sug-paper"), "");
  assert.equal(await page.evaluate(() => sugSel.size), 0);
  await page.click("#tab-check");
  await page.click("#demo");
  await page.waitForSelector("#out .ring");
  // remover pelo botão limpa a aba sugerida
  await page.click("#fileclear");
  await page.click("#tab-sug");
  assert.equal(await page.innerHTML("#sug-paper"), "");
  assert.equal(await page.isDisabled("#sug-dl"), true);
  await page.click("#tab-check");
  for (const f of ["cv-duas-colunas.pdf", "cv.docx"]) {
    await page.setInputFiles("#file", path.join(FIX, f));
    await page.waitForFunction(n => document.getElementById("filename").textContent === n && document.querySelector("#out .ring"), f);
    assert.match(await page.textContent("#out pre.raw"), /JOÃO TESTE/, `${f}: texto extraído aparece no resultado`);
  }
  await page.click("#lang-en");
  assert.equal(await page.textContent("#go"), "Analyze resume");
  return { page, errors, external };
}

describe("site estático (index.html)", () => {
  let srv, url;
  before(async () => { ({ srv, url } = await staticServer()); });
  after(() => srv.close());
  it("funciona sem erros, sem IA e sem pedir nada a outros sites", async () => {
    const { page, errors, external } = await commonFlow(url + "/");
    assert.equal(await page.$("#ai-card"), null);
    assert.match(await page.textContent("#t-priv"), /browser/);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await page.close();
  });
  it("a página local também abre num servidor estático comum (caminhos relativos)", async () => {
    const { page, errors } = await openPage(browser, url + "/local-ia/index.html");
    await page.click("#demo");
    await page.waitForSelector("#ai-card");
    // sem server.py, /api/health falha; o resto da página não pode quebrar
    assert.deepEqual(errors.filter(e => !/api\/health|404/.test(e)), []);
    await page.close();
  });
});

describe("versão local (local-ia/server.py)", () => {
  let ollama, proc, base;
  const prompts = [];
  const freePort = () => new Promise(r => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
  before(async () => {
    // Ollama falso: responde /api/tags e /api/chat com um JSON fixo.
    ollama = http.createServer((req, res) => {
      let body = ""; req.on("data", c => body += c);
      req.on("end", () => {
        res.setHeader("Content-Type", "application/json");
        if (req.url === "/api/tags") return res.end(JSON.stringify({ models: [{ name: "qwen3:8b" }] }));
        prompts.push(JSON.parse(body));
        res.end(JSON.stringify({ message: { content: JSON.stringify({ summary: "Resumo de teste", improvements: [{ section: "Resumo", issue: "curto", suggestion: "detalhar" }], bullets: [], keywords: [{ term: "Python", where: "Habilidades" }] }) } }));
      });
    });
    await new Promise(r => ollama.listen(0, "127.0.0.1", r));
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    proc = spawn(process.env.PYTHON || "python3", [path.join(ROOT, "local-ia", "server.py")], {
      env: { ...process.env, PORT: String(port), OLLAMA_URL: `http://127.0.0.1:${ollama.address().port}`, QWEN_MODEL: "qwen3:8b" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (let i = 0; i < 100; i++) {
      try { await new Promise((ok, bad) => http.get(base + "/api/health", r => { r.resume(); ok(); }).on("error", bad)); return; }
      catch { await new Promise(r => setTimeout(r, 100)); }
    }
    throw new Error("server.py não subiu");
  });
  after(() => { proc.kill(); ollama.close(); });

  // http.get manda o caminho como está (fetch normalizaria "/../").
  const get = p => new Promise((resolve, reject) => http.get(base + "/", { path: p }, r => { r.resume(); r.on("end", () => resolve(r)); }).on("error", reject));
  it("serve só a lista de arquivos permitidos", async () => {
    for (const p of ["/", "/index.html", "/ia.js", "/assets/ats.js", "/vendor/pdfjs/pdf.worker.min.js", "/vendor/fonts/fonts.css"])
      assert.equal((await get(p)).statusCode, 200, p);
    for (const p of ["/server.py", "/README.md", "/local-ia/server.py", "/../index.html", "/assets/../local-ia/server.py", "/vendor/pdfjs/LICENSE", "/.git/config"])
      assert.equal((await get(p)).statusCode, 404, p);
    assert.equal((await get("/vendor/fonts/rubik-latin-500-normal.woff2")).headers["content-type"], "font/woff2");
  });
  it("Currículo sugerido e botão de IA funcionam juntos", async () => {
    const { page, errors, external } = await commonFlow(base + "/");
    assert.match(await page.textContent("#t-priv"), /Ollama/);
    await page.click("#lang-pt");
    await page.click("#demo");
    await page.click("#ai-go");
    await page.waitForSelector("#ai-body .ai-block");
    const ai = await page.innerText("#ai-body");
    assert.match(ai, /Resumo de teste/);
    assert.match(ai, /Python/);
    // server.py repassa ao Ollama no formato de chat, com o modelo configurado e sem raciocínio
    const sent = prompts.at(-1), prompt = sent.messages[0].content;
    assert.equal(sent.model, "qwen3:8b");
    assert.equal(sent.think, false);
    assert.match(prompt, /MARIA EXEMPLO/, "o texto do currículo vai no pedido");
    assert.match(prompt, /português do Brasil/);
    // trocar de aba e voltar não perde o resultado da IA
    await page.click("#tab-sug"); await page.click("#tab-check");
    assert.match(await page.innerText("#ai-body"), /Resumo de teste/);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await page.close();
  });
  it("Ollama fora do ar: mensagem clara, sem quebrar a página", async () => {
    const { page, errors } = await openPage(browser, base + "/");
    await page.route("**/api/health", r => r.fulfill({ json: { ok: false, model: "qwen3:8b", installed: false } }));
    await page.click("#demo");
    await page.click("#ai-go");
    await page.waitForSelector("#ai-body .err");
    assert.match(await page.innerText("#ai-body"), /Ollama não está rodando/);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

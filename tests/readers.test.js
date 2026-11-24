// Leitura de arquivos reais (fixtures) com pdf.js e mammoth, e o caminho completo até o .docx sugerido.
"use strict";
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { staticServer, launch, openPage, readFixture } = require("./helpers");
const { P } = require("./fixtures/make");

let srv, browser, page, pageErrors;
const docs = {};
before(async () => {
  const s = await staticServer(); srv = s.srv;
  browser = await launch();
  ({ page, errors: pageErrors } = await openPage(browser, s.url + "/"));
  for (const f of ["cv-uma-coluna.pdf", "cv-duas-colunas.pdf", "cv.docx"]) docs[f] = await readFixture(page, f);
});
after(async () => { await browser.close(); srv.close(); });
const suggest = doc => page.evaluate(d => buildSuggestion(d, "pt", []), doc);
const roleTitles = s => s.model.sections.find(x => x.h === "Experiência").blocks.filter(b => b.t === "role").map(b => b.r.title);
const expectedTitles = P.roles.map(r => `${r.title} | ${r.org}`);

describe("readPdf", () => {
  it("PDF de uma coluna: texto, seções e sem colunas", () => {
    const d = docs["cv-uma-coluna.pdf"];
    assert.equal(d.kind, "pdf");
    assert.equal(d.pages, 1);
    assert.equal(d.cols, false);
    for (const s of ["RESUMO", "EXPERIÊNCIA", "EDUCAÇÃO", "HABILIDADES", "IDIOMAS"]) assert.ok(d.lines.includes(s), `faltou ${s}`);
    assert.ok(d.text.includes("joao.teste@exemplo.com"));
    assert.ok(d.fontSize > 9 && d.fontSize < 16, `fonte ${d.fontSize}`);
  });
  it("PDF de duas colunas é detectado", () => {
    assert.equal(docs["cv-duas-colunas.pdf"].cols, true);
  });
  it("o worker do pdf.js roda sob a CSP, sem erros", () => {
    assert.deepEqual(pageErrors, []);
  });
});

describe("readDocx", () => {
  it("lê parágrafos e marca os tópicos do Word em rich", () => {
    const d = docs["cv.docx"];
    assert.equal(d.kind, "docx");
    assert.equal(d.tables, 0);
    assert.equal(d.liCount, 7);
    const bullets = d.rich.filter(x => x.b).map(x => x.t);
    assert.deepEqual(bullets, [...P.roles.flatMap(r => r.bullets), ...P.languages]);
    assert.equal(d.rich.find(x => x.t === "Resumo").b, false);
  });
});

describe("analyze + buildSuggestion com arquivos", () => {
  it("as três versões dão a mesma lista de palavras encontradas", async () => {
    const found = await page.evaluate(ds => ds.map(d => analyze(d, DEMO.pt.job, { market: "br" }).kw.list.filter(x => x.found).map(x => x.term).sort()),
      Object.values(docs));
    assert.deepEqual(found[1], found[0]);
    assert.deepEqual(found[2], found[0]);
  });
  it("duas colunas: a nota cai e a sugestão volta a uma coluna", async () => {
    const r = await page.evaluate(d => { const s = buildSuggestion(d, "pt", []);
      return { cols: analyze(d, "", {}).checks.find(c => c.id === "cols").status, before: analyze(d, "", {}).overall, after: analyze(s.synth, "", {}).overall }; },
      docs["cv-duas-colunas.pdf"]);
    assert.equal(r.cols, "fail");
    assert.ok(r.after > r.before, `${r.before} → ${r.after}`);
  });
  it(".docx: separa os dois cargos com datas e tópicos", async () => {
    const s = await suggest(docs["cv.docx"]);
    const roles = s.model.sections.find(x => x.h === "Experiência").blocks.map(b => b.r);
    assert.deepEqual(roles.map(r => r.title), expectedTitles);
    assert.deepEqual(roles.map(r => r.dates), P.roles.map(r => r.dates));
    assert.deepEqual(roles.map(r => r.bullets), P.roles.map(r => r.bullets));
    assert.equal(s.model.contact, "São Paulo, SP | +55 (11) 98765-4321 | joao.teste@exemplo.com | linkedin.com/in/joaoteste");
  });
  it("PDF: mantém todas as seções e o contato", async () => {
    for (const f of ["cv-uma-coluna.pdf", "cv-duas-colunas.pdf"]) {
      const s = await suggest(docs[f]);
      const heads = s.model.sections.map(x => x.h);
      for (const h of ["Resumo", "Habilidades", "Experiência", "Educação", "Idiomas"]) assert.ok(heads.includes(h), `${f}: faltou ${h}`);
      assert.match(s.model.contact, /\+55 \(11\) 98765-4321/);
      assert.equal(s.unplaced.length, 0, `${f}: sobrou texto fora do lugar`);
    }
  });
  it("o .docx sugerido abre de novo no leitor, sem colunas nem tabelas", async () => {
    const r = await page.evaluate(async d => {
      const s = buildSuggestion(d, "pt", []), blob = await tplDocx(s.model), back = await readDocx(await blob.arrayBuffer());
      return { size: blob.size, cols: back.cols, tables: back.tables, hasName: back.text.includes("JOÃO TESTE"), li: back.liCount };
    }, docs["cv-uma-coluna.pdf"]);
    assert.ok(r.size > 1000);
    assert.equal(r.tables, 0);
    assert.ok(r.hasName);
    assert.ok(r.li >= 5, "tópicos viram lista do Word");
  });

  // Problemas conhecidos (docs/MELHORIAS.md, item M8). Rodam e aparecem no relatório, mas não reprovam.
  it("PDF sem marcadores: o último tópico não vira título do cargo seguinte", { todo: "M8: parseRoles" }, async () => {
    const s = await suggest(docs["cv-uma-coluna.pdf"]);
    assert.deepEqual(roleTitles(s), expectedTitles);
  });
  it("certificações sem instituição não são emendadas em pares", { todo: "M8: pareamento de cursos" }, async () => {
    const s = await suggest(docs["cv-duas-colunas.pdf"]);
    const items = s.model.sections.find(x => /Cursos/.test(x.h)).blocks[0].items;
    assert.deepEqual(items, P.certs);
  });
});

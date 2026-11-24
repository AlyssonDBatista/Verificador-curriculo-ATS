// Motor de análise: extractKeywords, analyze e buildSuggestion, rodando no navegador.
"use strict";
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { staticServer, launch, openPage } = require("./helpers");

let srv, browser, page;
before(async () => {
  const s = await staticServer(); srv = s.srv;
  browser = await launch();
  ({ page } = await openPage(browser, s.url + "/"));
});
after(async () => { await browser.close(); srv.close(); });
const run = (fn, arg) => page.evaluate(fn, arg);
const statuses = a => Object.fromEntries(a.checks.map(c => [c.id, c.status]));

describe("extractKeywords", () => {
  it("acha habilidades conhecidas, com a grafia da vaga", async () => {
    const list = await run(() => extractKeywords("Buscamos analista com Power BI, SQL e Excel avançado. Experiência com SQL e ERP. Desejável KPI."));
    const byTerm = Object.fromEntries(list.map(x => [x.term, x]));
    for (const t of ["sql", "power bi", "excel avancado", "erp", "kpi"]) assert.ok(byTerm[t], `faltou ${t}`);
    assert.equal(byTerm["excel avancado"].display, "Excel avançado");
    assert.equal(byTerm["power bi"].display, "Power BI");
    assert.ok(byTerm.sql.weight > byTerm.erp.weight, "termo repetido pesa mais");
  });
  it("ignora palavras vazias e números", async () => {
    const terms = await run(() => extractKeywords("para para com com de de 2024 2024 sobre sobre uma uma").map(x => x.term));
    assert.deepEqual(terms, []);
  });
  it("aceita sigla que aparece uma vez só", async () => {
    const terms = await run(() => extractKeywords("Experiência em rotinas fiscais e entrega do SPED.").map(x => x.term));
    assert.ok(terms.includes("sped"));
  });
  it("devolve no máximo 30 termos, do mais pesado ao mais leve", async () => {
    const list = await run(() => extractKeywords(Array.from({ length: 60 }, (_, i) => `termo${i} termo${i}`).join(" ") + " SQL SQL SQL"));
    assert.ok(list.length <= 30);
    for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].weight >= list[i].weight);
  });
});

describe("analyze", () => {
  it("exemplo em português: aponta colunas, ícones e imagem", async () => {
    const r = await run(() => analyze(DEMO.pt.doc, DEMO.pt.job, { market: "br", segment: "financeiro" }));
    const st = statuses(r);
    assert.equal(st.cols, "fail");
    assert.equal(st.glyphs, "warn");
    assert.equal(st.images, "warn");
    assert.equal(st.sections, "pass");
    assert.equal(st.contact, "pass");
    assert.ok(r.overall >= 0 && r.overall <= 100);
    assert.equal(r.overall, Math.round(r.fmt * 0.65 + r.kw.pct * 0.35), "nota = 65% formato + 35% vaga");
  });
  it("palavras da vaga: encontradas e faltantes", async () => {
    const r = await run(() => analyze(DEMO.pt.doc, DEMO.pt.job, { market: "br" }));
    const found = r.kw.list.filter(x => x.found).map(x => x.term), miss = r.kw.list.filter(x => !x.found).map(x => x.term);
    for (const t of ["sql", "power bi", "excel"]) assert.ok(found.includes(t), `${t} deveria estar no currículo`);
    for (const t of ["python", "sap", "erp"]) assert.ok(miss.includes(t), `${t} não está no currículo`);
    assert.ok(r.kw.pct > 0 && r.kw.pct < 100);
  });
  it("sem vaga, a nota é só a de formato", async () => {
    const r = await run(() => analyze(DEMO.pt.doc, "", { market: "br" }));
    assert.equal(r.kw, null);
    assert.equal(r.overall, r.fmt);
  });
  it("arquivo sem texto (imagem) reprova a leitura", async () => {
    const r = await run(() => analyze({ text: "", cells: [], lines: [], cols: false, tables: 0, tableShare: 0, images: 1, pages: 1, fontSize: null, liCount: 0, kind: "pdf" }, "", {}));
    assert.equal(statuses(r).text, "fail");
  });
  it("tabela com muito texto reprova a estrutura", async () => {
    const r = await run(() => analyze({ ...DEMO.pt.doc, cols: null, tables: 2, tableShare: 0.6, kind: "docx" }, "", {}));
    assert.equal(statuses(r).cols, "fail");
  });
  it("modo internacional reprova dados pessoais", async () => {
    const st = await run(() => {
      const d = JSON.parse(JSON.stringify(DEMO.en.doc));
      d.text = d.text.replace("SUMMARY", "Date of birth: 01/02/1990\nMarital status: married\nCPF: 123.456.789-00\nSUMMARY");
      return Object.fromEntries(analyze(d, "", { market: "intl" }).checks.map(c => [c.id, c.status]));
    });
    assert.notEqual(st.personal, "pass");
  });
  it("todo item tem título e detalhe nos dois idiomas", async () => {
    const r = await run(() => analyze(DEMO.pt.doc, DEMO.pt.job, { market: "br" }));
    for (const c of r.checks) {
      for (const k of ["title", "detail"]) assert.ok(c[k].pt && c[k].en, `${c.id}.${k} sem pt/en`);
      if (c.fix) assert.ok(c.fix.pt && c.fix.en, `${c.id}.fix sem pt/en`);
    }
  });
});

describe("buildSuggestion", () => {
  it("reorganiza o exemplo em coluna única e melhora a nota", async () => {
    const s = await run(() => {
      const doc = JSON.parse(JSON.stringify(DEMO.pt.doc)), s = buildSuggestion(doc, "pt", []);
      return { heads: s.model.sections.map(x => x.h), name: s.model.name, contact: s.model.contact, text: s.synth.text, cols: s.synth.cols,
        before: analyze(doc, DEMO.pt.job, { market: "br" }).overall, after: analyze(s.synth, DEMO.pt.job, { market: "br" }).overall, changes: s.changes.map(c => c.pt) };
    });
    assert.deepEqual(s.heads.slice(0, 4), ["Resumo", "Habilidades", "Experiência", "Educação"]);
    assert.equal(s.name, "MARIA EXEMPLO");
    assert.equal(s.contact, "+55 (11) 91234-5678 | maria@exemplo.com");
    assert.equal(s.cols, false);
    assert.doesNotMatch(s.text, /\[(ícone|icon)\]/i, "ícones removidos");
    assert.ok(s.after > s.before, `nota deveria subir (${s.before} → ${s.after})`);
    assert.ok(s.changes.some(c => /colunas/.test(c)));
  });
  it("palavras escolhidas entram em Habilidades", async () => {
    const txt = await run(() => buildSuggestion(JSON.parse(JSON.stringify(DEMO.pt.doc)), "pt", ["SAP", "Python"]).synth.text);
    assert.match(txt, /SAP, Python/);
  });
  it("não inventa: o que falta vira campo [entre colchetes]", async () => {
    const s = await run(() => {
      const s = buildSuggestion({ text: "Fulano de Tal\nfulano@exemplo.com", cells: [], lines: ["Fulano de Tal", "fulano@exemplo.com"], cols: false, tables: 0, images: 0 }, "pt", []);
      return { contact: s.model.contact, text: s.synth.text, changes: s.changes.map(c => c.pt) };
    });
    assert.equal(s.contact, "fulano@exemplo.com | [Telefone com DDD]");
    assert.match(s.text, /\[Cargo desejado\]/);
    assert.ok(s.changes.some(c => /entre colchetes/.test(c)));
  });
  it("telefone vira +55 (DDD) em vários formatos", async () => {
    const out = await run(() => ["11 91234-5678", "(11)912345678", "+55 11 91234 5678", "11.91234.5678"].map(p =>
      buildSuggestion({ text: `Ana\n${p}`, cells: [], lines: ["Ana", p], cols: false, tables: 0, images: 0 }, "pt", []).model.contact.split(" | ")[0]));
    assert.deepEqual(out, Array(4).fill("+55 (11) 91234-5678"));
  });
  it("em inglês usa os títulos em inglês", async () => {
    const heads = await run(() => buildSuggestion(JSON.parse(JSON.stringify(DEMO.en.doc)), "en", []).model.sections.map(x => x.h));
    assert.deepEqual(heads.slice(0, 4), ["Summary", "Skills", "Experience", "Education"]);
  });
});

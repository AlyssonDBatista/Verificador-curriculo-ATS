#!/usr/bin/env node
// Gera os currículos de teste (dados fictícios): PDF de uma coluna, PDF de duas colunas e .docx.
// Uso: node tests/fixtures/make.js   (os arquivos gerados ficam versionados ao lado deste script)
"use strict";
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const docx = require("../../vendor/docx/index.umd.js");
const OUT = __dirname;

const P = {
  name: "JOÃO TESTE", headline: "Analista de Dados",
  contact: "São Paulo, SP | (11) 98765-4321 | joao.teste@exemplo.com | linkedin.com/in/joaoteste",
  summary: "Analista de dados com 4 anos de experiência em SQL, Python e Power BI, criando relatórios e indicadores para as áreas comercial e financeira.",
  roles: [
    { title: "Analista de Dados Pleno", org: "Empresa Alfa", dates: "03/2022 – Atual",
      bullets: ["Criei painéis em Power BI usados por 40 gestores.", "Automatizei rotinas de ETL em Python, reduzindo 6 horas por semana.", "Escrevi consultas SQL para o fechamento mensal."] },
    { title: "Assistente de BI", org: "Empresa Beta", dates: "01/2020 – 02/2022",
      bullets: ["Mantive relatórios em Excel avançado.", "Apoiei a migração de dados para o SAP."] },
  ],
  education: [{ title: "Bacharelado em Estatística", org: "Universidade Exemplo", dates: "2016 – 2019" }],
  skills: ["Ferramentas: SQL, Python, Power BI, Excel avançado", "Métodos: ETL, Scrum"],
  // a barra lateral do PDF de duas colunas lista uma habilidade por linha, como nos modelos do Canva
  sideSkills: ["SQL", "Python", "Power BI", "Excel avançado", "ETL", "Scrum", "Estatística aplicada", "Modelagem de dados"],
  certs: ["Microsoft PL-300 (2023)", "Scrum Foundation (2021)"],
  languages: ["Inglês: avançado", "Espanhol: intermediário"],
};
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const roleHtml = r => `<div class="role"><span><b>${esc(r.title)}</b> | ${esc(r.org)}</span><span class="d">${esc(r.dates)}</span></div>` +
  (r.bullets ? `<ul>${r.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : "");
const sec = (h, body) => `<h2>${h}</h2>${body}`;
const CSS = `body{font:10.5pt/1.35 "Liberation Sans",Arial,sans-serif;margin:0;color:#111}
h1{font-size:18pt;margin:0}h2{font-size:11pt;margin:14px 0 4px;border-bottom:1px solid #999}
.role{margin-top:6px;display:flex;justify-content:space-between;gap:8px}.role .d{white-space:nowrap}ul{margin:2px 0 0 18px;padding:0}p{margin:2px 0}`;
const main = () => sec("RESUMO", `<p>${esc(P.summary)}</p>`) + sec("EXPERIÊNCIA", P.roles.map(roleHtml).join("")) +
  sec("EDUCAÇÃO", P.education.map(roleHtml).join(""));
const list = a => a.map(s => `<p>${esc(s)}</p>`).join("");
const side = () => sec("HABILIDADES", list(P.skills)) + sec("IDIOMAS", list(P.languages));
const sidebar = () => sec("HABILIDADES", list(P.sideSkills)) + sec("IDIOMAS", list(P.languages)) + sec("CERTIFICAÇÕES", list(P.certs));
const header = `<h1>${P.name}</h1><p>${P.headline}</p><p>${esc(P.contact)}</p>`;

const oneCol = `<style>${CSS}</style><div style="padding:0">${header}${main()}${side()}</div>`;
// Duas colunas lado a lado, como os modelos do Canva: barra lateral à esquerda com habilidades,
// idiomas e certificações; experiência à direita.
const twoCol = `<style>${CSS}</style>${header}<div style="display:grid;grid-template-columns:30% 1fr;gap:28px"><div>${sidebar()}</div><div>${main()}</div></div>`;

async function pdfs() {
  const b = await chromium.launch(), page = await b.newPage();
  for (const [file, html] of [["cv-uma-coluna.pdf", oneCol], ["cv-duas-colunas.pdf", twoCol]]) {
    await page.setContent(html);
    await page.pdf({ path: path.join(OUT, file), format: "A4", margin: { top: "18mm", bottom: "18mm", left: "18mm", right: "18mm" } });
  }
  await b.close();
}

async function word() {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
  const H = t => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2 });
  const T = t => new Paragraph({ children: [new TextRun(t)] });
  const L = t => new Paragraph({ text: t, bullet: { level: 0 } });
  const children = [
    new Paragraph({ text: P.name, heading: HeadingLevel.HEADING_1 }), T(P.headline), T(P.contact),
    H("Resumo"), T(P.summary),
    H("Experiência"), ...P.roles.flatMap(r => [T(`${r.title} | ${r.org} | ${r.dates}`), ...r.bullets.map(L)]),
    H("Educação"), ...P.education.map(r => T(`${r.title} | ${r.org} | ${r.dates}`)),
    H("Habilidades"), ...P.skills.map(T),
    H("Idiomas"), ...P.languages.map(L),
  ];
  const d = new Document({ creator: "tests", sections: [{ children }] });
  fs.writeFileSync(path.join(OUT, "cv.docx"), await Packer.toBuffer(d));
}

module.exports = { P };
if (require.main === module) (async () => { await pdfs(); await word(); console.log("Fixtures geradas em", OUT); })();

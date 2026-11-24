# Bibliotecas e fontes de terceiros

Ficam no repositório para o site não depender de CDN: nada é baixado de outro site quando a página abre, e a política de segurança (CSP) das páginas bloqueia qualquer tentativa.

| Pasta | Pacote no npm | Versão | Licença | Para quê |
|---|---|---|---|---|
| `pdfjs/` | `pdfjs-dist` | 3.11.174 | Apache-2.0 | Ler PDF (`pdf.min.js` e o worker `pdf.worker.min.js`) |
| `mammoth/` | `mammoth` | 1.6.0 | BSD-2-Clause | Ler Word (.docx) |
| `docx/` | `docx` | 8.5.0 | MIT | Gerar o .docx dos modelos e do currículo sugerido |
| `fonts/` | `@fontsource/ibm-plex-sans`, `@fontsource/rubik` | 5.3.0 | OFL-1.1 | Fontes da interface (só latin e latin-ext, pesos 400, 500 e 600) |

Cada pasta tem o arquivo de licença original do pacote.

## Integridade

- As páginas carregam os scripts e o `fonts.css` com `integrity="sha384-..."`. Se o arquivo mudar, o navegador recusa.
- `SHA384SUMS` tem o hash de todos os arquivos, inclusive do worker do pdf.js (que o navegador carrega sem atributo `integrity`).
- `npm test` confere tudo isso antes de rodar os testes.

## Como atualizar

1. Troque as versões em `tools/vendor.sh` (e nesta tabela).
2. Rode `npm run vendor`: baixa os pacotes do npm, copia os arquivos e grava os novos hashes nas páginas.
3. Rode `npm test` e confira o diff.

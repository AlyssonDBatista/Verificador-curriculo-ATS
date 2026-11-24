# Testes

    npm install                          # só a primeira vez (instala o Playwright)
    npx playwright install chromium      # só a primeira vez
    npm test

Precisa de Node 22 ou mais novo e de Python 3 (para o teste de `local-ia/server.py`). Roda sem internet.

| Arquivo | O que testa |
|---|---|
| `engine.test.js` | `extractKeywords`, `analyze` e `buildSuggestion` com o exemplo e com casos pequenos |
| `readers.test.js` | `readPdf` e `readDocx` com os arquivos de `fixtures/`, a sugestão gerada a partir deles e a ida e volta pelo .docx |
| `pages.test.js` | As duas páginas no Chromium: exemplo, aba sugerida, envio de PDF e .docx, download; a versão local com `server.py` de verdade e um Ollama falso |
| `sri.test.js` | Hashes de `vendor/`, ausência de links para outros sites e a CSP |

Os testes de página falham se aparecer qualquer erro no console, violação de CSP ou pedido a outro host.

Testes marcados com `todo` mostram problemas conhecidos (item M8 de `docs/MELHORIAS.md`). Eles rodam e aparecem no relatório, mas não reprovam. Quando o problema for corrigido, tire o `todo`.

## Fixtures

`fixtures/` tem currículos fictícios gerados por `fixtures/make.js` (`npm run fixtures`): PDF de uma coluna, PDF de duas colunas (barra lateral, como nos modelos do Canva) e .docx com tópicos. O PDF é impresso pelo Chromium, que não escreve o marcador "•" como texto: é o caso "PDF sem marcadores".

Antes de publicar uma mudança no leitor, teste também com currículos reais (veja `docs/MELHORIAS.md`). Não coloque currículos reais no repositório sem tirar os dados pessoais.

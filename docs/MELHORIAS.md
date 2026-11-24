# Melhorias e novas utilidades para o Verificador ATS

Levantamento feito em 24/11/2026 com base em concorrentes e ferramentas parecidas. Este arquivo serve de briefing para o Claude Code: cada item tem prioridade, esforço e critério de aceite.

## Restrições do projeto (não quebrar)

- Site **estático** no GitHub Pages: sem servidor, sem banco, sem chave de API no código.
- Tudo roda **no navegador**. O arquivo do usuário nunca sai do computador dele. É o principal argumento de confiança do produto.
- Português do Brasil primeiro, com inglês completo (regras internacionais EUA/Canadá/Reino Unido).
- **Sem IA por padrão.** A IA (Qwen3 via Ollama) fica opcional, na pasta `local-ia/`.
- O currículo sugerido **não inventa conteúdo**: só reorganiza o que existe e mostra campos `[entre colchetes]`.
- Toda regra de ATS precisa ter fonte pública. Registrar em `docs/FONTES.md`, separando "fonte" de "escolha do projeto".
- O código comum fica em `assets/ats.js` e `assets/ats.css`, carregados pelas duas páginas. Veja o item T3 antes de crescer muito.

## Mapa do código atual (`assets/ats.js`)

| Parte | O que faz |
|---|---|
| `UI.pt` / `UI.en` | Todos os textos da interface |
| `analyze(doc, job, {market, segment})` | Verificações com peso (pass=1, warn=0.5, fail=0, info fora da nota) |
| `extractKeywords(job)`, `SKILLS`, `STOP` | Palavras-chave da vaga |
| `pdfGutter`, `pdfPageText`, `readPdf`, `readDocx` | Leitura de PDF (pdf.js 3.11.174) e Word (mammoth 1.6.0) |
| `TPL`, `buildTemplate`, `tplHtml/tplText/tplDocx` | Modelos por segmento e geração de .docx (docx 8.5.0) |
| `buildSuggestion`, `parseRoles`, `dateOf`, `secKey` | Aba "Currículo sugerido" |
| `renderResult`, `renderSug`, `setView` | Interface e abas |

## O que os concorrentes fazem

| Ferramenta | Destaques observados | O que isso sugere para nós |
|---|---|---|
| **Jobscan** | Relatório de compatibilidade com a vaga; 5 análises grátis; mais de 30 verificações em cinco categorias; separa habilidades técnicas e comportamentais; identifica o ATS da empresa a partir da vaga; permite excluir uma palavra irrelevante e recalcular; otimizador de LinkedIn, rastreador de vagas e carta de apresentação; versão para instituições | Separar tipos de palavra-chave, permitir ignorar termos, dar dicas por ATS, otimizar LinkedIn, vender para instituições |
| **Teal** | Nota 0–100 com 15+ verificações; extensão do Chrome para salvar vagas; rastreador de candidaturas; IA e correspondência por vaga ficam no plano pago | Rastreador leve de vagas no próprio navegador |
| **Resume Worded** | Nota geral sem precisar de vaga; foco na qualidade da escrita | Verificações de qualidade dos tópicos (verbos, números, repetição) |
| **Enhancv** | 27 verificações; nota baseada em quanto do conteúdo foi lido e nos problemas achados; cola a vaga para ver palavras que faltam | Mostrar "% do conteúdo lido" como indicador |
| **Rezi** | Modelos seguros para ATS e nota ao vivo enquanto edita; IA | Editor com nota em tempo real |
| **Kickresume** | Verificador ATS, IA de redação, compatibilidade de vagas | Idem |
| **Resume Matcher** (código aberto, Apache 2.0) | Compara currículo e vaga com modelo de linguagem; sugere palavras e reescritas | Referência para a camada opcional de IA |
| **Reactive Resume** (código aberto) | Gera PDF sem conta nem marca d'água; exporta e importa JSON versionável | Exportar PDF e JSON do currículo sugerido |
| **Verificadores em português** (TopCV BR, LoopCV, curriculo.vyva.tech, Enhancv PT-BR, WBM Gerador de Currículos ATS) | Alguns focam em Gupy; alguns analisam só no navegador; a maioria tem plano pago para a parte de IA | Nosso diferencial: grátis, privado, em português, com regras por segmento e currículo sugerido |

**Lacunas do mercado que podemos ocupar**
1. Ferramenta realmente gratuita e privada, em português, que **gera o arquivo corrigido** (a maioria só aponta problemas).
2. Regras por **segmento** (TI, saúde, arquitetura/engenharia, financeiro) com exigências brasileiras (CRF, CRM, CREA, CAU, CRC, SPED, ANVISA).
3. Validação em **modo internacional** (EUA/Canadá/Reino Unido) a partir de um currículo brasileiro.

## Backlog priorizado

Esforço: P = pequeno (até meio dia), M = médio (1 a 2 dias), G = grande (mais de 2 dias).

### Prioridade alta

**M1. Separar palavras-chave em técnicas e comportamentais, com opção de ignorar** (M)
Inspiração: Jobscan. Mostrar duas listas. Um botão "ignorar" em cada termo tira a palavra do cálculo e recalcula a nota da vaga.
Aceite: ignorar um termo muda a porcentagem na hora; a escolha vale para o currículo sugerido.

**M2. Sinônimos, plural e acentos em português** (M)
"relatório/relatórios", "analisar/análise", "BI/Business Intelligence", "PowerBI/Power BI", "ERP/SAP". Criar um mapa de equivalências em arquivo JSON separado (`data/sinonimos.json`) para a comunidade poder contribuir.
Aceite: vaga com "relatórios gerenciais" encontra "relatório gerencial" no currículo; testes cobrindo 20 pares.

**M3. Onde a palavra aparece** (P)
Diferenciar palavra só na lista de habilidades de palavra usada dentro das experiências. Mostrar no resultado: "SQL: em Habilidades e em 2 experiências".
Aceite: o relatório indica o local de cada palavra encontrada.

**M4. Qualidade dos tópicos** (M)
Inspiração: Resume Worded. Verificar: começa com verbo de ação, frases fracas ("responsável por", "ajudei em"), verbo repetido em vários tópicos, tópico longo demais, número ausente, tempo verbal (presente no cargo atual, passado nos anteriores).
Aceite: lista de tópicos com problema, cada um com a sugestão de correção; sem reescrever por conta própria.

**M5. Título da vaga x título do currículo** (P)
Jobscan trata correspondência de cargo como ponto de busca. Comparar o título da vaga (primeira linha ou campo novo) com o cargo/headline do currículo e com cargos anteriores.
Aceite: aviso quando o título da vaga não aparece em nenhum lugar do currículo.

**M6. Exportar o relatório** (P)
Botão "Baixar relatório" em PDF (impressão do navegador com CSS de impressão) e em texto.
Aceite: relatório legível em uma página A4, sem menus.

**M7. Currículo sugerido editável + PDF** (G)
Hoje só baixa .docx. Permitir editar cada seção na tela (contenteditable ou campos), recalcular a nota ao vivo e baixar também em **PDF com texto real** (fonte padrão, coluna única). Inspiração: Rezi e Reactive Resume.
Aceite: PDF gerado passa no próprio verificador com nota igual ou maior que o .docx.

**M8. Currículo sugerido: robustez do leitor** (M)
Casos já conhecidos: PDFs sem marcadores de tópico, traço entre datas perdido (glifo de ícone), seção repetida em duas páginas, formação sem datas. Montar uma **pasta de testes** com PDFs reais anonimizados (Enhancv, Canva, Word, Google Docs, LinkedIn, Gupy) e conferir a saída de `buildSuggestion`.
Aceite: 10 PDFs de modelos diferentes sem mistura de cargos e sem perda de seção.

**M9. OCR para PDF escaneado** (M)
Hoje o verificador só avisa que o arquivo é imagem. Oferecer "tentar ler com OCR" usando tesseract.js (em português), com aviso de que o ATS real não faria isso.
Aceite: PDF escaneado de teste gera texto e a nota; o aviso de "texto não selecionável" continua visível.

### Prioridade média

**M10. Dicas por ATS** (M)
Jobscan identifica o ATS da empresa. Aqui: campo opcional "sistema da vaga" (Gupy, Greenhouse, Lever, Workday, Taleo, Vagas.com, Solides, Kenoby, Recrutei) ou detecção por trecho do link colado. Mostrar dicas conhecidas de cada um.
Atenção: **cada dica precisa de fonte oficial** (central de ajuda do próprio sistema). Sem fonte, não entra.

**M11. Várias vagas, um currículo** (M)
Colar 2 a 5 vagas e ver ranking de compatibilidade, com as palavras que mais faltam no conjunto. Útil para quem envia o mesmo currículo para várias vagas.
Aceite: tabela com nota por vaga e lista de palavras comuns que faltam.

**M12. Histórico local e comparação de versões** (M)
Salvar no navegador (localStorage ou IndexedDB), só com consentimento, as últimas análises: nota, data, nome do arquivo (sem o conteúdo, ou conteúdo criptografado). Gráfico simples da evolução.
Aceite: botão "apagar tudo"; nada sai do navegador.

**M13. Rastreador de candidaturas leve** (G)
Inspiração: Teal. Lista local de vagas (empresa, link, data, status, versão do currículo usada). Exportar CSV.
Aceite: funciona offline; exporta e importa CSV.

**M14. Verificador de LinkedIn** (M)
Jobscan e Resume Worded oferecem. Colar texto do perfil (título, sobre, experiências) e checar palavras da vaga, tamanho do título, seção Sobre, habilidades.
Aceite: nota e lista de correções, mesmo estilo do currículo.

**M15. Linha do tempo e lacunas** (P)
Detectar lacunas entre cargos (mais de 6 meses), datas fora de ordem, sobreposição de experiências, data final antes da inicial.
Aceite: aviso com o par de datas envolvido.

**M16. Construtor por formulário** (G)
Formulário por seção que monta o currículo ATS do zero, com importação e exportação em JSON (Reactive Resume faz isso). Reaproveitar `TPL` e `buildSuggestion`.
Aceite: preencher o formulário e baixar .docx e PDF com nota igual ou maior que 85 no próprio verificador.

**M17. Mais segmentos** (M)
Direito, RH, marketing, vendas, educação, logística, engenharia de produção, enfermagem. Cada segmento precisa de verificações, modelo, dicas e fontes.

**M18. Dicionário de habilidades fora do código** (P)
Mover `SKILLS` e termos por segmento para `data/habilidades.json`, com contribuição via pull request.

### Prioridade baixa ou estratégica

**M19. IA opcional melhor** (G)
Manter o site estático sem IA. Para quem quiser, oferecer: (a) Ollama local (já existe em `local-ia/`), (b) chave de API do próprio usuário, guardada só no navegador, com aviso claro de que o texto vai para o provedor. Nunca embutir chave no código.

**M20. Versão para instituições** (G)
Jobscan vende para universidades e programas de carreira. Possível produto: marca branca, relatório em lote (sem enviar arquivos para servidor), LGPD. Só depois de validar demanda.

**M21. Landing pages e conteúdo** (M)
Páginas estáticas como "currículo ATS para TI", "currículo para Gupy", "currículo para vaga no exterior", com o verificador embutido. Metadados Open Graph, `sitemap.xml`, dados estruturados.

**M22. PWA e acessibilidade** (P)
Funcionar offline, instalável, modo escuro, navegação por teclado, contraste mínimo AA, leitor de tela nas notas e abas.

## Dívida técnica (fazer cedo)

**T1. Bibliotecas locais com SRI.** *(feito: `vendor/`, `tools/sri.js`, CSP nas duas páginas; as fontes também saíram do Google Fonts.)* pdf.js, mammoth e docx vêm de CDN. Copiar para o repositório (`vendor/`), usar `integrity` e uma política de segurança (CSP). Hoje o site depende de terceiros para funcionar e para a promessa de privacidade.

**T2. Testes automatizados.** *(feito: `tests/`, `npm test`, `.github/workflows/testes.yml`. Os testes marcados como `todo` mostram dois problemas do item M8 ainda abertos.)* Criar `tests/` com fixtures de PDF e Word e testes de `analyze`, `extractKeywords` e `buildSuggestion` (Node + pdfjs-dist; ou Playwright). Rodar no GitHub Actions a cada push. O método usado até aqui: extrair as linhas do PDF com pdf.js em Node e rodar o código no Chrome sem interface.

**T3. Separar o `index.html`.** Hoje passa de 1.100 linhas. Dividir em `css/`, `js/analyze.js`, `js/parse.js`, `js/suggest.js`, `js/ui.js`, `data/*.json`, sem etapa de build (módulos ES nativos).

**T4. Calibrar os pesos da nota.** Os pesos são escolha do projeto. Testar com 30 currículos reais e documentar o critério em `docs/FONTES.md`. Manter o aviso de que a nota é estimativa.

**T5. Internacionalização.** Mover `UI` para `i18n/pt.json` e `i18n/en.json`; abrir caminho para espanhol.

## Problemas conhecidos hoje

- PDFs gerados com fontes Type 3 fragmentam o texto. O verificador junta os trechos, mas pode errar em casos extremos.
- Em PDF de duas colunas, a ordem de leitura vem da ordem interna do arquivo; pode misturar colunas na sugestão. Conferir com os PDFs de teste (M8).
- Bullets sem marcador dependem de heurística (continuação de linha por letra minúscula ou palavra de ligação no fim).
- Formação sem datas vira lista simples, sem separar curso, instituição e período.
- A leitura do PDF para em 5 páginas.
- Data inicial sem final (cargo atual escrito sem "Atual") é mantida como está, de propósito.
- Ainda não há teste com Word com cabeçalho e rodapé, nem com caixas de texto.

## Ordem sugerida de trabalho

1. T1 e T2 (base segura).
2. M8 (robustez do leitor) e M2 (sinônimos), que melhoram a qualidade de tudo.
3. M1, M3, M5, M6 (ganhos rápidos de valor).
4. M7 (currículo sugerido editável com PDF).
5. M4, M15, M9.
6. M10 a M14, conforme o retorno dos usuários.

## Regras para o Claude Code ao implementar

- Ler `README.md`, `docs/FONTES.md` e este arquivo antes de começar.
- Não adicionar servidor, rastreamento, nem enviar dados do usuário para fora do navegador.
- Cada regra nova de ATS ou de segmento: fonte pública em `docs/FONTES.md`.
- Texto da interface sempre em PT e EN, no mesmo commit.
- Testar com o PDF real de duas colunas, com um PDF de coluna única e com um .docx antes de entregar.
- Mensagens de commit em português, curtas, dizendo o que mudou.

## Fontes consultadas

- Jobscan, verificador e relatório de compatibilidade: https://www.jobscan.co/resume-checker e https://jobscan.co/resume-scanner
- Jobscan, tutorial do relatório: https://jobscan.co/jobscan-tutorial
- Jobscan, versão para organizações: https://www.jobscan.co/organizations/ats-ready-resumes/
- Teal, comparação de verificadores: https://www.tealhq.com/post/best-ats-resume-checkers
- Resume Worded, comparação: https://resumeworded.com/compare
- Comparativo de ferramentas (VisualCV): https://www.visualcv.com/blog/best-ats-resume-checker-tools/
- Resume Matcher (código aberto): https://github.com/srbhr/Resume-Matcher
- Reactive Resume e outras opções abertas: https://dev.to/srbhr/5-open-source-resume-builders-thatll-help-get-you-hired-in-2026-1b92
- Verificador gratuito em português (TabNews): https://www.tabnews.com.br/alone/criei-uma-ferramenta-gratuita-que-analisa-seu-curriculo-como-os-sistemas-ats-das-empresas-fazem
- Como testar o currículo de graça (DIO): https://www.dio.me/en/articles/seu-curriculo-passa-pela-triagem-automatica-como-testar-de-graca-antes-de-se-candidatar-87a9e2cc49da
- LoopCV, verificador de palavras-chave no navegador: https://www.loopcv.pro/pt/tools/resume-keywords-checker/
- Kickresume, otimização para ATS: https://www.kickresume.com/pt/otimização-currículo/

Os recursos e preços dos concorrentes mudam com frequência. Conferir nos sites antes de usar qualquer comparação em material público.

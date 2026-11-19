# Verificador ATS

Site que mostra como um sistema de triagem de currículos (ATS) lê o seu currículo, o que ele não consegue ler e quais palavras-chave da vaga estão faltando. Funciona em português (regras para vagas no Brasil) e em inglês (regras para vagas no exterior).

**Tudo roda no navegador.** O arquivo do currículo não é enviado a nenhum servidor.

## O que faz

- Lê PDF e Word (.docx) e extrai o texto como um sistema simples faria.
- Dá uma nota de 0 a 100 de legibilidade e aderência, com a lista de problemas e como corrigir cada um.
- Compara o currículo com a descrição de uma vaga (palavras-chave encontradas e faltantes).
- Verificações por segmento: TI e dados, saúde e farmácia, arquitetura e engenharia, financeiro e controladoria.
- Modo internacional (EUA, Canadá, Reino Unido): dados pessoais, tamanho e datas.
- Modelos de currículo em coluna única por segmento, para baixar em .docx.

## Como usar

Abra o site publicado no GitHub Pages, ou rode localmente:

    python3 -m http.server 8000

e acesse http://localhost:8000. A página carrega o leitor de PDF/Word e as fontes de CDNs, então precisa de internet.

## Sugestões com IA (opcional, local)

A pasta [`local-ia/`](local-ia/) tem uma versão que gera sugestões de reescrita com o **Qwen3** rodando no seu computador via [Ollama](https://ollama.com). Nada sai da sua máquina. Veja [`local-ia/README.md`](local-ia/README.md).

O site publicado não tem IA, porque o GitHub Pages hospeda só arquivos estáticos.

## Como as regras foram definidas

As regras seguem documentação de plataformas (Gupy e Greenhouse) e guias e pesquisas de mercado. Os pesos da nota e as listas de termos por segmento são escolhas do projeto. Veja [`docs/FONTES.md`](docs/FONTES.md) para o que tem fonte e o que não tem.

**A nota é uma estimativa, não uma garantia de aprovação.** Cada empresa configura seu ATS de um jeito, e a maioria dos sistemas não elimina currículos sozinha: o recrutador busca por palavras-chave.

## Licença

MIT. Veja [`LICENSE`](LICENSE).

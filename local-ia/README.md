# Verificador ATS (versão local com Qwen3)

Tudo roda no seu computador: a leitura do currículo, as verificações e a IA.
O conteúdo do currículo não é enviado a nenhum servidor externo.

## O que você precisa

1. **Python 3** (python.org). Se você já usa Python, já tem.
2. **Ollama** (ollama.com/download), o programa que roda o Qwen3 no seu computador.
3. Não precisa de internet depois de baixar o projeto e o modelo: o leitor de PDF/Word e as fontes vêm junto, em `../vendor/`.

## Instalação (uma vez)

Abra o terminal (Prompt de Comando ou PowerShell no Windows) e baixe o modelo:

    ollama pull qwen3:8b

São cerca de 5,2 GB. Deixe o aplicativo Ollama aberto.

## Para usar

Baixe o repositório inteiro, não só esta pasta: a página usa o motor comum em `../assets/` (`ats.js` e `ats.css`), o mesmo do site publicado. O servidor só entrega estes arquivos e as rotas `/api/health` e `/api/chat`; a parte de IA fica em `ia.js`.

- **Windows:** dê dois cliques em `iniciar.bat`.
- **Mac ou Linux:** rode `sh iniciar.sh`.
- **Manual:** na pasta, rode `python server.py` e abra http://localhost:8000

Para parar, feche a janela ou aperte Ctrl+C.

## Qual modelo usar

Troque o modelo com a variável `QWEN_MODEL` (no `iniciar.bat` ou `iniciar.sh`, ou no terminal).
Tamanhos de download conforme a biblioteca do Ollama:

| Modelo | Download | Memória sugerida (fontes da comunidade) |
|---|---|---|
| qwen3:4b | 2,5 GB | 4 a 6 GB |
| **qwen3:8b** (padrão) | 5,2 GB | 6 a 8 GB |
| qwen3:14b | 9,3 GB | 10 a 12 GB |
| qwen3:30b | 19 GB | 20 GB ou mais |
| qwen3:32b | 20 GB | 20 a 24 GB |

Modelos maiores dão sugestões melhores, mas respondem mais devagar. Sem placa de vídeo,
a resposta pode levar alguns minutos. Exemplo no terminal (Windows):

    set QWEN_MODEL=qwen3:14b
    python server.py

## Problemas comuns

- **"O Ollama não está rodando":** abra o aplicativo Ollama e tente de novo.
- **"O modelo ainda não foi baixado":** rode o `ollama pull` do modelo indicado na mensagem.
- **Demora muito:** use um modelo menor (`qwen3:4b`) ou feche outros programas pesados.
- **Porta 8000 ocupada:** rode com outra porta, por exemplo `set PORT=8010` antes do `python server.py`.
- **PDF ou Word não abre:** confira se o PDF não tem senha e se a pasta `vendor/` do projeto está completa.

## Observações

- O servidor só aceita conexões deste computador (127.0.0.1). Outras pessoas na sua rede não acessam.
- A IA reescreve usando apenas o que já está no currículo, mas **pode errar**. Revise tudo antes de usar.
- As regras de verificação são convenções de mercado (Gupy, Greenhouse e guias de recrutamento). A nota é uma estimativa.
- O Qwen3 tem licença Apache 2.0.

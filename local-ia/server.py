#!/usr/bin/env python3
"""Servidor local do Verificador ATS.

Serve a página (index.html) e liga o botão "Gerar sugestões com IA" ao Ollama,
que roda o Qwen3 no seu computador. Só usa a biblioteca padrão do Python.

Variáveis opcionais:
  QWEN_MODEL   modelo do Ollama (padrão: qwen3:8b)
  OLLAMA_URL   endereço do Ollama (padrão: http://127.0.0.1:11434)
  PORT         porta do site (padrão: 8000)
"""
import json
import os
import re
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
# Únicos arquivos servidos. CSS e JS comuns ficam em ../assets (os mesmos do site estático);
# a página pede "../assets/...", que o navegador resolve para "/assets/...".
STATIC_FILES = {
    "/": (os.path.join(HERE, "index.html"), "text/html; charset=utf-8"),
    "/index.html": (os.path.join(HERE, "index.html"), "text/html; charset=utf-8"),
    "/ia.js": (os.path.join(HERE, "ia.js"), "text/javascript; charset=utf-8"),
    "/assets/ats.js": (os.path.join(ROOT, "assets", "ats.js"), "text/javascript; charset=utf-8"),
    "/assets/ats.css": (os.path.join(ROOT, "assets", "ats.css"), "text/css; charset=utf-8"),
}
OLLAMA = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
MODEL = os.environ.get("QWEN_MODEL", "qwen3:8b")
PORT = int(os.environ.get("PORT", "8000"))
MAX_BODY = 200_000          # bytes aceitos por pedido
GEN_TIMEOUT = 900           # segundos de espera pela resposta do modelo


def ollama_get(path, timeout=3):
    with urllib.request.urlopen(OLLAMA + path, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def ollama_chat(prompt):
    body = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "think": False,        # Qwen3: responde direto, sem bloco de raciocínio
        "format": "json",      # força uma resposta em JSON válido
        "options": {"temperature": 0.3, "num_ctx": 8192},
    }).encode("utf-8")
    req = urllib.request.Request(OLLAMA + "/api/chat", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=GEN_TIMEOUT) as r:
        data = json.loads(r.read().decode("utf-8"))
    text = (data.get("message") or {}).get("content", "")
    # versões antigas do Ollama podem devolver o raciocínio dentro de <think>
    return re.sub(r"<think>.*?</think>", "", text, flags=re.S).strip()


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/health":
            try:
                tags = ollama_get("/api/tags")
                names = [m.get("name", "") for m in tags.get("models", [])]
                installed = any(n == MODEL or n.split(":")[0] == MODEL and ":" not in MODEL for n in names)
                return self._send(200, {"ok": True, "model": MODEL, "installed": installed})
            except Exception:
                return self._send(200, {"ok": False, "model": MODEL, "installed": False})
        entry = STATIC_FILES.get(self.path.split("?")[0])
        if not entry:
            return self._send(404, {"error": "not found"})
        path, ctype = entry
        try:
            with open(path, "rb") as f:
                raw = f.read()
        except OSError:
            return self._send(404, {"error": f"arquivo ausente: {os.path.relpath(path, ROOT)}"})
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        if self.path.split("?")[0] != "/api/chat":
            return self._send(404, {"error": "not found"})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if n <= 0 or n > MAX_BODY:
                return self._send(413, {"error": "pedido vazio ou grande demais"})
            prompt = json.loads(self.rfile.read(n).decode("utf-8")).get("prompt", "")
            if not isinstance(prompt, str) or not prompt.strip():
                return self._send(400, {"error": "prompt vazio"})
            return self._send(200, {"text": ollama_chat(prompt)})
        except urllib.error.URLError:
            return self._send(502, {"error": "Não consegui falar com o Ollama. Ele está aberto?"})
        except Exception as e:  # noqa: BLE001
            return self._send(500, {"error": f"Erro ao gerar: {e}"})

    def log_message(self, fmt, *args):
        if "/api/" in (args[0] if args else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    # 127.0.0.1: só este computador acessa; ninguém na rede enxerga o site.
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Verificador ATS em http://localhost:{PORT}  (modelo: {MODEL})")
    print("Para parar: Ctrl+C")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass

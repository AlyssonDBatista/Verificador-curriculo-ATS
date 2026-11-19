#!/bin/sh
cd "$(dirname "$0")"
export QWEN_MODEL="${QWEN_MODEL:-qwen3:8b}"
(sleep 1; (open http://localhost:8000 || xdg-open http://localhost:8000) >/dev/null 2>&1) &
python3 server.py

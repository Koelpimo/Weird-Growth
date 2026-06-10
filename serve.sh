#!/usr/bin/env bash
# weird growth — lokaler server (nicht 8080, das nutzt ktalog)
PORT="${1:-3456}"
cd "$(dirname "$0")"
echo "weird growth → http://localhost:${PORT}"
exec python3 -m http.server "$PORT"

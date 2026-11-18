#!/usr/bin/env bash
# Gera dist/pixel-hotel.html: um único arquivo HTML com CSS, JS e Three.js embutidos.
# Uso: bash tools/build-single.sh   (requer Node/npx)
set -euo pipefail
cd "$(dirname "$0")/.."
npx --yes esbuild@0.24.0 js/main.js --bundle --minify --format=iife \
  --alias:three=./vendor/three.module.min.js --outfile=dist/.bundle.js --log-level=warning
python3 - <<'PY'
import re
html = open('index.html', encoding='utf-8').read()
css = open('css/style.css', encoding='utf-8').read()
js = open('dist/.bundle.js', encoding='utf-8').read().replace('</script', '<\\/script')
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '</style>')
html = re.sub(r'\s*<script type="importmap">.*?</script>', '', html, flags=re.S)
html = html.replace('<script type="module" src="js/main.js"></script>', '<script>\n' + js + '\n</script>')
open('dist/pixel-hotel.html', 'w', encoding='utf-8').write(html)
PY
rm -f dist/.bundle.js
ls -la dist/pixel-hotel.html

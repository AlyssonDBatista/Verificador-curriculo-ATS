#!/bin/sh
# Recria a pasta vendor/ a partir do registro do npm (versões fixas).
# Uso: sh tools/vendor.sh   — depois rode: node tools/sri.js --write
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"
npm pack --silent pdfjs-dist@3.11.174 mammoth@1.6.0 docx@8.5.0 @fontsource/ibm-plex-sans@5.3.0 @fontsource/rubik@5.3.0 >/dev/null
for f in *.tgz; do mkdir "${f%.tgz}"; tar -xzf "$f" -C "${f%.tgz}"; done

V="$ROOT/vendor"
rm -rf "$V/pdfjs" "$V/mammoth" "$V/docx" "$V/fonts"
mkdir -p "$V/pdfjs" "$V/mammoth" "$V/docx" "$V/fonts"
cp pdfjs-dist-3.11.174/package/build/pdf.min.js pdfjs-dist-3.11.174/package/build/pdf.worker.min.js pdfjs-dist-3.11.174/package/LICENSE "$V/pdfjs/"
cp mammoth-1.6.0/package/mammoth.browser.min.js mammoth-1.6.0/package/LICENSE "$V/mammoth/"
cp docx-8.5.0/package/build/index.umd.js docx-8.5.0/package/LICENSE "$V/docx/"

# Fontes: só latin e latin-ext, pesos 400/500/600, woff2.
CSS="$V/fonts/fonts.css"
echo "/* IBM Plex Sans e Rubik (Fontsource 5.3.0, licença OFL-1.1). Gerado por tools/vendor.sh. */" > "$CSS"
for fam in ibm-plex-sans rubik; do
  pkg="fontsource-$fam-5.3.0/package"
  cp "$pkg/LICENSE" "$V/fonts/LICENSE-$fam"
  for w in 400 500 600; do
    for sub in latin-ext latin; do
      cp "$pkg/files/$fam-$sub-$w-normal.woff2" "$V/fonts/"
      # copia o bloco @font-face do subconjunto, sem o .woff (só woff2)
      awk -v id="/* $fam-$sub-$w-normal */" '$0==id{p=1} p{print} p&&/^}/{exit}' "$pkg/$w.css" \
        | sed -e "s#url(./files/\([^)]*\.woff2\)) format('woff2'), url([^)]*) format('woff')#url(\1) format('woff2')#" >> "$CSS"
    done
  done
done
echo "vendor/ atualizado."

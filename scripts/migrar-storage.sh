#!/usr/bin/env bash
# Copia las imágenes de fincas del bucket de Supabase Storage al contenedor de Azure Blob Storage.
# NO se ejecuta solo: lo corres tú, y con DRY_RUN=1 primero para ver qué copiaría.
#
# Requisitos: psql, curl y azcopy (https://aka.ms/downloadazcopy) con sesión iniciada (`azcopy login`)
# con el rol "Storage Blob Data Contributor" sobre la cuenta, o un SAS en AZ_DEST.
#
# Se copian solo las imágenes que la base de origen referencia (Imagen.RutaStorage), conservando la misma
# ruta relativa (finca-{id}/{uuid}.webp), así no hay que cambiar nada en la base de datos.
#
# Uso:
#   export SRC_DB="postgresql://postgres:<contraseña>@db.<project-ref>.supabase.co:5432/postgres"
#   export SRC_PUBLIC_BASE="https://<project-ref>.supabase.co/storage/v1/object/public/fincas-imagenes"
#   export AZ_DEST="https://<cuenta>.blob.core.windows.net/fincas-imagenes"
#   DRY_RUN=1 ./scripts/migrar-storage.sh     # solo lista lo que copiaría
#   ./scripts/migrar-storage.sh               # copia de verdad
set -euo pipefail

: "${SRC_DB:?Define SRC_DB (cadena de conexión de la base de origen)}"
: "${SRC_PUBLIC_BASE:?Define SRC_PUBLIC_BASE (URL pública del bucket de origen, sin barra final)}"
: "${AZ_DEST:?Define AZ_DEST (URL del contenedor de destino, sin barra final)}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "1/3 Leyendo las rutas de imagen de la base de origen..."
psql "$SRC_DB" -At -c 'SELECT "RutaStorage" FROM public."Imagen" WHERE "RutaStorage" IS NOT NULL ORDER BY 1' > "$TMP/rutas.txt"
TOTAL="$(wc -l < "$TMP/rutas.txt" | tr -d ' ')"
echo "    $TOTAL imágenes referenciadas."

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "DRY_RUN=1: se copiaría lo siguiente a $AZ_DEST (no se descarga ni se sube nada):"
  cat "$TMP/rutas.txt"
  exit 0
fi

echo "2/3 Descargando desde el bucket de origen..."
while IFS= read -r ruta; do
  mkdir -p "$TMP/archivos/$(dirname "$ruta")"
  curl --fail --silent --show-error --location "$SRC_PUBLIC_BASE/$ruta" --output "$TMP/archivos/$ruta"
done < "$TMP/rutas.txt"

echo "3/3 Subiendo al contenedor de Azure con azcopy..."
# --overwrite=false: no pisa blobs que ya existan. El nombre lleva UUID, el contenido nunca cambia.
azcopy copy "$TMP/archivos/*" "$AZ_DEST" --recursive \
  --overwrite=false \
  --content-type "image/webp" \
  --cache-control "public, max-age=31536000, immutable"

echo "Listo. Verifica: azcopy list \"$AZ_DEST\" | wc -l   (debe ser $TOTAL)"

#!/usr/bin/env bash
# Diagnóstico del deploy de la Cloud Function parseMenu.
# Uso en Cloud Shell:  bash show-build-error.sh
PROJECT="${1:-app-evaluacion-restauran-98f83}"
REGION="us-central1"

echo "=== Estado de la función parseMenu ==="
gcloud functions describe parseMenu --gen2 --region="$REGION" --project="$PROJECT" \
  --format='value(state, stateMessages)' 2>&1 || echo "(no se pudo describir la función)"

echo
echo "=== Último build (últimas líneas) ==="
ID="$(gcloud builds list --region="$REGION" --project="$PROJECT" --limit=1 --format='value(id)' 2>/dev/null)"
echo "build id: $ID"
gcloud builds log "$ID" --region="$REGION" --project="$PROJECT" 2>&1 | tail -40

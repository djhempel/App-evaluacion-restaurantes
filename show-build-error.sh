#!/usr/bin/env bash
# Muestra el detalle del último build de Cloud Functions (para diagnosticar fallos).
# Uso en Cloud Shell:  bash show-build-error.sh
set -e

PROJECT="${1:-app-evaluacion-restauran-98f83}"
REGION="us-central1"

ID="$(gcloud builds list --region="$REGION" --project="$PROJECT" --limit=1 --format='value(id)')"
echo "▶ Último build: $ID"
echo "--------------------------------------------------"
gcloud builds log "$ID" --region="$REGION" --project="$PROJECT" 2>/dev/null | tail -45

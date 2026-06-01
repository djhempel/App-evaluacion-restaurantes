#!/usr/bin/env bash
# Otorga al service account de compilación el rol necesario para construir
# Cloud Functions de 2ª gen (arregla "missing permission on the build service account").
# Uso en Cloud Shell:  bash grant-build-permission.sh
set -e

PROJECT="${1:-app-evaluacion-restauran-98f83}"
NUM="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
SA="${NUM}-compute@developer.gserviceaccount.com"

echo "▶ Otorgando 'Cloud Build Builder' a $SA"
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${SA}" \
  --role="roles/cloudbuild.builds.builder"

echo "✅ Permiso otorgado. Ahora vuelve a correr:  bash deploy-functions.sh"

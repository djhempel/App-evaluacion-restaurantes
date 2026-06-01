#!/usr/bin/env bash
# Despliega solo las Cloud Functions (la app web se publica con GitHub Actions).
# Uso en Cloud Shell:  bash deploy-functions.sh
set -e

PROJECT="${1:-app-evaluacion-restauran-98f83}"

echo "▶ Desplegando functions en el proyecto: $PROJECT"
npx --yes firebase-tools@13 deploy --only functions --project "$PROJECT"
echo "✅ Listo. Prueba 'Leer carta automáticamente' en la app."

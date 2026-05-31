# 🍽️ Mis Restaurantes

App para **evaluar restaurantes plato por plato**, guardar tu historial con fotos
y ubicación, y compartir tus reseñas por link. Pensada como **PWA**: se abre desde
el navegador del celular, se puede **instalar en la pantalla de inicio** y se
comparte con un simple enlace.

## ✨ Funcionalidades

- **Login con Google** (un toque, sin contraseñas).
- **Evaluación ponderada** con los 6 criterios y sus pesos:
  | Criterio | Peso |
  |---|---|
  | 🥖 Pan, mantequilla u otros | 5% |
  | 🥗 Entrada | 20% |
  | 🍽️ Fondo | 30% |
  | 🍰 Postre | 20% |
  | 🏛️ Lugar | 10% |
  | 🤵 Atención | 15% |
  - Cada criterio se puntúa en **escala chilena de 1 a 7** y la app calcula la
    **nota final ponderada** (también de 1 a 7).
  - Cualquier criterio puede marcarse como **“No aplica”**: su peso se reparte
    proporcionalmente entre el resto (ideal para buffets / all-inclusive).
- **Fotos** del lugar y de los platos (se comprimen en el celular antes de subir).
- **Menús**: carga las fotos del menú al crear el restaurante y luego elige el
  plato que evaluaste.
- **Crear restaurantes** (cualquier usuario logueado puede hacerlo) con nombre,
  tipo de cocina, dirección, ubicación en mapa, fotos, menú y carta de platos.
- **Historial** buscable de tus evaluaciones.
- **Ranking** automático de restaurantes por nota promedio (tuyo o de todos).
- **Mapa** con todos los lugares visitados (OpenStreetMap, sin API key de pago).
- **Link público** por evaluación: compártela y se ve sin necesidad de login.
- **Precio por persona opcional** + cálculo de la **mejor relación calidad-precio**.
- **Wishlist** de restaurantes por visitar.
- **Estadísticas**: promedio por criterio, mejor experiencia, tipos de cocina, etc.

## 🧱 Stack

- **Vite + React + TypeScript** (PWA con `vite-plugin-pwa`)
- **Firebase**: Authentication (Google), Firestore (datos), Storage (fotos), Hosting
- **React Router** para la navegación
- **Leaflet + OpenStreetMap** para los mapas (gratis, sin tarjeta)

## 🚀 Puesta en marcha local

```bash
npm install
cp .env.example .env   # rellena con tus credenciales de Firebase (ver abajo)
npm run dev
```

La app queda en `http://localhost:5173`. Mientras no haya credenciales de Firebase,
verás una pantalla explicando qué falta.

## 🔥 Configurar Firebase (gratis)

1. Entra a <https://console.firebase.google.com> y crea un proyecto.
2. **Authentication** → *Get started* → pestaña *Sign-in method* → habilita
   **Google**.
3. **Firestore Database** → *Create database* → modo producción.
4. **Storage** → *Get started*.
5. **Project settings** (⚙️) → *Your apps* → ícono **Web (`</>`)** → registra una
   app y copia el objeto `firebaseConfig`. Lleva esos valores a tu `.env`:

   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=tu-proyecto
   VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

6. **Reglas de seguridad** (ya incluidas en este repo):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add        # elige tu proyecto
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

## 📲 Publicar sin terminal (recomendado, desde el celular)

¿No quieres usar la terminal? Sigue la guía **[PUBLICAR.md](./PUBLICAR.md)**: la app
se publica sola con **GitHub Actions** y solo tienes que configurar unos secretos
una vez desde el navegador.

## 📦 Build y despliegue manual (Firebase Hosting)

```bash
npm run build
firebase deploy --only hosting
```

Te dará una URL `https://tu-proyecto.web.app` que puedes **compartir por link** y
**instalar** desde el celular (en Chrome/Safari: *Agregar a pantalla de inicio*).

> Recuerda agregar tu dominio de hosting en **Authentication → Settings →
> Authorized domains** para que funcione el login con Google.

## 🗂️ Estructura

```
src/
  components/     Componentes reutilizables (mapa, fotos, puntuación, etc.)
  config/scoring.ts   Criterios, pesos y cálculo de la nota final
  contexts/       Contexto de autenticación
  lib/            Acceso a Firestore, Storage y utilidades
  pages/          Pantallas (Inicio, Evaluar, Restaurantes, Ranking, Mapa…)
  firebase.ts     Inicialización de Firebase
firestore.rules   Reglas de seguridad de la base de datos
storage.rules     Reglas de seguridad de las fotos
```

## 💡 Ideas para más adelante

- Recomendaciones “quiero volver / no volvería”.
- Comparador lado a lado de dos restaurantes.
- Exportar una evaluación a PDF o imagen para redes.
- Etiquetas/filtros por tipo de cocina y rango de precio.
- Invitar amigos a un grupo y ver un ranking compartido.

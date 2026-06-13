# 📲 Cómo publicar la app (desde el celular, sin terminal)

La app se publica sola con **GitHub Actions**: tú solo configuras unas cosas
**una vez** en el navegador y, de ahí en adelante, cada cambio se publica
automáticamente. No necesitas instalar nada ni usar la terminal.

Son 3 partes. Tómate 15-20 minutos la primera vez.

> 💡 Consejo: en el navegador del celular, en la consola de Firebase, activa
> **“Ver versión de escritorio”** (menú del navegador) si algún botón no aparece.

---

## Parte A · Crear el proyecto en Firebase (gratis)

Entra a **<https://console.firebase.google.com>** con tu cuenta de Google.

1. **Crea un proyecto** (botón “Agregar proyecto”). Ponle un nombre, ej:
   `mis-restaurantes`. Puedes desactivar Google Analytics, no es necesario.
2. **Activa el login con Google:**
   menú **Compilación → Authentication → Comenzar → pestaña “Sign-in method”**
   → toca **Google** → **Habilitar** → Guardar.
3. **Crea la base de datos:**
   menú **Compilación → Firestore Database → Crear base de datos** →
   elige **modo de producción** → selecciona una región (ej: `southamerica-east1`)
   → Listo. *(Las reglas de seguridad se suben solas después.)*
4. **Activa el almacenamiento de fotos:**
   menú **Compilación → Storage → Comenzar** → acepta → Listo.
5. **Registra la app web y copia las credenciales:**
   ícono de **engranaje ⚙️ → Configuración del proyecto** → baja hasta
   **“Tus apps”** → toca el ícono **web `</>`** → ponle un apodo → **Registrar app**.
   Verás un bloque `firebaseConfig` con 6 valores. **Anótalos**, los usarás en la
   Parte B:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
6. **Genera la “llave de servicio”** (para que GitHub pueda publicar por ti):
   **engranaje ⚙️ → Configuración del proyecto → pestaña “Cuentas de servicio”**
   → botón **“Generar nueva clave privada”** → se descarga un archivo **.json**.
   Guárdalo, lo necesitas en la Parte B. ⚠️ Es secreto: no lo compartas.

---

## Parte B · Cargar los secretos en GitHub

En el celular, abre el repositorio en **github.com**:
`djhempel/App-evaluacion-restaurantes`

Ve a **Settings (Configuración) → Secrets and variables → Actions →
botón “New repository secret”**. Crea **estos 7 secretos** (uno por uno),
con el nombre EXACTO en mayúsculas y el valor que copiaste:

| Nombre del secreto | Valor (de la Parte A) |
|---|---|
| `VITE_FIREBASE_API_KEY` | el `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | el `authDomain` (ej: `tu-proyecto.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | el `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | el `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | el `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | el `appId` |
| `FIREBASE_SERVICE_ACCOUNT` | **todo el contenido** del archivo `.json` que descargaste |

> Para el último: abre el archivo `.json`, **selecciona todo el texto** (desde la
> primera `{` hasta la última `}`) y pégalo completo como valor del secreto.

---

## Parte C · Publicar

1. En el repo, ve a la pestaña **Actions**.
2. Abre el flujo **“Publicar app (Firebase)”** (en la lista de la izquierda o en
   las ejecuciones recientes).
3. Si ves una ejecución anterior en rojo (falló por no tener los secretos aún),
   ábrela y toca **“Re-run jobs / Volver a ejecutar”**.
   Si no, toca **“Run workflow / Ejecutar flujo”**.
4. Espera 1-2 minutos a que aparezca el ✅ verde.

¡Listo! Tu app queda en:

```
https://TU-PROJECT-ID.web.app
```

(reemplaza `TU-PROJECT-ID` por tu `projectId`). Ese es el link que **compartes** y
que puedes **“Agregar a la pantalla de inicio”** en el celular para que funcione
como una app.

---

## De ahí en adelante

Cada vez que cambiemos algo en el código, la app se vuelve a publicar **sola**.
Si alguna vez quieres forzar una publicación, entra a **Actions → Publicar app
→ Run workflow**.

## ¿Problemas?

- **El login con Google no abre:** en Firebase → **Authentication → Settings →
  Dominios autorizados**, verifica que esté `tu-proyecto.web.app`
  (normalmente se agrega solo).
- **La acción falla en rojo:** abre la ejecución en Actions y mira el paso que
  falló. Casi siempre es un secreto mal copiado (revisa nombres y valores).

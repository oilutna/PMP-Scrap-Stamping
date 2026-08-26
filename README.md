# PE Scrap Control Tower

App Next.js que lee los datos de scrap directamente de tu Google Sheet (pestaña
"Dashboard") y los muestra en KPIs, gráficas (costo por turno, por área, top 10
razones, tendencia semanal) y tablas de ranking, con filtros tipo segmentador de
Power BI (semana, turno, área, departamento, modelo).

## 1. Preparar Google Cloud (cuenta de servicio)

1. Ve a https://console.cloud.google.com/ y crea un proyecto (o usa uno existente).
2. En "APIs y servicios" → "Biblioteca", busca **Google Sheets API** y habilítala.
3. Ve a "APIs y servicios" → "Credenciales" → "Crear credenciales" → **Cuenta de servicio**.
4. Dale un nombre (ej. `scrap-dashboard-reader`) y créala. No necesita roles adicionales.
5. Entra a la cuenta de servicio creada → pestaña "Claves" → "Agregar clave" → **Crear
   clave nueva** → tipo **JSON**. Se descargará un archivo `.json`.
6. Abre ese archivo. Necesitas dos valores:
   - `client_email` → es tu `GOOGLE_CLIENT_EMAIL`
   - `private_key` → es tu `GOOGLE_PRIVATE_KEY` (incluye los `\n`, cópialo tal cual)

## 2. Compartir el Google Sheet

1. Abre tu Google Sheet.
2. Clic en "Compartir".
3. Pega el `client_email` de la cuenta de servicio (termina en
   `...iam.gserviceaccount.com`) y dale acceso de **Lector**.

## 3. Obtener el ID del Sheet

En la URL de tu hoja:
```
https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
```

## 4. Configurar variables de entorno

Copia `.env.example` a `.env.local` y llena los cuatro valores:

```
GOOGLE_SHEET_ID=el_id_de_tu_hoja
GOOGLE_SHEET_TAB=Dashboard
GOOGLE_CLIENT_EMAIL=tu-cuenta@tu-proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

## 5. Probar localmente (opcional)

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## 6. Subir a GitHub

```bash
git init
git add .
git commit -m "Dashboard de scrap"
```

Crea un repo nuevo en GitHub y súbelo:

```bash
git remote add origin https://github.com/TU_USUARIO/scrap-dashboard.git
git branch -M main
git push -u origin main
```

## 7. Desplegar en Vercel

1. Entra a https://vercel.com/new e importa el repositorio de GitHub.
2. Antes de darle "Deploy", abre **Environment Variables** y agrega las mismas
   cuatro variables de `.env.local` (`GOOGLE_SHEET_ID`, `GOOGLE_SHEET_TAB`,
   `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`).
   - Importante: pega `GOOGLE_PRIVATE_KEY` completa, con los `\n` incluidos.
3. Clic en **Deploy**.

Cada vez que hagas `git push`, Vercel vuelve a desplegar automáticamente.

## Notas

- Los datos se leen en cada carga de página (no se guardan en caché), así que
  siempre reflejan lo último en el Sheet.
- Si agregas o quitas columnas en el Sheet, el dashboard las detecta automáticamente
  por nombre de encabezado — pero la tabla en `app/page.js` solo muestra las columnas
  que se listaron explícitamente ahí.

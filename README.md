# 🎓 Sistema de Gestión y Disponibilidad de Aulas | React + Netlify + Google Sheets

Aplicación web moderna desarrollada en **React (Vite)** para la consulta interactiva de disponibilidad de aulas, programación de reservas académicas, sincronización en tiempo real con **Google Sheets API** e importación de archivos Excel (`.xls`, `.xlsx`, `.csv`).

Diseñada con estética **Glassmorphism Dark**, optimizada para rendimiento y lista para ser desplegada en **Netlify**.

---

## 🚀 Características Principales

- **⚡ React + Vite**: Componentes modulares, estado reactivo y renderizado veloz.
- **📊 Conexión con Google Sheets API**:
  - Compatible con enlaces públicos de Google Sheets (`/gviz/tq?tqx=out:csv`).
  - Compatible con Google Apps Script Web App (API JSON).
  - Sincronización automática periódica (cada 2, 5, 15 o 30 minutos).
  - Persistencia en `localStorage` para recordar la hoja y cargar datos al instante.
- **📁 Soporte para Archivos Excel Locales**:
  - Arrastra y suelta (Drag & Drop) o selecciona archivos `.xls`, `.xlsx` o `.csv` (como `Principal.xls`).
- **🗂️ 4 Vistas de Disponibilidad**:
  1. **Matriz de Disponibilidad**: Rejilla horaria completa con código de colores por facultad y detección de espacios libres vs ocupados.
  2. **Cronograma por Aula**: Tarjetas individuales por salón con barra y porcentaje de ocupación.
  3. **Lista de Reservas**: Tabla detallada con paginación y búsqueda.
  4. **Horario Profesor**: Horario semanal tipo cuadrícula (Lunes a Domingo) con exportación instantánea en **PDF**.
- **🔍 Filtros en Tiempo Real**:
  - Días de la semana (Lunes a Domingo o Todos los Días).
  - Fechas específicas con detección automática del día de la semana.
  - Bloques arquitectónicos (CO, E, J, M, LAB, etc.).
  - Búsqueda en tiempo real de Facultad, Salón/Aula, Profesor y Asignatura con botones de borrado instantáneo (✕).
  - Rango de horas personalizable.
- **📄 Exportación a PDF**: Descarga del horario docente con membrete y formato horizontal para impresión.

---

## 📋 Estructura de Columnas (Basada en `Principal.xls`)

El sistema detecta automáticamente las columnas por nombre de cabecera o por su posición numérica:

| Columna | Campo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| **Col B (1)** | `idMateria` | Código / ID de la asignatura | `MAT101`, `10492` |
| **Col L (11)** | `nroidenti` | Documento de identidad del docente | `1037645210` |
| **Col M (12)** | `profesor` | Nombre completo del profesor | `GARCIA PEREZ CARLOS` |
| **Col N (13)** | `dia` | Día de la semana | `LUNES`, `MARTES`... |
| **Col O (14)** | `horario` | Rango horario de la clase | `07:00 A 09:00`, `14:00-16:00` |
| **Col P (15)** | `aula` | Salón / Espacio asignado | `CO201`, `E1`, `LAB 1` |
| **Col Q (16)** | `facultad` | Facultad o unidad académica | `FACULTAD DE INGENIERÍA` |
| **Col R (17)** | `materia` | Nombre de la asignatura | `CÁLCULO DIFERENCIAL` |
| **Col S (18)** | `fecha` | Fecha de la reserva | `18/08/2026` |

---

## 🔗 Cómo Conectar Google Sheets

### Opción A: Enlace Público de Google Sheets (Más Rápido)
1. Abre tu hoja en **Google Sheets** con las columnas anteriores.
2. Haz clic en el botón verde **Compartir** (arriba a la derecha).
3. En *Acceso general*, selecciona **"Cualquier persona con el enlace"** (como Lector).
4. Copia el enlace (ej: `https://docs.google.com/spreadsheets/d/TU_ID_DE_HOJA/edit?usp=sharing`).
5. En la aplicación web, haz clic en **"Conectar Google Sheets"**, pega el enlace y presiona **Guardar y Sincronizar**.

### Opción B: Google Apps Script Web App (API JSON)
1. En tu Google Sheet, ve al menú **Extensiones > Apps Script**.
2. Pega el siguiente script:
   ```javascript
   function doGet() {
     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     var data = sheet.getDataRange().getValues();
     return ContentService.createTextOutput(JSON.stringify(data))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```
3. Haz clic en **Implementar > Nueva implementación**.
4. Selecciona tipo **Aplicación web**.
5. En *Quién tiene acceso*, elige **Cualquier persona** (Anyone).
6. Haz clic en **Implementar** y copia la URL proporcionada.
7. Pega esa URL en la aplicación web en **Conectar Google Sheets**.

---

## 🌐 Despliegue en Netlify

El proyecto ya incluye el archivo [`netlify.toml`](file:///c:/Users/servdocentes.apr/OneDrive%20-%20UCO/Im%C3%A1genes/proyectoX/gitHub/web-programaciones-uco/netlify.toml) preconfigurado.

### Pasos para desplegar:
1. Sube tu repositorio a GitHub (ej: `git add .`, `git commit -m "Migración a React"`, `git push`).
2. Entra a [Netlify](https://app.netlify.com/) e inicia sesión.
3. Haz clic en **"Add new site" > "Import an existing project"** y selecciona tu repositorio de GitHub `web-programaciones-uco`.
4. Netlify detectará automáticamente la configuración:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Haz clic en **"Deploy web-programaciones-uco"**.
6. ¡Listo! Tu aplicación estará en línea con HTTPS y actualización continua cada vez que hagas push.

---

## 💻 Ejecución Local

Para ejecutar la aplicación localmente en tu computadora:

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Construir para producción
npm run build
```

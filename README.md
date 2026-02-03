# Fuentmondo Manager 🏆

Fuentmondo Manager es una aplicación web avanzada para la gestión y visualización de ligas y copas personalizadas en la plataforma Futmondo. Esta herramienta permite a los administradores y participantes realizar un seguimiento exhaustivo de enfrentamientos, clasificaciones, sanciones y estadísticas históricas.

## 🚀 Funcionalidades Principales

- **Gestión de Competiciones**: Soporte para ligas regulares y torneos de eliminación directa (Copa).
- **Cuadro de Eliminatorias**: Visualización dinámica del bracket de la Copa Piraña con estilos premium.
- **Seguimiento de Sanciones**: Cálculo automático de sanciones por capitanía (3 veces capitán = 3 partidos fuera, 6 sin capitanía).
- **Detalle de Equipos**: Vista profunda de cada equipo, incluyendo su alineación, historial de puntos y estados de sanción.
- **Histórico de Capitanes**: Registro detallado de quién ha sido capitán en cada jornada para evitar repeticiones excesivas.
- **Diseño Premium**: Interfaz moderna basada en Glassmorphism con animaciones fluidas y modo oscuro.

## 🏁 Competiciones Disponibles

Actualmente, el sistema gestiona las siguientes competiciones:

1.  **Champions Fuentmondo (1ª Div)**: Liga principal de máxima categoría.
2.  **La Liga ML (2ª Div)**: Segunda división del campeonato.
3.  **COPA PIRAÑA**: El torneo del KO, con formato de eliminatorias desde 1/32 de final.

## 👥 Equipos Participantes

La aplicación incluye los escudos y datos de los equipos que forman parte de la comunidad Fuentmondo. Algunos de los equipos destacados son:

| Equipo | Escudo |
| :--- | :---: |
| **SICARIOS CF** | ![SICARIOS CF](public/escudos/SICARIOS CF.jpeg) |
| **AL-CARRER F.C.** | ![AL-CARRER F.C.](public/escudos/AL-CARRER F.C..jpeg) |
| **BANANEROS FC** | ![BANANEROS FC](public/escudos/BANANEROS FC.jpeg) |
| **CALAMARES CON TORRIJAS** | ![CALAMARES CON TORRIJAS](public/escudos/CALAMARES CON TORRIJAS🦑🍞.jpeg) |
| **CHARO LA PICANTA FC** | ![CHARO LA PICANTA FC](public/escudos/Charo la Picanta FC.jpeg) |
| **EL CHOLISMO FC** | ![EL CHOLISMO FC](public/escudos/EL CHOLISMO FC.jpeg) |
| **LA MARRANERA** | ![LA MARRANERA](public/escudos/LA MARRANERA.jpeg) |
| **LOS POKÉMON** | ![LOS POKÉMON](public/escudos/LOS POKÉMON 🟡🐭🟡.jpeg) |
| **MINABO DE KIEV** | ![MINABO DE KIEV](public/escudos/Minabo De Kiev.jpeg) |
| **QUE BARBARIDAD FC** | ![QUE BARBARIDAD FC](public/escudos/QUE BARBARIDAD FC.jpeg) |
| **SAMBA ROVINHA** | ![SAMBA ROVINHA](public/escudos/Samba Rovinha 🇧🇷.jpeg) |
| **THE LIONS** | ![THE LIONS](public/escudos/THE LIONS.jpeg) |

*(Y muchos más hasta completar los 44 equipos del ecosistema)*

## 🛠️ Instrucciones de Ejecución

Para ejecutar este proyecto en tu entorno local, sigue estos pasos:

### Pre-requisitos
- Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).
- Un gestor de paquetes como `npm`.

### Instalación
1.  Clona el repositorio o descarga los archivos.
2.  Navega a la carpeta del proyecto:
    ```bash
    cd futmondo-manager
    ```
3.  Instala las dependencias necesarias:
    ```bash
    npm install
    ```

### Ejecución en Desarrollo
Para lanzar la aplicación en modo desarrollo con recarga automática:
```bash
npm run dev
```
La aplicación estará disponible por defecto en `http://localhost:5173`.

### Construcción para Producción
Para generar los archivos estáticos optimizados:
```bash
npm run build
```

## 🏗️ Estructura del Proyecto

- `src/components/`: Componentes React (Paneles, Modales, Sidebar).
- `src/utils/`: Lógica de cálculo de sanciones y resolución de equipos.
- `src/data/`: Ficheros JSON con datos históricos de capitanes y rankings.
- `public/escudos/`: Galería de imágenes de los equipos participantes.
- `whatsapp-bot/`: Bot de WhatsApp para notificaciones automáticas.

## 🤖 WhatsApp Bot

La aplicación incluye un bot de WhatsApp local que envía notificaciones automáticas de sanciones al grupo configurado.

### Configuración Rápida

1. Navega al directorio del bot:
   ```bash
   cd whatsapp-bot
   ```

2. Instala dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor:
   ```bash
   node server.js
   ```

4. Escanea el código QR con WhatsApp

**📖 Documentación completa**: Ver [whatsapp-bot/README.md](whatsapp-bot/README.md)

**⚠️ Importante**: 
- El bot es **opcional** y solo funciona en entorno local
- Enviará notificaciones al grupo **"FuentmondoBOT"** (hardcoded)
- No se despliega en GitHub Pages

## 🚀 Deployment

### GitHub Pages

1. Construye el proyecto:
   ```bash
   npm run build
   ```

2. Despliega a GitHub Pages:
   ```bash
   npm run deploy
   ```

La aplicación estará disponible en: `https://RAULTG97.github.io/fuentmondo-manager`

### Notas de Seguridad

- ✅ Los archivos sensibles del WhatsApp Bot (`.wwebjs_auth/`, `.wwebjs_cache/`) están en `.gitignore`
- ✅ No se suben credenciales ni datos personales al repositorio
- ✅ El bot solo funciona en tu máquina local


---
© 2026 Fuentmondo Manager - Desarrollado para la comunidad Futmondo.

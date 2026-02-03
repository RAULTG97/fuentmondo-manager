# WhatsApp Bot - Fuentmondo Manager

## 🤖 Descripción

Bot local de WhatsApp para enviar notificaciones automáticas de sanciones al grupo configurado.

## 📋 Requisitos Previos

- Node.js v16 o superior
- WhatsApp instalado en tu teléfono móvil
- Acceso al grupo de WhatsApp donde se enviarán las notificaciones

## 🚀 Instalación

1. Navega al directorio del bot:
```bash
cd whatsapp-bot
```

2. Instala las dependencias:
```bash
npm install
```

## ⚙️ Configuración

### Primera Vez

1. Inicia el servidor:
```bash
node server.js
```

2. Escanea el código QR que aparece en la terminal con WhatsApp:
   - Abre WhatsApp en tu teléfono
   - Ve a **Configuración** > **Dispositivos vinculados**
   - Toca **Vincular un dispositivo**
   - Escanea el código QR

3. Una vez conectado, verás el mensaje: `¡Puente de WhatsApp listo y conectado!`

**⚠️ Importante**: El bot enviará notificaciones al grupo **"FuentmondoBOT"**. Asegúrate de que:
- El grupo existe en tu WhatsApp
- El nombre es exactamente **"FuentmondoBOT"** (sensible a mayúsculas/minúsculas)
- La cuenta de WhatsApp vinculada está en ese grupo

## 🎯 Uso

### Modo Desarrollo

```bash
node server.js
```

El servidor estará disponible en `http://localhost:3001`

### Modo Producción (con PM2)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar el bot
pm2 start server.js --name whatsapp-bot

# Ver logs
pm2 logs whatsapp-bot

# Reiniciar
pm2 restart whatsapp-bot

# Detener
pm2 stop whatsapp-bot
```

## 📡 API

### POST /notify

Envía un mensaje al grupo de WhatsApp configurado.

**Request:**
```json
{
  "message": "Texto del mensaje",
  "groupName": "NombreDelGrupo"
}
```

**Response (éxito):**
```json
{
  "success": true
}
```

**Response (error):**
```json
{
  "error": "Grupo no encontrado"
}
```

## 🔒 Seguridad

- **NO subas** la carpeta `.wwebjs_auth/` a GitHub (contiene tu sesión de WhatsApp)
- **NO subas** la carpeta `.wwebjs_cache/` a GitHub
- Estas carpetas ya están en `.gitignore`

## 🐛 Troubleshooting

### El QR no aparece
- Asegúrate de que no hay otra instancia del bot corriendo
- Elimina las carpetas `.wwebjs_auth` y `.wwebjs_cache` y vuelve a intentar

### "Grupo no encontrado"
- Verifica que el grupo se llame exactamente **"FuentmondoBOT"** (mayúsculas/minúsculas)
- Asegúrate de que el bot esté en el grupo

### El bot se desconecta
- WhatsApp puede desconectar sesiones inactivas
- Vuelve a escanear el QR si es necesario

## 📝 Notas

- El bot debe estar **siempre corriendo** para enviar notificaciones
- Usa PM2 en producción para que se reinicie automáticamente
- Mantén el servidor actualizado para evitar problemas de compatibilidad

## 🔗 Enlaces Útiles

- [whatsapp-web.js Documentation](https://wwebjs.dev/)
- [PM2 Documentation](https://pm2.keymetrics.io/)

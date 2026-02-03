const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('Escanea este QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('¡Puente de WhatsApp listo y conectado!');
});

app.post('/notify', async (req, res) => {
    const { message, groupName } = req.body;
    try {
        const chats = await client.getChats();
        const group = chats.find(chat => chat.isGroup && chat.name === groupName);

        if (group) {
            await client.sendMessage(group.id._serialized, message);
            console.log(`Reporte enviado al grupo: ${groupName}`);
            res.json({ success: true });
        } else {
            console.warn(`Grupo no encontrado: ${groupName}`);
            res.status(404).json({ error: 'Grupo no encontrado. Asegúrate de que el nombre coincide exactamente.' });
        }
    } catch (err) {
        console.error('Error enviando mensaje:', err);
        res.status(500).json({ error: err.message });
    }
});

client.initialize();

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Servidor de notificaciones corriendo en http://localhost:${PORT}`);
    console.log('Mantén esta ventana abierta para enviar notificaciones.');
});

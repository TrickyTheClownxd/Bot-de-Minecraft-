const mineflayer = require('mineflayer');
const bedrock = require('bedrock-protocol');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// --- SERVER EXPRESS PARA EVITAR EL "SLEEP" DE RENDER ---
const app = express();
app.get('/', (req, res) => res.send('Bot en Modo Sigilo (45s Delay) Activo'));
app.listen(process.env.PORT || 10000);

// --- CONFIGURACIÓN DE IA ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- CONEXIÓN A MONGODB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Conectado correctamente'))
    .catch(err => console.error('❌ Error Mongo:', err));

const Memory = mongoose.model('MinecraftMemory', new mongoose.Schema({
    usuario: String,
    mensaje: String,
    respuesta: String,
    fecha: { type: Date, default: Date.now }
}));

// --- VARIABLES DE ENTORNO ---
const TYPE = (process.env.MC_TYPE || 'java').toLowerCase();
const HOST = process.env.MC_HOST;
const PORT = parseInt(process.env.MC_PORT);
const USERNAME = 'comeconchass_Bot';

console.log(`⏳ [SISTEMA] Modo Sigilo activado.`);
console.log(`⏳ [SISTEMA] Esperando 45 segundos para no alertar al firewall de Aternos...`);

// --- FUNCIÓN DE IA ---
async function procesarIA(username, message, responder) {
    if (!username || username === USERNAME || !message) return;
    try {
        const prev = await Memory.find().limit(2).sort({ fecha: -1 });
        const contexto = prev.map(m => `User: ${m.mensaje}\nBot: ${m.respuesta}`).join('\n');
        
        const prompt = `Eres un bot de Minecraft sarcástico. Contexto:\n${contexto}\n${username}: ${message}\nResponde corto:`;
        const result = await model.generateContent(prompt);
        const texto = result.response.text();

        await new Memory({ usuario: username, mensaje: message, respuesta: texto }).save();
        responder(texto);
    } catch (e) { console.error('⚠️ Error en IA:', e.message); }
}

// --- CONEXIÓN PROGRAMADA (DELAY) ---
setTimeout(() => {
    console.log(`🚀 [LOG] Fin de la espera. Intentando conectar a ${HOST}:${PORT} en modo ${TYPE.toUpperCase()}...`);

    if (TYPE === 'java') {
        // MODO JAVA
        function startJava() {
            const bot = mineflayer.createBot({
                host: HOST, port: PORT, username: USERNAME, auth: 'offline',
                connectTimeout: 60000
            });
            bot.on('chat', (u, m) => procesarIA(u, m, (t) => bot.chat(t)));
            bot.on('error', (e) => console.log('❌ Error Java:', e.message));
            bot.on('end', () => {
                console.log('🔄 Reintentando Java en 30s...');
                setTimeout(startJava, 30000);
            });
        }
        startJava();

    } else {
        // MODO BEDROCK
        function startBedrock() {
            const client = bedrock.createClient({
                host: HOST, port: PORT, username: USERNAME,
                offline: true, version: '1.21.60',
                skipPing: true,
                connectTimeout: 90000
            });

            client.on('join', () => console.log('✅ [BEDROCK] ¡CONECTADO CON ÉXITO!'));
            
            client.on('text', (packet) => {
                if ((packet.type === 'chat' || packet.type === 'translation') && packet.source_name !== USERNAME) {
                    procesarIA(packet.source_name, packet.message, (t) => {
                        client.queue('text', {
                            type: 'chat', needs_translation: false, source_name: USERNAME,
                            xuid: '', platform_chat_id: '', message: t
                        });
                    });
                }
            });

            client.on('error', (e) => console.log('❌ Error Bedrock:', e.message));
            client.on('close', () => {
                console.log('🔄 Reintentando Bedrock en 30s...');
                setTimeout(startBedrock, 30000);
            });
        }
        startBedrock();
    }
}, 45000); // 45 segundos exactos de espera inicial

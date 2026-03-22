const mineflayer = require('mineflayer');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');

// --- SERVIDOR WEB (Para mantener Render vivo) ---
const app = express();
app.get('/', (req, res) => res.send('comeconchass_Bot con MongoDB está Online 🧠'));
app.listen(process.env.PORT || 3000);

// --- CONFIGURACIÓN IA GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- CONEXIÓN A MONGODB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error de conexión a Mongo:', err));

// Esquema para guardar lo que el bot aprende
const MemorySchema = new mongoose.Schema({
    usuario: String,
    mensaje: String,
    respuesta: String,
    fecha: { type: Date, default: Date.now }
});
const Memory = mongoose.model('Memory', MemorySchema);

// --- CONFIGURACIÓN DEL BOT (Ajusta según tu captura de Aternos) ---
const botArgs = {
    host: process.env.MC_HOST || 'abyssinian.aternos.host', 
    port: parseInt(process.env.MC_PORT) || 28953,
    username: 'comeconchass_Bot',
    auth: 'offline',
    version: '1.21.1',
    connectTimeout: 60000,
    checkTimeoutInterval: 90000
};

let bot;

function createBot() {
    bot = mineflayer.createBot(botArgs);

    bot.on('spawn', () => {
        console.log("¡CONECTADO AL SERVIDOR!");
        bot.chat("He vuelto. Mi memoria ahora vive en la nube. 🧠");
    });

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;

        try {
            // 1. Buscar los últimos 3 recuerdos de este usuario
            const recuerdos = await Memory.find({ usuario: username })
                .limit(3)
                .sort({ fecha: -1 });
            
            let historial = recuerdos.map(r => `Anteriormente ${username} dijo: ${r.mensaje}`).join("\n");

            // 2. Generar respuesta usando la memoria
            const prompt = `Contexto de recuerdos:\n${historial}\n\nPregunta actual de ${username}: ${message}\nEres comeconchass_Bot, un bot de Minecraft sarcástico y divertido. Responde algo muy corto (máximo 20 palabras).`;
            
            const result = await model.generateContent(prompt);
            const textoIA = result.response.text().substring(0, 255);

            // 3. Guardar en MongoDB
            const nuevaMemoria = new Memory({
                usuario: username,
                mensaje: message,
                respuesta: textoIA
            });
            await nuevaMemoria.save();

            bot.chat(textoIA);

        } catch (err) {
            console.log("Error procesando chat/memoria:", err.message);
        }
    });

    // Anti-AFK simple (salto cada 40s)
    setInterval(() => {
        if (bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
        }
    }, 40000);

    bot.on('error', (err) => {
        console.log("Error de conexión:", err.message);
    });

    bot.on('end', () => {
        console.log("Se perdió la conexión con el servidor. Reintentando en 30s...");
        setTimeout(createBot, 30000);
    });
}

// Iniciar el bot
createBot();

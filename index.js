const mineflayer = require('mineflayer');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Sistema de Memoria y Bot Activo 🧠'));
app.listen(process.env.PORT || 3000);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- CONEXIÓN MONGODB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Conectado'))
  .catch(err => console.error('❌ Error Mongo:', err));

const Memory = mongoose.model('Memory', new mongoose.Schema({
    usuario: String,
    mensaje: String,
    respuesta: String,
    fecha: { type: Date, default: Date.now }
}));

// --- LÓGICA DEL BOT ---
const botArgs = {
    host: 'abyssinian.aternos.host', 
    port: 28953,
    username: 'comeconchass_Bot',
    auth: 'offline',
    version: '1.21.1',
    connectTimeout: 90000 // Aumentado a 90 segundos
};

function createBot() {
    console.log("Iniciando intento de conexión...");
    const bot = mineflayer.createBot(botArgs);

    bot.on('spawn', () => {
        console.log("¡ÉXITO: Bot en el servidor!");
        bot.chat("¡He vuelto! ¿Me extrañaron? 🧠");
    });

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        try {
            const recuerdos = await Memory.find({ usuario: username }).limit(2).sort({ fecha: -1 });
            let contexto = recuerdos.map(r => `Anteriormente dijo: ${r.mensaje}`).join("\n");
            
            const prompt = `${contexto}\nJugador ${username}: ${message}\nResponde corto y con personalidad de bot de One Block.`;
            const result = await model.generateContent(prompt);
            const respuestaIA = result.response.text().substring(0, 255);

            await new Memory({ usuario: username, mensaje: message, respuesta: respuestaIA }).save();
            bot.chat(respuestaIA);
        } catch (e) { console.log("Error IA"); }
    });

    bot.on('error', (err) => {
        console.log(`Error de conexión: ${err.message}`);
    });

    bot.on('end', () => {
        console.log("Desconectado. Reintentando en 60 segundos para evitar bloqueo...");
        setTimeout(createBot, 60000); // Reintento lento para no alertar a Aternos
    });
}

createBot();

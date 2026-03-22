const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const baritone = require('@miner-org/mineflayer-baritone');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('Bot Activo'));
app.listen(process.env.PORT || 3000);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- CONFIGURACIÓN CON DATOS DE TU FOTO ---
const bot = mineflayer.createBot({
    host: 'abyssinian.aternos.host', // Nueva Dyn IP de tu captura
    port: 28953,                     // Puerto de tu captura
    username: 'comeconchass_Bot',    // El nombre épico
    auth: 'offline',
    checkTimeoutInterval: 90000,     // Más tiempo para evitar el ETIMEDOUT
    version: '1.21.1'
});

// Carga de plugins
bot.loadPlugin(pathfinder);
try {
    const p = baritone.baritone || baritone.plugin || baritone;
    bot.loadPlugin(p);
} catch (e) { console.log("Baritone en espera..."); }

bot.on('spawn', () => {
    console.log("¡POR FIN CONECTADO!");
    bot.chat("Llegó el que faltaba. ¡A darle!");
});

bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    if (message.toLowerCase().includes('mina')) {
        const bloque = message.split(' ')[1] || 'grass_block';
        bot.chat(`Buscando ${bloque}, no me extrañen.`);
        return bot.baritone.mine(bloque);
    }

    try {
        const prompt = `Eres comeconchass_Bot en Minecraft. Responde corto y gracioso a: ${message}`;
        const result = await model.generateContent(prompt);
        bot.chat(result.response.text().substring(0, 255));
    } catch (err) { console.log("Error IA"); }
});

bot.on('error', (err) => console.log("Error:", err.message));
bot.on('end', () => console.log("Desconectado. Reintentando..."));

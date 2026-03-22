const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const baritone = require('@miner-org/mineflayer-baritone');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');

// --- SERVIDOR PARA RENDER (Evita que el servicio se duerma) ---
const app = express();
app.get('/', (req, res) => res.send('Bot Vivo y Coleando 🤡'));
app.listen(process.env.PORT || 3000);

// --- IA GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- CONFIGURACIÓN DE CONEXIÓN ---
const bot = mineflayer.createBot({
    host: 'snook.aternos.host', // Tu Dyn IP
    port: 28953,                // Tu Puerto
    username: 'comeconchass_Bot', // <--- NUEVO NOMBRE AQUÍ
    auth: 'offline',
    checkTimeoutInterval: 60000,
    version: '1.21.1'           
});

// --- CARGA DE PLUGINS ---
bot.loadPlugin(pathfinder);
try {
    const plugin = baritone.baritone || baritone.plugin || baritone;
    bot.loadPlugin(plugin);
} catch (e) {
    console.log("Aviso: Baritone no cargó, pero el bot seguirá intentando conectar.");
}

// --- EVENTOS DEL BOT ---
bot.on('spawn', () => {
    console.log("¡CONECTADO AL SERVER!");
    bot.chat("¡He llegado! El bot más picante de la isla ya está aquí.");
});

bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    // Comando rápido para Baritone
    if (message.toLowerCase().includes('mina')) {
        const bloque = message.split(' ')[1] || 'grass_block';
        bot.chat(`Buscando ${bloque}... prepárate.`);
        return bot.baritone.mine(bloque);
    }

    // Respuesta con IA Gemini
    try {
        const prompt = `Eres un bot de Minecraft llamado comeconchass_Bot en un One Block. El jugador ${username} dice: ${message}. Responde algo corto, atrevido y divertido.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        bot.chat(response.text().substring(0, 255));
    } catch (err) {
        console.log("Error en IA Gemini");
    }
});

// Anti-Kick (Pequeño salto cada 45s)
setInterval(() => {
    if (bot.entity) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
    }
}, 45000);

bot.on('error', (err) => console.log("Error de conexión:", err.message));
bot.on('end', () => console.log("Desconectado. Reintentando..."));

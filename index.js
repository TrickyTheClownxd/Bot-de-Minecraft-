const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const baritone = require('@miner-org/mineflayer-baritone'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');

// --- SERVIDOR WEB PARA RENDER ---
const app = express();
app.get('/', (req, res) => res.send('Bot IA Multimapa - Online'));
app.listen(process.env.PORT || 3000);

// --- CONFIGURACIÓN IA GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let memoriaColectiva = "Eres Tricky_Bot, un bot avanzado de Minecraft. Te adaptas a One Block o Survival. Puedes minar con Baritone. Aprendes de lo que dicen los jugadores.";

// --- CREACIÓN DEL BOT ---
const bot = mineflayer.createBot({
    host: process.env.MC_HOST,
    port: parseInt(process.env.MC_PORT) || 25565,
    username: 'Tricky_Bot', 
    auth: 'offline',
    version: '1.21'
});

// --- CARGA DE PLUGINS (SOLUCIÓN AL ASSERTION ERROR) ---
bot.loadPlugin(pathfinder);

try {
    if (typeof baritone === 'function') {
        bot.loadPlugin(baritone);
    } else if (baritone.plugin && typeof baritone.plugin === 'function') {
        bot.loadPlugin(baritone.plugin);
    } else if (baritone.default && typeof baritone.default === 'function') {
        bot.loadPlugin(baritone.default);
    } else {
        console.log("No se pudo cargar Baritone como función, intentando carga forzada...");
        bot.loadPlugin(baritone); 
    }
} catch (e) {
    console.error("Error crítico cargando Baritone:", e.message);
}

bot.on('spawn', () => {
    console.log("¡Bot conectado con éxito!");
    bot.chat("He llegado. Estoy listo para aprender de este mundo.");
});

// --- SISTEMA DE CHAT E IA ---
bot.on('chat', async (username, message) => {
    if (username === bot.username) return;
    const msg = message.toLowerCase();

    // Comandos directos de Baritone
    if (msg.includes('mina')) {
        const bloque = msg.split(' ')[1] || 'grass_block';
        bot.chat(`Entendido, buscaré ${bloque}.`);
        return bot.baritone.mine(bloque);
    }
    
    if (msg.includes('stop') || msg.includes('para')) {
        bot.baritone.stop();
        bot.pathfinder.setGoal(null);
        return bot.chat("Acciones detenidas.");
    }

    // Respuesta con IA y aprendizaje
    try {
        const prompt = `Contexto: ${memoriaColectiva}\nJugador ${username} dice: ${message}\nResponde corto y épico.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        bot.chat(response.text().substring(0, 255));
        
        // Guardamos en la memoria lo que pasó
        memoriaColectiva += `\n${username}: ${message}`;
    } catch (err) {
        console.log("Error IA:", err.message);
    }
});

// Anti-AFK
setInterval(() => {
    if (bot.entity) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
    }
}, 30000);

bot.on('error', (err) => console.log('Error del bot:', err));
bot.on('kicked', (reason) => console.log('Bot expulsado:', reason));

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const baritone = require('mineflayer-baritone');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');

// --- SERVIDOR WEB (Para Render) ---
const app = express();
app.get('/', (req, res) => res.send('Bot IA Multimapa - Online'));
app.listen(process.env.PORT || 3000);

// --- CONFIGURACIÓN IA ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let memoriaColectiva = "Eres un bot avanzado de Minecraft. Te adaptas a cualquier mapa (One Block, Survival, Skyblock). Puedes usar Baritone para minar. Eres amigable y aprendes de los jugadores.";

// --- CREACIÓN DEL BOT ---
const bot = mineflayer.createBot({
    host: process.env.MC_HOST,
    port: parseInt(process.env.MC_PORT) || 25565,
    username: 'comeconchas_Bot', // <--- CAMBIA EL NOMBRE AQUÍ
    auth: 'offline',
    version: '1.21'
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(baritone);

bot.on('spawn', () => {
    console.log("¡Bot en el servidor!");
    bot.chat("He llegado. Enseñame sobre este mundo y lo recordaré.");
});

// --- SISTEMA DE APRENDIZAJE Y ACCIÓN ---
bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    const msg = message.toLowerCase();

    // 1. Acciones Rápidas (Baritone)
    if (msg.includes('mina')) {
        const bloque = msg.split(' ')[1] || 'diamond_ore';
        bot.chat(`Entendido, voy a minar ${bloque}.`);
        return bot.baritone.mine(bloque);
    }
    
    if (msg.includes('stop') || msg.includes('para')) {
        bot.baritone.stop();
        bot.pathfinder.setGoal(null);
        return bot.chat("Deteniendo todas las acciones.");
    }

    // 2. Procesamiento con IA (Aprendizaje)
    try {
        const prompt = `Contexto: ${memoriaColectiva}\nJugador ${username} dice: ${message}\nResponde de forma épica y corta. Si te dan una instrucción de ubicación o regla del mapa, confírmalo.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const respuestaIA = response.text();

        bot.chat(respuestaIA.substring(0, 255));

        // El bot "aprende" guardando el mensaje en su memoria de sesión
        memoriaColectiva += `\nInstrucción de ${username}: ${message}`;
        
    } catch (err) {
        console.log("Error en IA:", err);
    }
});

// Anti-AFK (Salto cada 40 seg)
setInterval(() => {
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 500);
}, 40000);

bot.on('error', (err) => console.log('Error del bot:', err));
bot.on('kicked', (reason) => console.log('Bot expulsado por:', reason));

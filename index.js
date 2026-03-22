const mineflayer = require('mineflayer');
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Servidor para Render
const app = express();
app.get('/', (req, res) => res.send('Bot Vivo'));
app.listen(process.env.PORT || 3000);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const bot = mineflayer.createBot({
    host: process.env.MC_HOST,
    port: parseInt(process.env.MC_PORT),
    username: 'Tricky_Bot', 
    auth: 'offline',
    checkTimeoutInterval: 60000, // Más tiempo para conectar
    version: false // <--- Esto hace que se adapte a tu server
});

bot.on('spawn', () => {
    console.log("¡CONECTADO AL SERVIDOR!");
    bot.chat("¡Ya estoy aquí! ¿En qué ayudamos hoy?");
});

bot.on('chat', async (username, message) => {
    if (username === bot.username) return;
    try {
        const prompt = `Eres un bot de Minecraft. El jugador ${username} dice: ${message}. Responde algo corto.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        bot.chat(response.text().substring(0, 250));
    } catch (e) { console.log("Error IA"); }
});

// Reintento de conexión si falla
bot.on('end', () => {
    console.log("Desconectado. Reintentando...");
    setTimeout(() => { /* Aquí podrías reiniciar el proceso si fuera necesario */ }, 5000);
});

bot.on('error', (err) => console.log("Error de conexión:", err.message));

const mineflayer = require('mineflayer');
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.get('/', (req, res) => res.send('Esperando datos de Aternos...'));
app.listen(process.env.PORT || 3000);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const botArgs = {
    host: process.env.MC_HOST || 'tu-server.aternos.me', // Se saca de Render
    port: parseInt(process.env.MC_PORT) || 25565,       // Se saca de Render
    username: 'comeconchass_Bot',
    auth: 'offline',
    version: false,
    connectTimeout: 60000
};

let bot;

function createBot() {
    bot = mineflayer.createBot(botArgs);

    bot.on('spawn', () => console.log("¡CONECTADO!"));
    
    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;
        try {
            const prompt = `Responde corto al jugador ${username}: ${message}`;
            const result = await model.generateContent(prompt);
            bot.chat(result.response.text().substring(0, 255));
        } catch (e) { console.log("Error IA"); }
    });

    bot.on('error', (err) => {
        console.log("Error de conexión:", err.message);
    });

    bot.on('end', () => {
        console.log("Reintentando conexión en 30s...");
        setTimeout(createBot, 30000);
    });
}

createBot();

const mineflayer = require('mineflayer');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// --- CONFIGURACIÓN DE EXPRESS (Para que Render no lo apague) ---
const app = express();
app.get('/', (req, res) => res.send('Bot de Minecraft con Memoria Vivo 24/7'));
app.listen(process.env.PORT || 10000);

// --- CONFIGURACIÓN DE IA (Gemini) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- CONEXIÓN A MONGODB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error Mongo:', err));

const MemorySchema = new mongoose.Schema({
  usuario: String,
  mensaje: String,
  respuesta: String,
  fecha: { type: Date, default: Date.now }
});
const Memory = mongoose.model('MinecraftMemory', MemorySchema);

// --- CONFIGURACIÓN DEL BOT ---
const botArgs = {
  host: process.env.MC_HOST || '185.107.193.70', // IP Numérica directa
  port: parseInt(process.env.MC_PORT) || 28953,
  username: 'comeconchass_Bot',
  auth: 'offline',
  version: false, // Autodetectar versión para evitar bloqueos
  checkTimeoutInterval: 120000, 
  connectTimeout: 120000,
  keepAlive: true
};

let bot;

function createBot() {
  console.log('🚀 Iniciando intento de conexión...');
  bot = mineflayer.createBot(botArgs);

  bot.on('login', () => {
    console.log('¡CONECTADO AL SERVIDOR! 🎮');
  });

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    try {
      // Leer últimos recuerdos
      const prev = await Memory.find().limit(3).sort({ fecha: -1 });
      const contexto = prev.map(m => `User: ${m.mensaje}\nBot: ${m.respuesta}`).join('\n');

      const prompt = `Eres un bot de Minecraft sarcástico y divertido en un server One Block. 
      Contexto previo:\n${contexto}\n
      ${username} dice: ${message}\nResponde corto:`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Guardar en la nube
      await new Memory({ usuario: username, mensaje: message, respuesta: responseText }).save();

      bot.chat(responseText);
    } catch (err) {
      console.error('Error IA:', err);
    }
  });

  // Anti-AFK simple (Salto cada 40s)
  setInterval(() => {
    if (bot.entity) bot.setControlState('jump', true);
    setTimeout(() => { if (bot.entity) bot.setControlState('jump', false); }, 500);
  }, 40000);

  // Manejo de errores y reconexión
  bot.on('error', (err) => {
    console.log(`Error de conexión: ${err.message}`);
  });

  bot.on('end', () => {
    console.log('Desconectado. Reintentando en 60 segundos...');
    setTimeout(createBot, 60000);
  });
}

createBot();

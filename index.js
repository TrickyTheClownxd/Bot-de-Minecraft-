const mineflayer = require('mineflayer');
const bedrock = require('bedrock-protocol');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// --- SERVER EXPRESS PARA RENDER ---
const app = express();
app.get('/', (req, res) => res.send('Bot Híbrido (Dylan/Raids) Online'));
app.listen(process.env.PORT || 10000);

// --- CONFIGURACIÓN DE IA (Gemini) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- CONEXIÓN A MONGODB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Conectado'))
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

console.log(`🚀 Iniciando en modo: ${TYPE.toUpperCase()} en ${HOST}:${PORT}`);

// --- CEREBRO IA ---
async function procesarIA(username, message, responder) {
  if (!username || username === USERNAME || !message) return;
  try {
    const prev = await Memory.find().limit(3).sort({ fecha: -1 });
    const contexto = prev.map(m => `User: ${m.mensaje}\nBot: ${m.respuesta}`).join('\n');

    const prompt = `Eres un bot de Minecraft sarcástico. Contexto previo:\n${contexto}\n${username}: ${message}\nResponde corto y gracioso:`;
    const result = await model.generateContent(prompt);
    const texto = result.response.text();

    await new Memory({ usuario: username, mensaje: message, respuesta: texto }).save();
    responder(texto);
  } catch (e) { console.error('Error IA:', e); }
}

// --- LÓGICA DE CONEXIÓN ---
if (TYPE === 'java') {
  function conectarJava() {
    console.log('Intentando conectar a Java...');
    const bot = mineflayer.createBot({
      host: HOST, port: PORT, username: USERNAME, auth: 'offline', version: false
    });

    bot.on('chat', (user, msg) => procesarIA(user, msg, (t) => bot.chat(t)));
    bot.on('error', (e) => console.log('❌ Error Java:', e.message));
    bot.on('end', () => setTimeout(conectarJava, 30000));
  }
  conectarJava();

} else {
  function conectarBedrock() {
    console.log('Intentando conectar a Bedrock...');
    const client = bedrock.createClient({
      host: HOST,
      port: PORT,
      username: USERNAME,
      offline: true,
      version: '1.21.60', // Versión actualizada
      skipPing: true      // Salta el ping para evitar timeouts en Render
    });

    client.on('join', () => console.log('✅ Bedrock: ¡CONECTADO AL FIN!'));
    
    client.on('text', (packet) => {
      // En Bedrock el chat puede venir como 'chat' o 'translation'
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
    client.on('close', () => setTimeout(conectarBedrock, 30000));
  }
  conectarBedrock();
}

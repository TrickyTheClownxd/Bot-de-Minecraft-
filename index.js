const mineflayer = require('mineflayer');
const bedrock = require('bedrock-protocol');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// --- SERVER PARA MANTENER VIVO EN RENDER ---
const app = express();
app.get('/', (req, res) => res.send('Bot Híbrido (Java/Bedrock) Activo 24/7'));
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

// --- VARIABLES DE ENTORNO ---
const TYPE = (process.env.MC_TYPE || 'java').toLowerCase();
const HOST = process.env.MC_HOST || '185.107.193.70';
const PORT = parseInt(process.env.MC_PORT) || 28953;
const USERNAME = 'comeconchass_Bot';

console.log(`🚀 Iniciando en modo: ${TYPE.toUpperCase()} en ${HOST}:${PORT}`);

// --- FUNCIÓN PARA PROCESAR IA (Compartida) ---
async function chatConIA(username, message, sendChatFunc) {
  if (username === USERNAME) return;
  try {
    const prev = await Memory.find().limit(3).sort({ fecha: -1 });
    const contexto = prev.map(m => `User: ${m.mensaje}\nBot: ${m.respuesta}`).join('\n');

    const prompt = `Eres un bot de Minecraft sarcástico y divertido en un server One Block. 
    Contexto previo:\n${contexto}\n
    ${username} dice: ${message}\nResponde corto:`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    await new Memory({ usuario: username, mensaje: message, respuesta: responseText }).save();
    sendChatFunc(responseText);
  } catch (err) {
    console.error('Error en la IA:', err);
  }
}

// --- LÓGICA DE CONEXIÓN ---
if (TYPE === 'java') {
  function startJava() {
    const bot = mineflayer.createBot({
      host: HOST,
      port: PORT,
      username: USERNAME,
      auth: 'offline',
      version: false
    });

    bot.on('login', () => console.log('✅ Java: ¡CONECTADO!'));
    bot.on('chat', (username, message) => chatConIA(username, message, (txt) => bot.chat(txt)));
    bot.on('error', (err) => console.log('❌ Error Java:', err.message));
    bot.on('end', () => setTimeout(startJava, 30000));
  }
  startJava();

} else {
  function startBedrock() {
    const client = bedrock.createClient({
      host: HOST,
      port: PORT,
      username: USERNAME,
      offline: true,
      version: '1.21.1' // Ajusta si el server usa otra versión de Bedrock
    });

    client.on('join', () => console.log('✅ Bedrock: ¡CONECTADO!'));
    
    // El chat en Bedrock viene en el paquete 'text'
    client.on('text', (packet) => {
      if (packet.source_name === USERNAME) return;
      chatConIA(packet.source_name, packet.message, (txt) => {
        client.queue('text', {
          type: 'chat', needs_translation: false, source_name: USERNAME, 
          xuid: '', platform_chat_id: '', message: txt
        });
      });
    });

    client.on('error', (err) => console.log('❌ Error Bedrock:', err.message));
    client.on('close', () => setTimeout(startBedrock, 30000));
  }
  startBedrock();
}

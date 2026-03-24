const mineflayer = require('mineflayer');
const bedrock = require('bedrock-protocol');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');

// --- SERVER PARA MANTENER VIVO EN RENDER ---
const app = express();
app.get('/', (req, res) => res.send('Bot Híbrido Dylan/Raids Activo 24/7'));
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
const HOST = process.env.MC_HOST;
const PORT = parseInt(process.env.MC_PORT);
const USERNAME = 'comeconchass_Bot';

console.log(`🚀 Iniciando en modo: ${TYPE.toUpperCase()} en ${HOST}:${PORT}`);

// --- FUNCIÓN PARA PROCESAR IA (Compartida) ---
async function chatConIA(username, message, sendChatFunc) {
  if (!username || username === USERNAME || !message) return;
  try {
    const prev = await Memory.find().limit(3).sort({ fecha: -1 });
    const contexto = prev.map(m => `User: ${m.mensaje}\nBot: ${m.respuesta}`).join('\n');

    const prompt = `Eres un bot de Minecraft sarcástico y divertido. 
    Contexto previo:\n${contexto}\n
    ${username} dice: ${message}\nResponde corto y en español:`;

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
    console.log('Intentando conectar a Java...');
    const bot = mineflayer.createBot({
      host: HOST,
      port: PORT,
      username: USERNAME,
      auth: 'offline',
      version: false,
      connectTimeout: 60000
    });

    bot.on('login', () => console.log('✅ Java: ¡CONECTADO!'));
    bot.on('chat', (username, message) => chatConIA(username, message, (txt) => bot.chat(txt)));
    bot.on('error', (err) => console.log('❌ Error Java:', err.message));
    bot.on('end', () => {
      console.log('Conexión Java finalizada. Reintentando...');
      setTimeout(startJava, 30000);
    });
  }
  startJava();

} else {
  function startBedrock() {
    console.log('Intentando conectar a Bedrock...');
    const client = bedrock.createClient({
      host: HOST,
      port: PORT,
      username: USERNAME,
      offline: true,
      // Usamos la versión de tu captura (1.21.31 aprox, el protocolo lo autodetecta mejor así)
      version: '1.21.30' 
    });

    client.on('join', () => console.log('✅ Bedrock: ¡CONECTADO!'));
    
    client.on('text', (packet) => {
      // En Bedrock el chat viene con diferentes tipos, 'chat' es el estándar
      if (packet.type === 'chat' && packet.source_name !== USERNAME) {
        chatConIA(packet.source_name, packet.message, (txt) => {
          client.queue('text', {
            type: 'chat', needs_translation: false, source_name: USERNAME, 
            xuid: '', platform_chat_id: '', message: txt
          });
        });
      }
    });

    client.on('error', (err) => console.log('❌ Error Bedrock:', err.message));
    client.on('close', () => {
      console.log('Conexión Bedrock cerrada. Reintentando...');
      setTimeout(startBedrock, 30000);
    });
  }
  startBedrock();
}

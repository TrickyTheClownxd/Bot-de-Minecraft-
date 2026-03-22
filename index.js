const mineflayer = require('mineflayer');
const express = require('express');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const baritone = require('mineflayer-baritone');

// --- SERVIDOR WEB PARA RENDER ---
const app = express();
app.get('/', (req, res) => res.send('IA de Minecraft activa. Esperando pulso de Cron-job.'));
app.listen(process.env.PORT || 3000);

// --- CONFIGURACIÓN CON VARIABLES DE ENTORNO ---
const bot = mineflayer.createBot({
  host: process.env.MC_HOST, 
  port: parseInt(process.env.MC_PORT) || 25565,
  username: process.env.MC_USER, 
  auth: 'microsoft', // Cambia a 'offline' si decides no usar la cuenta oficial
  version: false,
  checkTimeoutInterval: 60000
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(baritone);

let listaNegra = [];

bot.on('spawn', () => {
  bot.chat("¡Sistemas iniciados! Nombre de unidad: " + bot.username);
  setTimeout(analizarEntorno, 3000);
});

function analizarEntorno() {
  const bloqueBajo = bot.blockAt(bot.entity.position.offset(0, -1, 0));
  if (!bloqueBajo || bloqueBajo.name === 'air') {
    bot.chat("Modo One Block detectado.");
  } else {
    bot.chat("Modo Survival estándar detectado.");
  }
}

// --- LÓGICA DE DEFENSA ---
bot.on('entityUpdate', (entity) => {
  if (entity.type === 'mob' && entity.kind === 'Hostile monsters') {
    const dist = bot.entity.position.distanceTo(entity.position);
    if (dist < 10) {
      const mcData = require('minecraft-data')(bot.version);
      const move = new Movements(bot, mcData);
      bot.pathfinder.setMovements(move);
      bot.pathfinder.setGoal(new goals.GoalFollow(entity, 2.5), true);
      bot.lookAt(entity.position);
      bot.attack(entity);
    }
  }
});

// --- COMANDOS ---
bot.on('chat', (username, message) => {
  if (username === bot.username) return;
  const msg = message.toLowerCase();

  if (msg.includes('ven')) {
    const p = bot.players[username]?.entity;
    if (p) bot.pathfinder.setGoal(new goals.GoalFollow(p, 2), true);
  }
  if (msg.includes('mina')) {
    bot.chat("Iniciando excavación autónoma...");
    bot.baritone.mine();
  }
  if (msg.includes('para')) {
    bot.pathfinder.setGoal(null);
    bot.baritone.stop();
    bot.chat("Protocolo detenido.");
  }
  if (msg === 'apágate') {
    bot.chat("Cerrando sesión...");
    bot.quit();
  }
});

// Anti-AFK
setInterval(() => {
  bot.setControlState('jump', true);
  setTimeout(() => bot.setControlState('jump', false), 500);
}, 50000);

bot.on('error', (err) => console.log('Error:', err));
bot.on('kicked', (reason) => console.log('Kicked:', reason));

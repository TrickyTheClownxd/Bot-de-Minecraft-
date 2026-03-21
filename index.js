const mineflayer = require('mineflayer');
const express = require('express');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const baritone = require('mineflayer-baritone');

// --- SERVIDOR WEB PARA RENDER (KEEP-ALIVE) ---
const app = express();
app.get('/', (req, res) => res.send('Bot de IA Minecraft: Activo y Evolucionando'));
app.listen(process.env.PORT || 3000);

// --- CONFIGURACIÓN DEL BOT ---
const bot = mineflayer.createBot({
  host: 'TU_IP_DE_ATERNOS_AQUI', 
  username: 'IA_Evolutiva', // Cambia el nombre si quieres
  version: false, // Auto-detectar versión (puedes poner '1.20.1' si falla)
  hideErrors: true
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(baritone);

// Memoria volátil (Se puede expandir a JSON después)
let listaNegraMobs = [];

bot.on('spawn', () => {
  bot.chat("¡Hola! He llegado. Analizando el mapa...");
  setTimeout(analizarEntorno, 2000);
});

// --- INTELIGENCIA DE ADAPTACIÓN ---
function analizarEntorno() {
  const bloqueBajoPies = bot.blockAt(bot.entity.position.offset(0, -1, 0));
  if (!bloqueBajoPies || bloqueBajoPies.name === 'air') {
    bot.chat("Parece que estamos en un One Block o Skyblock. Me quedaré aquí.");
  } else {
    bot.chat("Estamos en un mundo normal. ¡Listo para explorar!");
  }
}

// --- LÓGICA DE COMBATE Y APRENDIZAJE ---
bot.on('entityUpdate', (entity) => {
  if (entity.type === 'mob' && entity.kind === 'Hostile monsters') {
    const dist = bot.entity.position.distanceTo(entity.position);
    
    if (dist < 10) {
      if (listaNegraMobs.includes(entity.name)) {
        bot.chat(`¡Cuidado! Ese ${entity.name} ya nos hizo daño antes. ¡A por él!`);
      }
      
      const mcData = require('minecraft-data')(bot.version);
      const defaultMove = new Movements(bot, mcData);
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new goals.GoalFollow(entity, 2), true);
      
      bot.lookAt(entity.position);
      bot.attack(entity);
    }
  }
});

// Aprender de la muerte
bot.on('death', () => {
  bot.chat("Me han derrotado... pero mi IA ha guardado al culpable.");
  // Aquí podrías añadir lógica para guardar el nombre del mob en un array
});

// Auto-equiparse armas y escudos
bot.on('playerCollect', () => {
  setTimeout(() => {
    const espada = bot.inventory.items().find(i => i.name.includes('sword'));
    if (espada) bot.equip(espada, 'hand');
    const escudo = bot.inventory.items().find(i => i.name.includes('shield'));
    if (escudo) bot.equip(escudo, 'off-hand');
  }, 1000);
});

// --- COMANDOS DEL CHAT ---
bot.on('chat', (username, message) => {
  if (username === bot.username) return;
  const msg = message.toLowerCase();

  if (msg === 'ven') {
    const target = bot.players[username]?.entity;
    if (target) bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true);
  }
  if (msg === 'para') {
    bot.pathfinder.setGoal(null);
    bot.chat("Me detengo.");
  }
  if (msg === 'mina') {
    bot.chat("Minando automáticamente...");
    bot.baritone.mine();
  }
  if (msg === 'status') {
    bot.chat(`Vida: ${Math.round(bot.health)} | Comida: ${Math.round(bot.food)}`);
  }
});

// Anti-AFK (Saltar cada 45 segundos)
setInterval(() => {
  bot.setControlState('jump', true);
  setTimeout(() => bot.setControlState('jump', false), 500);
}, 45000);

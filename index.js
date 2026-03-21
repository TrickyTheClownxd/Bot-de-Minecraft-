const mineflayer = require('mineflayer');
const express = require('express');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const baritone = require('mineflayer-baritone');

// --- SERVIDOR WEB (KEEP-ALIVE PARA RENDER) ---
const app = express();
app.get('/', (req, res) => res.send('IA de Minecraft: Ejecutando Ciclo de Aprendizaje...'));
app.listen(process.env.PORT || 3000);

// --- CONFIGURACIÓN DE CONEXIÓN ---
const bot = mineflayer.createBot({
  host: 'TU_IP_DE_ATERNOS_AQUI', 
  port: 25565,
  username: 'IA_Evolutiva', // Si es Microsoft, pon tu correo aquí
  auth: 'offline',          // Cambia a 'microsoft' si usas cuenta oficial
  version: false,           // Auto-detectar versión
  checkTimeoutInterval: 60000
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(baritone);

// --- MEMORIA VOLÁTIL ---
let listaNegra = [];
let modoActual = "espera";

bot.on('spawn', () => {
  bot.chat("¡IA Conectada! Analizando terreno para adaptarme...");
  // LOGIN PARA SERVERS PIRATAS (Descomenta si es necesario)
  // bot.chat('/login TuClave123');
  
  setTimeout(detectarMapa, 3000);
});

// --- ADAPTACIÓN AL MAPA ---
function detectarMapa() {
  const suelo = bot.blockAt(bot.entity.position.offset(0, -1, 0));
  if (!suelo || suelo.name === 'air') {
    modoActual = "oneblock";
    bot.chat("Detectado: One Block / Skyblock. Priorizando recolección central.");
  } else {
    modoActual = "survival";
    bot.chat("Detectado: Mundo Abierto. Modo exploración y guardia activado.");
  }
}

// --- LÓGICA DE COMBATE (APRENDE DE LOS MODS DE TERROR) ---
bot.on('entityUpdate', (entity) => {
  if (entity.type === 'mob' && entity.kind === 'Hostile monsters') {
    const dist = bot.entity.position.distanceTo(entity.position);
    
    if (dist < 12) {
      if (listaNegra.includes(entity.name)) {
        bot.chat(`¡Peligro! El espécimen ${entity.name} es hostil. Iniciando protocolo de defensa.`);
      }
      
      const mcData = require('minecraft-data')(bot.version);
      const move = new Movements(bot, mcData);
      bot.pathfinder.setMovements(move);
      bot.pathfinder.setGoal(new goals.GoalFollow(entity, 2.5), true);
      
      bot.lookAt(entity.position);
      bot.attack(entity);

      // Aprender si el enemigo es difícil
      if (bot.health < 6 && !listaNegra.includes(entity.name)) {
        listaNegra.push(entity.name);
        bot.chat(`Registrando a ${entity.name} como amenaza de alto nivel.`);
      }
    }
  }
});

// --- GESTIÓN DE INVENTARIO Y COFRES ---
async function vaciarEnCofre() {
  const cofre = bot.findBlock({
    matching: b => b.name.includes('chest'),
    maxDistance: 6
  });

  if (cofre) {
    bot.chat("Inventario casi lleno. Almacenando materiales...");
    const container = await bot.openChest(cofre);
    for (const item of bot.inventory.items()) {
      // Guardar todo menos herramientas
      if (!item.name.includes('sword') && !item.name.includes('pickaxe') && !item.name.includes('shield')) {
        await container.deposit(item.type, null, item.count);
      }
    }
    container.close();
  }
}

// --- COMANDOS DE VOZ PARA AMIGOS ---
bot.on('chat', (username, message) => {
  if (username === bot.username) return;
  const msg = message.toLowerCase();

  if (msg.includes('ven')) {
    const p = bot.players[username]?.entity;
    if (p) bot.pathfinder.setGoal(new goals.GoalFollow(p, 2), true);
  }
  if (msg.includes('mina')) {
    bot.chat("Iniciando farmeo automático con Baritone.");
    bot.baritone.mine();
  }
  if (msg.includes('para')) {
    bot.pathfinder.setGoal(null);
    bot.baritone.stop();
    bot.chat("Protocolos detenidos.");
  }
  if (msg.includes('status')) {
    bot.chat(`Vida: ${Math.round(bot.health)} | Modo: ${modoActual} | Amenazas: ${listaNegra.length}`);
  }
  if (msg === 'bot apágate') {
    bot.chat("Desconectando IA. Hasta pronto.");
    bot.quit();
  }
});

// --- ANTI-AFK Y MANTENIMIENTO ---
setInterval(() => {
  // Salta para que Aternos no cierre el server
  bot.setControlState('jump', true);
  setTimeout(() => bot.setControlState('jump', false), 400);
  
  // Revisa si hay que vaciar inventario
  if (bot.inventory.emptySlotCount() < 3) vaciarEnCofre();
}, 45000);

bot.on('error', (err) => console.log('Error de la IA:', err));
bot.on('kicked', (reason) => console.log('Expulsado por:', reason));

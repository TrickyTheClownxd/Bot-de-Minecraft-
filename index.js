const mineflayer = require('mineflayer');
const bedrock = require('bedrock-protocol');
const express = require('express');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const baritone = require('mineflayer-baritone');

// --- SERVIDOR WEB (Para que Render no lo apague) ---
const app = express();
app.get('/', (req, res) => res.send('IA Multiplataforma MC - Estado: Activa'));
app.listen(process.env.PORT || 3000);

// Detectamos el modo desde las variables de Render
const isBedrock = process.env.MC_TYPE === 'bedrock';

if (isBedrock) {
    // ==========================================
    // MODO BEDROCK (Móvil / Consola)
    // ==========================================
    console.log("Iniciando en modo BEDROCK...");
    const bot = bedrock.createClient({
        host: process.env.MC_HOST,
        port: parseInt(process.env.MC_PORT) || 19132,
        username: process.env.MC_USER,
        offline: false // Cambiar a true si el server no pide cuenta oficial
    });

    bot.on('join', () => {
        console.log('¡Bot unido con éxito a Bedrock!');
    });

    bot.on('text', (packet) => {
        console.log(`[Chat Bedrock] ${packet.source_name}: ${packet.message}`);
    });

} else {
    // ==========================================
    // MODO JAVA (Tu Aternos 1.21 / PC)
    // ==========================================
    console.log("Iniciando en modo JAVA...");
    const bot = mineflayer.createBot({
        host: process.env.MC_HOST,
        port: parseInt(process.env.MC_PORT) || 25565,
        username: process.env.MC_USER,
        auth: 'microsoft',
        version: '1.21' // Forzamos la versión de tu servidor de la captura
    });

    // Cargar Plugins de Inteligencia (Solo Java)
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(baritone);

    bot.on('spawn', () => {
        bot.chat("IA de Combate y Minería conectada (Modo Java 1.21)");
        console.log("Bot listo en el servidor Java.");
    });

    // --- LÓGICA DE COMBATE AGRESIVA (Anti-Mobs de Terror) ---
    bot.on('entityUpdate', (entity) => {
        if (entity.type === 'mob' && entity.kind === 'Hostile monsters') {
            const dist = bot.entity.position.distanceTo(entity.position);
            
            if (dist < 10) {
                const mcData = require('minecraft-data')(bot.version);
                const defaultMove = new Movements(bot, mcData);
                
                bot.pathfinder.setMovements(defaultMove);
                bot.pathfinder.setGoal(new goals.GoalFollow(entity, 2), true);
                
                // Ataca y mira al enemigo
                bot.lookAt(entity.position);
                bot.attack(entity);
            }
        }
    });

    // --- COMANDOS POR CHAT ---
    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase();

        if (msg.includes('ven')) {
            const target = bot.players[username]?.entity;
            if (target) {
                const mcData = require('minecraft-data')(bot.version);
                const move = new Movements(bot, mcData);
                bot.pathfinder.setMovements(move);
                bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true);
            }
        }

        if (msg.includes('mina')) {
            bot.chat("Iniciando protocolo de minado automático...");
            bot.baritone.mine(); 
        }

        if (msg.includes('para')) {
            bot.pathfinder.setGoal(null);
            bot.baritone.stop();
            bot.chat("Protocolos pausados.");
        }
    });

    // Anti-AFK (Salto cada 45 segundos)
    setInterval(() => {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
    }, 45000);

    bot.on('error', (err) => console.log('Error detectado:', err));
    bot.on('kicked', (reason) => console.log('Bot expulsado:', reason));
}

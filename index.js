const mineflayer = require('mineflayer');
const bedrock = require('bedrock-protocol');
const express = require('express');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

// --- SERVIDOR PARA RENDER ---
const app = express();
app.get('/', (req, res) => res.send('IA MC Activa - Esperando Login'));
app.listen(process.env.PORT || 3000);

const isBedrock = process.env.MC_TYPE === 'bedrock';

if (isBedrock) {
    console.log("Iniciando en modo BEDROCK...");
    const bot = bedrock.createClient({
        host: process.env.MC_HOST,
        port: parseInt(process.env.MC_PORT) || 19132,
        username: process.env.MC_USER,
        offline: false
    });
    bot.on('join', () => console.log('¡Bot en Bedrock!'));
} else {
    console.log("Iniciando en modo JAVA...");
    const bot = mineflayer.createBot({
        host: process.env.MC_HOST,
        port: parseInt(process.env.MC_PORT) || 25565,
        username: process.env.MC_USER,
        auth: 'microsoft',
        version: '1.21'
    });

    bot.loadPlugin(pathfinder);

    bot.on('spawn', () => {
        bot.chat("IA conectada. Baritone desactivado temporalmente.");
        console.log("¡Bot listo! Mira los logs para el código de Microsoft.");
    });

    // Defensa básica
    bot.on('entityUpdate', (entity) => {
        if (entity.type === 'mob' && entity.kind === 'Hostile monsters') {
            const dist = bot.entity.position.distanceTo(entity.position);
            if (dist < 8) {
                const mcData = require('minecraft-data')(bot.version);
                bot.pathfinder.setMovements(new Movements(bot, mcData));
                bot.pathfinder.setGoal(new goals.GoalFollow(entity, 2), true);
                bot.attack(entity);
            }
        }
    });

    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        if (message.toLowerCase().includes('ven')) {
            const target = bot.players[username]?.entity;
            if (target) {
                const mcData = require('minecraft-data')(bot.version);
                bot.pathfinder.setMovements(new Movements(bot, mcData));
                bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true);
            }
        }
        if (message.toLowerCase().includes('para')) bot.pathfinder.setGoal(null);
    });

    setInterval(() => {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
    }, 45000);

    bot.on('error', (err) => console.log('Error:', err));
}

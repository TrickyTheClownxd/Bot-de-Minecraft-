const mineflayer = require('mineflayer');
const bedrock = require('bedrock-protocol');
const express = require('express');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

// --- SERVIDOR PARA RENDER ---
const app = express();
app.get('/', (req, res) => res.send('Bot Minecraft Offline - Estado: Activo'));
app.listen(process.env.PORT || 3000);

const isBedrock = process.env.MC_TYPE === 'bedrock';

if (isBedrock) {
    console.log("Iniciando en modo BEDROCK...");
    const bot = bedrock.createClient({
        host: process.env.MC_HOST,
        port: parseInt(process.env.MC_PORT) || 19132,
        username: process.env.MC_USER || 'Bot_Bostero',
        offline: true // Modo cracked para Bedrock
    });
    bot.on('join', () => console.log('¡Bot en Bedrock conectado!'));
} else {
    console.log("Iniciando en modo JAVA (Offline)...");
    const bot = mineflayer.createBot({
        host: process.env.MC_HOST,
        port: parseInt(process.env.MC_PORT) || 25565,
        username: 'Tricky_Bot', // Puedes cambiar este nombre por el que quieras
        auth: 'offline', // <--- AQUÍ ESTÁ EL TRUCO: Ya no pide cuenta Microsoft
        version: '1.21'
    });

    bot.loadPlugin(pathfinder);

    bot.on('spawn', () => {
        bot.chat("¡IA Conectada en modo Offline! Listo para la acción.");
        console.log("¡Bot dentro del servidor! Ya no necesitas códigos.");
    });

    // Defensa básica contra mobs
    bot.on('entityUpdate', (entity) => {
        if (entity.type === 'mob' && (entity.kind === 'Hostile monsters' || entity.metadata[16] === true)) {
            const dist = bot.entity.position.distanceTo(entity.position);
            if (dist < 8) {
                const mcData = require('minecraft-data')(bot.version);
                bot.pathfinder.setMovements(new Movements(bot, mcData));
                bot.pathfinder.setGoal(new goals.GoalFollow(entity, 2), true);
                bot.attack(entity);
            }
        }
    });

    // Comandos simples
    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase();
        if (msg.includes('ven')) {
            const target = bot.players[username]?.entity;
            if (target) {
                const mcData = require('minecraft-data')(bot.version);
                bot.pathfinder.setMovements(new Movements(bot, mcData));
                bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true);
            }
        }
        if (msg.includes('para')) bot.pathfinder.setGoal(null);
    });

    // Anti-AFK
    setInterval(() => {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
    }, 45000);

    bot.on('error', (err) => console.log('Error de conexión:', err.message));
    bot.on('kicked', (reason) => console.log('Bot expulsado:', reason));
}

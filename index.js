const mineflayer = require('mineflayer');
const bedrock = require('bedrock-protocol');
const express = require('express');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const baritone = require('mineflayer-baritone'); // <--- BARITONE ACTIVADO

// --- SERVIDOR PARA RENDER ---
const app = express();
app.get('/', (res) => res.send('Bot con Baritone - Estado: Activo'));
app.listen(process.env.PORT || 3000);

const isBedrock = process.env.MC_TYPE === 'bedrock';

if (isBedrock) {
    console.log("Modo BEDROCK...");
    const bot = bedrock.createClient({
        host: process.env.MC_HOST,
        port: parseInt(process.env.MC_PORT) || 19132,
        username: 'Tu_Nombre_Bedrock', // <--- CAMBIA EL NOMBRE AQUÍ (Bedrock)
        offline: true
    });
} else {
    console.log("Modo JAVA con Baritone...");
    const bot = mineflayer.createBot({
        host: process.env.MC_HOST,
        port: parseInt(process.env.MC_PORT) || 25565,
        username: 'comeconchas_bot', // <--- CAMBIA EL NOMBRE AQUÍ (Java)
        auth: 'offline',
        version: '1.21'
    });

    bot.loadPlugin(pathfinder);
    bot.loadPlugin(baritone); // Carga el plugin de minado

    bot.on('spawn', () => {
        bot.chat("¡IA con Baritone conectada! Di 'mina' + bloque para empezar.");
    });

    // --- COMANDOS DE CHAT ---
    bot.on('chat', (username, message) => {
        if (username === bot.username) return;
        const msg = message.toLowerCase();

        // Comando para seguirte: "ven"
        if (msg.includes('ven')) {
            const target = bot.players[username]?.entity;
            if (target) {
                const mcData = require('minecraft-data')(bot.version);
                bot.pathfinder.setMovements(new Movements(bot, mcData));
                bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true);
            }
        }

        // Comando para minar: "mina [bloque]" (ej: mina iron_ore)
        if (msg.includes('mina')) {
            const blockName = msg.split(' ')[1] || 'diamond_ore';
            bot.chat(`Buscando ${blockName}...`);
            bot.baritone.mine(blockName);
        }

        // Comando para parar todo: "stop"
        if (msg.includes('stop')) {
            bot.baritone.stop();
            bot.pathfinder.setGoal(null);
            bot.chat("Okey, me detengo.");
        }
    });

    // Anti-AFK mejorado
    setInterval(() => {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
    }, 30000);

    bot.on('error', (err) => console.log('Error:', err.message));
}

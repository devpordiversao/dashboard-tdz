require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

const BOT_TOKEN = process.env.DISCORD_TOKEN;

// Bot Discord
const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

bot.once('ready', () => {
    console.log(`Bot online: ${bot.user.tag}`);
});

bot.login(BOT_TOKEN);

// Express
app.use(express.json());
app.use(express.static('public')); // pasta do HTML

// ----------------- ROTAS -----------------

// Enviar mensagem
app.post('/api/send-message', async (req, res) => {
    const { channelId, content } = req.body;
    try {
        const channel = bot.channels.cache.get(channelId);
        if (!channel) return res.status(404).json({ error: 'Canal não encontrado' });
        await channel.send(content);
        res.json({ success: true, message: 'Mensagem enviada!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Criar canal
app.post('/api/create-channel', async (req, res) => {
    const { guildId, name, type } = req.body;
    try {
        const guild = bot.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });

        const options = { type: type === 'voz' ? 2 : 0 }; // 0 = text, 2 = voice
        const channel = await guild.channels.create({ name, ...options });
        res.json({ success: true, channel });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Dar/remover cargo
app.post('/api/role', async (req, res) => {
    const { guildId, userId, roleId, action } = req.body;
    try {
        const guild = bot.guilds.cache.get(guildId);
        const member = await guild.members.fetch(userId);
        const role = guild.roles.cache.get(roleId);
        if (!guild || !member || !role) return res.status(404).json({ error: 'Dados inválidos' });

        if (action === 'add') await member.roles.add(role);
        else if (action === 'remove') await member.roles.remove(role);

        res.json({ success: true, message: `Cargo ${action === 'add' ? 'adicionado' : 'removido'}!` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Status do bot
app.get('/api/status', (req, res) => {
    res.json({ status: bot.isReady() ? 'online' : 'offline' });
});

// ----------------- RODAR -----------------
app.listen(PORT, () => console.log(`Dashboard rodando na porta ${PORT}`));

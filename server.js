// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Client, Intents, GatewayIntentBits } = require('discord.js');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// ==================================
// CONFIGURAÇÃO DO BOT
// ==================================
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('❌ BOT_TOKEN não encontrado no .env ou variável do Railway');
} else {
    bot.login(token).catch(err => console.error('❌ Erro ao logar o bot:', err));
}

// ==================================
// CONFIGURAÇÃO DO EXPRESS
// ==================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(session({
    secret: 'tdz-secret',
    resave: false,
    saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, 'public')));

// ==================================
// ENDPOINTS API
// ==================================

// Retorna servidores do bot
app.get('/api/servers', (req, res) => {
    const guilds = bot.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL() || ''
    }));
    res.json(guilds);
});

// Retorna canais de um servidor
app.get('/api/channels/:guildId', (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');
    const channels = guild.channels.cache
        .filter(c => c.type === 0 || c.type === 2) // texto ou voz
        .map(c => ({ id: c.id, name: c.name, type: c.type }));
    res.json(channels);
});

// Retorna membros de um servidor
app.get('/api/members/:guildId', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');
    await guild.members.fetch(); // garante cache
    const members = guild.members.cache.map(m => ({
        id: m.id,
        username: m.user.username,
        displayName: m.displayName
    }));
    res.json(members);
});

// Retorna cargos de um servidor
app.get('/api/roles/:guildId', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');
    const roles = guild.roles.cache
        .filter(r => r.name !== '@everyone')
        .map(r => ({ id: r.id, name: r.name }));
    res.json(roles);
});

// Criar canal
app.post('/api/create-channel', async (req,res) => {
    const { guildId, name, type } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if(!guild) return res.status(400).send('Servidor não encontrado');

    const channelType = type.toLowerCase() === 'texto' ? 0 : 2; // 0=texto, 2=voz

    try {
        const channel = await guild.channels.create({ name, type: channelType });
        res.json({ id: channel.id, name: channel.name });
    } catch(err) {
        console.error('Erro ao criar canal:', err);
        res.status(500).send(err.message);
    }
});

// Dar cargo
app.post('/api/give-role', async (req,res) => {
    const { guildId, roleId, memberId } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if(!guild) return res.status(400).send('Servidor não encontrado');
    const member = guild.members.cache.get(memberId);
    const role = guild.roles.cache.get(roleId);
    if(!member || !role) return res.status(400).send('Membro ou cargo inválido');

    try {
        await member.roles.add(role);
        res.json({ success: true });
    } catch(err) {
        console.error('Erro ao adicionar cargo:', err);
        res.status(500).send(err.message);
    }
});

// Remover cargo
app.post('/api/remove-role', async (req,res) => {
    const { guildId, roleId, memberId } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if(!guild) return res.status(400).send('Servidor não encontrado');
    const member = guild.members.cache.get(memberId);
    const role = guild.roles.cache.get(roleId);
    if(!member || !role) return res.status(400).send('Membro ou cargo inválido');

    try {
        await member.roles.remove(role);
        res.json({ success: true });
    } catch(err) {
        console.error('Erro ao remover cargo:', err);
        res.status(500).send(err.message);
    }
});

// Enviar mensagem
app.post('/api/send-message', async (req,res) => {
    const { guildId, channelId, content } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if(!guild) return res.status(400).send('Servidor não encontrado');
    const channel = guild.channels.cache.get(channelId);
    if(!channel) return res.status(400).send('Canal inválido');

    try {
        await channel.send(content);
        res.json({ success: true });
    } catch(err) {
        console.error('Erro ao enviar mensagem:', err);
        res.status(500).send(err.message);
    }
});

// ==================================
// DASHBOARD LOGS
// ==================================
const logs = [];
function addLog(type, message) {
    const time = new Date().toLocaleTimeString();
    const logEntry = `[${time}] ${message}`;
    logs.push({ type, message: logEntry });
    console.log(logEntry);
}

// ==================================
// BOT READY
// ==================================
bot.once('ready', async () => {
    console.log(`Bot online como ${bot.user.tag}`);
    addLog('info', 'Bot conectado');
});

// ==================================
// ROTA INICIAL
// ==================================
app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname,'public','index.html'));
});

// ==================================
// START SERVER
// ==================================
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

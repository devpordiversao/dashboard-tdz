// server.js
const express = require('express');
const { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// --- Bot Discord ---
const bot = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
] });

bot.once('ready', async () => {
    console.log(`Bot online: ${bot.user.tag}`);
    try {
        await bot.application.commands.set([
            new SlashCommandBuilder().setName('ping').setDescription('Teste do bot')
            // Outros comandos aqui
        ]);
        console.log('✅ Comandos sincronizados!');
    } catch (e) {
        console.error('❌ Erro ao sincronizar comandos:', e);
    }
});

// Login do bot
const token = process.env.BOT_TOKEN;
if (!token) console.error('❌ BOT_TOKEN não encontrado no .env');
else bot.login(token).catch(err => console.error('❌ Erro ao logar o bot:', err));

// --- Endpoints da API ---

// Servidores
app.get('/api/servers', async (req, res) => {
    const guilds = bot.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL(),
        memberCount: g.memberCount
    }));
    res.json(guilds);
});

// Canais
app.get('/api/servers/:guildId/channels', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);
    const channels = guild.channels.cache.map(c => ({id: c.id, name: c.name}));
    res.json(channels);
});

// Membros
app.get('/api/servers/:guildId/members', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);
    const members = await guild.members.fetch();
    res.json(members.map(m => ({id: m.user.id, tag: m.user.tag})));
});

// Cargos
app.get('/api/servers/:guildId/roles', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);
    const roles = await guild.roles.fetch();
    res.json(roles.map(r => ({id: r.id, name: r.name})));
});

// Criar canal
app.post('/api/create-channel', async (req, res) => {
    const { guildId, name, type } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    let channelType = type.toLowerCase() === 'texto' ? 'GUILD_TEXT' : 'GUILD_VOICE';

    try {
        const channel = await guild.channels.create({ name, type: channelType });
        res.json({id: channel.id, name: channel.name});
    } catch(err) {
        console.error('Erro ao criar canal:', err);
        res.status(500).send(err.message);
    }
});

// Dar cargo
app.post('/api/set-role', async (req, res) => {
    const { guildId, userId, roleId } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    try {
        const member = await guild.members.fetch(userId);
        const role = await guild.roles.fetch(roleId);
        if (!member) return res.status(400).send('Usuário não encontrado');
        if (!role) return res.status(400).send('Cargo não encontrado');

        await member.roles.add(role);
        res.json({userId, roleId});
    } catch(err) {
        console.error('Erro ao dar cargo:', err);
        res.status(500).send(err.message);
    }
});

// Remover cargo
app.post('/api/remove-role', async (req, res) => {
    const { guildId, userId, roleId } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    try {
        const member = await guild.members.fetch(userId);
        const role = await guild.roles.fetch(roleId);
        if (!member) return res.status(400).send('Usuário não encontrado');
        if (!role) return res.status(400).send('Cargo não encontrado');

        await member.roles.remove(role);
        res.json({userId, roleId});
    } catch(err) {
        console.error('Erro ao remover cargo:', err);
        res.status(500).send(err.message);
    }
});

// Enviar mensagem
app.post('/api/send-message', async (req, res) => {
    const { guildId, channelId, message } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(400).send('Canal não encontrado');

    try {
        await channel.send(message);
        res.json({channelId, message});
    } catch(err) {
        console.error('Erro ao enviar mensagem:', err);
        res.status(500).send(err.message);
    }
});

// Start server
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

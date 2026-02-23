const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

// --- BOT DISCORD ---
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ===============================
// 📦 LOGS (PÚBLICOS + PRIVADOS)
// ===============================
const logs = [];

bot.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const everyone = message.guild.roles.everyone;
    const perms = message.channel.permissionsFor(everyone);

    const isPrivate = perms && !perms.has('ViewChannel');

    const logEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        guildId: message.guild.id,
        guildName: message.guild.name,
        channelId: message.channel.id,
        channelName: message.channel.name,
        userId: message.author.id,
        userTag: message.author.tag,
        content: message.content || '',
        isPrivate
    };

    logs.push(logEntry);

    // limite de memória
    if (logs.length > 1000) logs.shift();

    console.log(
        `📩 [${isPrivate ? 'PRIVADO' : 'PUBLICO'}] ${message.author.tag} em #${message.channel.name}: ${message.content}`
    );
});

// ===============================
// 🤖 BOT READY
// ===============================
bot.once('ready', async () => {
    console.log(`Bot online: ${bot.user.tag}`);

    try {
        await bot.application.commands.set([
            new SlashCommandBuilder()
                .setName('ping')
                .setDescription('Teste do bot')
        ]);

        console.log('✅ Comandos sincronizados!');
    } catch (e) {
        console.error('❌ Erro ao sincronizar comandos:', e);
    }
});

const token = process.env.BOT_TOKEN;
if (!token) console.error('❌ BOT_TOKEN não encontrado');
else bot.login(token);

// ===============================
// 🌐 API
// ===============================

// SERVERS
app.get('/api/servers', (req, res) => {
    const guilds = bot.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL(),
        memberCount: g.memberCount
    }));
    res.json(guilds);
});

// CHANNELS
app.get('/api/servers/:guildId/channels', (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);

    const channels = guild.channels.cache.map(c => ({
        id: c.id,
        name: c.name
    }));

    res.json(channels);
});

// MEMBERS
app.get('/api/servers/:guildId/members', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);

    const members = await guild.members.fetch();

    res.json(members.map(m => ({
        id: m.user.id,
        tag: m.user.tag
    })));
});

// ROLES
app.get('/api/servers/:guildId/roles', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);

    const roles = await guild.roles.fetch();

    res.json(roles.map(r => ({
        id: r.id,
        name: r.name
    })));
});

// ===============================
// 📋 LOGS API
// ===============================
app.get('/api/logs', (req, res) => {
    const { guildId } = req.query;

    let filtered = [...logs].reverse();

    if (guildId) {
        filtered = filtered.filter(l => l.guildId === guildId);
    }

    res.json(filtered);
});

// ===============================
// 💬 ENVIAR MSG
// ===============================
app.post('/api/send-message', async (req, res) => {
    const { guildId, channelId, message } = req.body;

    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(400).send('Canal não encontrado');

    try {
        await channel.send(message);
        res.json({ channelId, message });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// ===============================
// ✉️ ENVIAR DM
// ===============================
app.post('/api/send-dm', async (req, res) => {
    const { guildId, userId, message } = req.body;

    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    try {
        const member = await guild.members.fetch(userId);
        await member.send(message);

        res.json({ userId, message });
    } catch (err) {
        console.error('Erro DM:', err);
        res.status(500).send(err.message);
    }
});

// ===============================
// ⚙️ CRIAR CANAL
// ===============================
app.post('/api/create-channel', async (req, res) => {
    const { guildId, name, type } = req.body;

    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    const channelType = type.toLowerCase() === 'texto' ? 0 : 2;

    try {
        const channel = await guild.channels.create({
            name,
            type: channelType
        });

        res.json({ id: channel.id, name: channel.name });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// ===============================
// 🎭 ROLES
// ===============================
app.post('/api/set-role', async (req, res) => {
    const { guildId, userId, roleId } = req.body;

    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    try {
        const member = await guild.members.fetch(userId);
        const role = await guild.roles.fetch(roleId);

        await member.roles.add(role);

        res.json({ userId, roleId });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

app.post('/api/remove-role', async (req, res) => {
    const { guildId, userId, roleId } = req.body;

    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    try {
        const member = await guild.members.fetch(userId);
        const role = await guild.roles.fetch(roleId);

        await member.roles.remove(role);

        res.json({ userId, roleId });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

// ===============================
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));

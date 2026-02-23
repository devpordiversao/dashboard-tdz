const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

// --- Bot Discord ---
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Logs em memória
const publicLogs = [];

bot.once('ready', async () => {
    console.log(`Bot online: ${bot.user.tag}`);
    try {
        await bot.application.commands.set([
            new SlashCommandBuilder().setName('ping').setDescription('Teste do bot')
        ]);
        console.log('✅ Comandos sincronizados!');
    } catch (e) {
        console.error('❌ Erro ao sincronizar comandos:', e);
    }
});

// Captura mensagens públicas
bot.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return; // ignora DMs

    // Apenas canais públicos
    const everyone = message.guild.roles.everyone;
    const perms = message.channel.permissionsFor(everyone);
    if (!perms || !perms.has('ViewChannel')) return;

    const logEntry = {
        timestamp: new Date().toLocaleTimeString(),
        guild: message.guild.name,
        channel: message.channel.name,
        user: message.author.tag,
        content: message.content
    };

    publicLogs.push(logEntry);
    if (publicLogs.length > 500) publicLogs.shift();

    console.log(`📌 [${logEntry.guild} - #${logEntry.channel}] ${logEntry.user}: ${logEntry.content}`);
});

// --- Endpoints API ---

app.get('/api/servers', (req,res) => {
    const guilds = bot.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL(),
        memberCount: g.memberCount
    }));
    res.json(guilds);
});

app.get('/api/servers/:guildId/channels', (req,res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if(!guild) return res.json([]);
    const channels = guild.channels.cache.map(c => ({ id: c.id, name: c.name }));
    res.json(channels);
});

app.get('/api/servers/:guildId/members', async (req,res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if(!guild) return res.json([]);
    const members = await guild.members.fetch();
    res.json(members.map(m => ({ id: m.user.id, tag: m.user.tag })));
});

app.get('/api/servers/:guildId/roles', async (req,res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if(!guild) return res.json([]);
    const roles = await guild.roles.fetch();
    res.json(roles.map(r => ({ id: r.id, name: r.name })));
});

app.post('/api/create-channel', async (req,res) => {
    const { guildId, name, type } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if(!guild) return res.status(400).send('Servidor não encontrado');
    const channelType = type.toLowerCase() === 'texto' ? 0 : 2;
    try {
        const channel = await guild.channels.create({ name, type: channelType });
        res.json({ id: channel.id, name: channel.name });
    } catch(err) { console.error(err); res.status(500).send(err.message); }
});

app.post('/api/set-role', async (req,res) => {
    const { guildId, userId, roleId } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if(!guild) return res.status(400).send('Servidor não encontrado');
    try {
        const member = await guild.members.fetch(userId);
        const role = await guild.roles.fetch(roleId);
        await member.roles.add(role);
        res.json({ userId, roleId });
    } catch(err){ console.error(err); res.status(500).send(err.message); }
});

app.post('/api/remove-role', async (req,res) => {
    const { guildId, userId, roleId } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if(!guild) return res.status(400).send('Servidor não encontrado');
    try {
        const member = await guild.members.fetch(userId);
        const role = await guild.roles.fetch(roleId);
        await member.roles.remove(role);
        res.json({ userId, roleId });
    } catch(err){ console.error(err); res.status(500).send(err.message); }
});

app.post('/api/send-message', async (req,res) => {
    const { guildId, channelId, message } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if(!guild) return res.status(400).send('Servidor não encontrado');
    const channel = guild.channels.cache.get(channelId);
    if(!channel) return res.status(400).send('Canal não encontrado');
    try { await channel.send(message); res.json({ channelId, message }); }
    catch(err){ console.error(err); res.status(500).send(err.message); }
});

// Endpoint para logs
app.get('/api/logs', (req,res) => {
    res.json([...publicLogs].reverse());
});

// --- Start server ---
bot.login(process.env.BOT_TOKEN).catch(err=>console.error(err));
app.listen(PORT,()=>console.log(`Servidor rodando na porta ${PORT}`));

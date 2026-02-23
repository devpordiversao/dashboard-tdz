// server.js
const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

// Serve Dashboard
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

// --- Discord Bot ---
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Logs de todos os canais (publicos e privados)
const logs = [];

bot.once('ready', async () => {
    console.log(`✅ Bot online: ${bot.user.tag}`);

    try {
        await bot.application.commands.set([
            new SlashCommandBuilder().setName('ping').setDescription('Teste do bot')
        ]);
        console.log('✅ Comandos sincronizados!');
    } catch (e) {
        console.error('❌ Erro ao sincronizar comandos:', e);
    }
});

bot.on('messageCreate', async (message) => {
    if (message.author.bot) return; // ignora mensagens do bot
    if (!message.guild) return;     // ignora DMs

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
        attachments: message.attachments.map(a => ({ name: a.name, url: a.url })),
        replied: false
    };

    logs.push(logEntry);
    if (logs.length > 500) logs.shift(); // mantém só 500 mensagens

    console.log(`[LOG] ${message.guild.name} #${message.channel.name} ${message.author.tag}: ${message.content}`);
});

// --- Endpoints API ---

// Logs
app.get('/api/logs', (req, res) => {
    const { guildId } = req.query;
    let filtered = [...logs].reverse(); // mais recentes primeiro
    if (guildId) filtered = filtered.filter(l => l.guildId === guildId);
    res.json(filtered);
});

// Responder via bot
app.post('/api/reply', async (req, res) => {
    const { channelId, message } = req.body;
    if (!channelId || !message) return res.status(400).json({ error: 'channelId e message são obrigatórios' });

    try {
        const channel = await bot.channels.fetch(channelId);
        if (!channel) return res.status(404).json({ error: 'Canal não encontrado' });

        await channel.send(message);
        logs.forEach(log => {
            if (log.channelId === channelId && !log.replied) log.replied = true;
        });

        res.json({ success: true, channelId, message });
    } catch (err) {
        console.error('Erro ao responder no canal:', err);
        res.status(500).json({ error: err.message });
    }
});

// Enviar DM
app.post('/api/send-dm', async (req, res) => {
    const { guildId, userId, message } = req.body;
    if (!userId || !message) return res.status(400).json({ error: 'userId e message são obrigatórios' });

    try {
        const member = await bot.guilds.cache.get(guildId)?.members.fetch(userId);
        if (!member) return res.status(404).json({ error: 'Usuário não encontrado' });

        await member.send(message);
        res.json({ success: true, userId, message });
    } catch (err) {
        console.error('Erro ao enviar DM:', err);
        res.status(500).json({ error: err.message });
    }
});

// Servidores
app.get('/api/servers', (req, res) => {
    const guilds = bot.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL(),
        memberCount: g.memberCount
    }));
    res.json(guilds);
});

// Canais
app.get('/api/servers/:guildId/channels', (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);
    const channels = guild.channels.cache.map(c => ({ id: c.id, name: c.name }));
    res.json(channels);
});

// Membros
app.get('/api/servers/:guildId/members', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);
    const members = await guild.members.fetch();
    res.json(members.map(m => ({ id: m.user.id, tag: m.user.tag })));
});

// Cargos
app.get('/api/servers/:guildId/roles', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);
    const roles = await guild.roles.fetch();
    res.json(roles.map(r => ({ id: r.id, name: r.name })));
});

// Criar canal
app.post('/api/create-channel', async (req, res) => {
    const { guildId, name, type } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    const channelType = type.toLowerCase() === 'texto' ? 0 : 2;

    try {
        const channel = await guild.channels.create({ name, type: channelType });
        res.json({ id: channel.id, name: channel.name });
    } catch (err) {
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
        await member.roles.add(role);
        res.json({ userId, roleId });
    } catch (err) { console.error(err); res.status(500).send(err.message); }
});

// Remover cargo
app.post('/api/remove-role', async (req, res) => {
    const { guildId, userId, roleId } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    try {
        const member = await guild.members.fetch(userId);
        const role = await guild.roles.fetch(roleId);
        await member.roles.remove(role);
        res.json({ userId, roleId });
    } catch (err) { console.error(err); res.status(500).send(err.message); }
});

// Enviar mensagem em canal
app.post('/api/send-message', async (req, res) => {
    const { guildId, channelId, message } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(400).send('Canal não encontrado');

    try {
        await channel.send(message);
        res.json({ channelId, message });
    } catch (err) { console.error(err); res.status(500).send(err.message); }
});

// Start server
app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));

bot.login(process.env.BOT_TOKEN).catch(err => console.error('❌ Erro ao logar o bot:', err));

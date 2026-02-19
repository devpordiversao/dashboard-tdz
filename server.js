const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

// --- Bot Discord ---
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

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
if (!token) console.error('❌ BOT_TOKEN não encontrado no .env');
else bot.login(token).catch(err => console.error('❌ Erro ao logar o bot:', err));

// ============================================================
//  SISTEMA DE LOGS DE CANAIS PRIVADOS
// ============================================================

// Armazena os logs em memória (reinicia quando o servidor reinicia)
// Se quiser persistência, substitua por um arquivo JSON ou banco de dados
const privateLogs = [];

bot.on('messageCreate', async (message) => {
    // Ignora mensagens do próprio bot
    if (message.author.bot) return;

    // Ignora DMs (só queremos canais de servidor)
    if (!message.guild) return;

    // Verifica se o canal é privado (invisível para @everyone)
    const everyone = message.guild.roles.everyone;
    const perms = message.channel.permissionsFor(everyone);
    if (!perms || perms.has('ViewChannel')) return; // Canal público — ignora

    // ✅ Canal privado detectado — salva no log
    const logEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        guildId: message.guild.id,
        guildName: message.guild.name,
        channelId: message.channel.id,
        channelName: message.channel.name,
        userId: message.author.id,
        userTag: message.author.tag,
        userAvatar: message.author.displayAvatarURL(),
        content: message.content || '',
        attachments: message.attachments.map(a => ({ name: a.name, url: a.url })),
        replied: false
    };

    privateLogs.push(logEntry);

    // Mantém no máximo 500 logs em memória
    if (privateLogs.length > 500) privateLogs.shift();

    console.log(`📩 [LOG] ${message.author.tag} em #${message.channel.name} (${message.guild.name}): ${message.content}`);
});

// ============================================================
//  API — LOGS
// ============================================================

// Busca todos os logs (opcionalmente filtrar por servidor)
app.get('/api/logs', (req, res) => {
    const { guildId } = req.query;
    let logs = [...privateLogs].reverse(); // mais recentes primeiro
    if (guildId) logs = logs.filter(l => l.guildId === guildId);
    res.json(logs);
});

// Responde para um canal privado pelo bot
app.post('/api/reply', async (req, res) => {
    const { channelId, message } = req.body;

    if (!channelId || !message) {
        return res.status(400).json({ error: 'channelId e message são obrigatórios' });
    }

    try {
        const channel = await bot.channels.fetch(channelId);
        if (!channel) return res.status(404).json({ error: 'Canal não encontrado' });

        await channel.send(message);

        // Marca as mensagens desse canal como respondidas
        privateLogs.forEach(log => {
            if (log.channelId === channelId && !log.replied) log.replied = true;
        });

        res.json({ success: true, channelId, message });
    } catch (err) {
        console.error('Erro ao responder no canal:', err);
        res.status(500).json({ error: err.message });
    }
});

// Limpa todos os logs
app.delete('/api/logs', (req, res) => {
    privateLogs.length = 0;
    res.json({ success: true });
});

// ============================================================
//  API — EXISTENTE (sem alterações)
// ============================================================

app.get('/api/servers', (req, res) => {
    const guilds = bot.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL(),
        memberCount: g.memberCount
    }));
    res.json(guilds);
});

app.get('/api/servers/:guildId/channels', (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);
    const channels = guild.channels.cache.map(c => ({
        id: c.id,
        name: c.name
    }));
    res.json(channels);
});

app.get('/api/servers/:guildId/members', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);
    const members = await guild.members.fetch();
    res.json(members.map(m => ({
        id: m.user.id,
        tag: m.user.tag
    })));
});

app.get('/api/servers/:guildId/roles', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);
    const roles = await guild.roles.fetch();
    res.json(roles.map(r => ({
        id: r.id,
        name: r.name
    })));
});

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

app.post('/api/send-dm', async (req, res) => {
    const { guildId, userId, message } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');

    try {
        const member = await guild.members.fetch(userId);
        await member.send(message);
        res.json({ userId, message });
    } catch (err) {
        console.error('Erro ao enviar DM:', err);
        res.status(500).send(err.message);
    }
});

app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));
        

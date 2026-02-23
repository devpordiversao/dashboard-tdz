const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

// --- Dashboard ---
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

// Logs em memória
const logs = []; // armazena até 500 mensagens

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

// Login do bot
const token = process.env.BOT_TOKEN;
if (!token) console.error('❌ BOT_TOKEN não encontrado no .env');
else bot.login(token).catch(err => console.error('❌ Erro ao logar o bot:', err));

// ============================================================
// Captura todas as mensagens de texto
// ============================================================
bot.on('messageCreate', async (message) => {
    if (message.author.bot) return; // ignora o próprio bot
    if (!message.guild) return; // ignora DMs

    // Armazena log
    logs.push({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        guildId: message.guild.id,
        guildName: message.guild.name,
        channelId: message.channel.id,
        channelName: message.channel.name,
        userId: message.author.id,
        userTag: message.author.tag,
        content: message.content || '',
        attachments: message.attachments.map(a => ({ name: a.name, url: a.url }))
    });

    if (logs.length > 500) logs.shift(); // mantém apenas 500 logs

    console.log(`[LOG] ${message.guild.name}#${message.channel.name} <${message.author.tag}>: ${message.content}`);
});

// ============================================================
// API — Logs
// ============================================================

// Buscar logs (opcional: filtrar por servidor)
app.get('/api/logs', (req, res) => {
    const { guildId } = req.query;
    let result = [...logs].reverse(); // mais recentes primeiro
    if (guildId) result = result.filter(l => l.guildId === guildId);
    res.json(result);
});

// Limpar logs
app.delete('/api/logs', (req, res) => {
    logs.length = 0;
    res.json({ success: true });
});

// ============================================================
// API — Servidores, Canais, Membros, Cargos
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
    const channels = guild.channels.cache
        .filter(c => c.type === 0) // apenas texto
        .map(c => ({ id: c.id, name: c.name }));
    res.json(channels);
});

app.get('/api/servers/:guildId/members', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.json([]);
    const members = await guild.members.fetch();
    res.json(members.map(m => ({ id: m.user.id, tag: m.user.tag })));
});

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

// Enviar mensagem
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

// Enviar DM
app.post('/api/send-dm', async (req, res) => {
    const { guildId, userId, message } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(400).send('Servidor não encontrado');
    try {
        const member = await guild.members.fetch(userId);
        await member.send(message);
        res.json({ userId, message });
    } catch (err) { console.error(err); res.status(500).send(err.message); }
});

// Inicia servidor web
app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));

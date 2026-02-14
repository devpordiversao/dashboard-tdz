// server.js
const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- Bot Discord ---
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

bot.once('ready', () => {
    console.log(`✅ Bot online: ${bot.user.tag}`);
});

// Login do bot
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('❌ BOT_TOKEN não encontrado no .env');
    process.exit(1);
}
bot.login(token).catch(err => console.error('❌ Erro ao logar o bot:', err));

// --- Endpoints da API ---

// Pegar lista de servidores
app.get('/api/servers', async (req, res) => {
    try {
        const guilds = bot.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            iconURL: g.iconURL({ dynamic: true, size: 64 }),
            memberCount: g.memberCount,
        }));
        res.json({ success: true, guilds });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// Pegar canais de um servidor
app.get('/api/:guildId/channels', async (req, res) => {
    try {
        const guild = bot.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).json({ success: false, error: 'Servidor não encontrado' });
        const channels = guild.channels.cache.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            parentId: c.parentId
        }));
        res.json({ success: true, channels });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// Pegar cargos de um servidor
app.get('/api/:guildId/roles', async (req, res) => {
    try {
        const guild = bot.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).json({ success: false, error: 'Servidor não encontrado' });
        const roles = guild.roles.cache.map(r => ({
            id: r.id,
            name: r.name,
            color: r.hexColor,
            position: r.position,
            hoist: r.hoist
        }));
        res.json({ success: true, roles });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// Enviar mensagem em um canal
app.post('/api/send-message', async (req, res) => {
    const { guildId, channelId, content } = req.body;
    if (!guildId || !channelId || !content) {
        return res.status(400).json({ success: false, error: 'guildId, channelId e content são obrigatórios' });
    }
    try {
        const guild = bot.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ success: false, error: 'Servidor não encontrado' });
        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) return res.status(404).json({ success: false, error: 'Canal inválido' });
        await channel.send(content);
        res.json({ success: true, message: 'Mensagem enviada!' });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// Dar cargo a um usuário
app.post('/api/give-role', async (req, res) => {
    const { guildId, userId, roleId } = req.body;
    if (!guildId || !userId || !roleId) {
        return res.status(400).json({ success: false, error: 'guildId, userId e roleId são obrigatórios' });
    }
    try {
        const guild = bot.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ success: false, error: 'Servidor não encontrado' });
        const member = await guild.members.fetch(userId);
        const role = guild.roles.cache.get(roleId);
        if (!member || !role) return res.status(404).json({ success: false, error: 'Membro ou cargo não encontrado' });
        await member.roles.add(role);
        res.json({ success: true, message: `Cargo ${role.name} adicionado a ${member.user.tag}` });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// Criar canal
app.post('/api/create-channel', async (req, res) => {
    const { guildId, name, type, parentId } = req.body;
    if (!guildId || !name || !type) return res.status(400).json({ success: false, error: 'guildId, name e type são obrigatórios' });
    try {
        const guild = bot.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ success: false, error: 'Servidor não encontrado' });
        const channel = await guild.channels.create({
            name,
            type,
            parent: parentId || null
        });
        res.json({ success: true, channel: { id: channel.id, name: channel.name } });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// Iniciar servidor Express
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

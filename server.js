// server.js
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 8080;

// --- Bot Discord ---
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

bot.once('ready', () => {
    console.log(`🤖 Bot online: ${bot.user.tag}`);
});

// --- Endpoints API ---
// Retorna lista de servidores
app.get('/api/servers', (req, res) => {
    const guilds = bot.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        memberCount: g.memberCount
    }));
    res.json({ guilds });
});

// Retorna canais de um servidor
app.get('/api/:guildId/channels', (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild não encontrada' });

    const channels = guild.channels.cache
        .filter(c => c.type === 0) // apenas canais de texto
        .map(c => ({ id: c.id, name: c.name }));

    res.json({ channels });
});

// Retorna roles e membros de um servidor
app.get('/api/:guildId/roles', async (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild não encontrada' });

    await guild.members.fetch(); // garante que membros estejam carregados

    const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name }));
    const members = guild.members.cache.map(m => ({ id: m.id, username: m.user.username }));

    res.json({ roles, members });
});

// Enviar mensagem para um canal
app.post('/api/send-message', async (req, res) => {
    const { channelId, text } = req.body;
    if (!channelId || !text) return res.status(400).json({ message: 'ChannelId e text são obrigatórios' });

    try {
        const channel = await bot.channels.fetch(channelId);
        if (!channel) return res.status(404).json({ message: 'Canal não encontrado' });
        await channel.send(text);
        res.json({ message: '✅ Mensagem enviada!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '❌ Erro ao enviar mensagem' });
    }
});

// --- Servidor HTTP ---
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => console.log(`🌐 Dashboard rodando na porta ${PORT}`));

// --- Login do Bot ---
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('❌ BOT_TOKEN não encontrado no .env ou variável do Railway');
} else {
    bot.login(token).catch(err => console.error('❌ Erro ao logar o bot:', err));
         }

// server.js
const express = require('express');
const { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Serve dashboard
app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

// --- Bot Discord ---
const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });

bot.once('ready', async () => {
    console.log(`Bot online: ${bot.user.tag}`);

    try {
        await bot.application.commands.set([
            new SlashCommandBuilder().setName('ping').setDescription('Teste do bot'),
            new SlashCommandBuilder().setName('criar_canais').setDescription('Cria canais VIP e de divulgação').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder().setName('limpar_canais').setDescription('Remove todos os canais criados pelo bot').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder().setName('setvip').setDescription('Dá o cargo Divulgador VIP para um usuário').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        ]);
        console.log('✅ Comandos slash sincronizados!');
    } catch (e) {
        console.error('❌ Erro ao sincronizar comandos:', e);
    }
});

const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('❌ BOT_TOKEN não encontrado no .env ou variável do Railway');
} else {
    bot.login(token).catch(err => console.error('❌ Erro ao logar o bot:', err));
}

// --- Endpoints para o dashboard ---
app.get('/api/servers', (req, res) => {
    const guilds = bot.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL() || null,
        memberCount: g.memberCount
    }));
    res.json(guilds);
});

app.get('/api/servers/:guildId/channels', (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });
    const channels = guild.channels.cache.filter(c => c.isTextBased()).map(c => ({
        id: c.id,
        name: c.name
    }));
    res.json(channels);
});

app.get('/api/servers/:guildId/members', (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });
    const members = guild.members.cache.map(m => ({
        id: m.user.id,
        tag: m.user.tag
    }));
    res.json(members);
});

app.post('/api/send-message', express.json(), async (req, res) => {
    const { guildId, channelId, message } = req.body;
    try {
        const guild = bot.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });
        const channel = guild.channels.cache.get(channelId);
        if (!channel || !channel.isTextBased()) return res.status(404).json({ error: 'Canal não encontrado' });
        await channel.send(message);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

app.post('/api/set-role', express.json(), async (req, res) => {
    const { guildId, userId, roleId } = req.body;
    try {
        const guild = bot.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });
        const member = await guild.members.fetch(userId);
        if (!member) return res.status(404).json({ error: 'Usuário não encontrado' });
        await member.roles.add(roleId);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao adicionar cargo' });
    }
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

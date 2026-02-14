// server.js
const express = require('express');
const { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 8080;

// --- MIDDLEWARE ---
app.use(bodyParser.json());
app.use(express.static('public'));

// --- SERVE DASHBOARD ---
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// --- BOT DISCORD ---
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Funções utilitárias
function toSmallCaps(text) {
    const normal = "abcdefghijklmnopqrstuvwxyz";
    const smallCaps = "ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠʷxʏᴢ";
    return text.split('').map(c => normal.includes(c.toLowerCase()) ? smallCaps[normal.indexOf(c.toLowerCase())] : c).join('');
}

// --- SLASH COMMANDS ---
bot.once('ready', async () => {
    console.log(`Bot online: ${bot.user.tag}`);

    try {
        await bot.application.commands.set([
            new SlashCommandBuilder().setName('ping').setDescription('Teste do bot'),
            new SlashCommandBuilder().setName('setvip')
                .setDescription('Dá o cargo Divulgador VIP para um usuário')
                .addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder().setName('sendmsg')
                .setDescription('Envia mensagem em um canal')
                .addChannelOption(opt => opt.setName('canal').setDescription('Canal').setRequired(true))
                .addStringOption(opt => opt.setName('mensagem').setDescription('Mensagem').setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        ]);
        console.log('✅ Comandos slash sincronizados!');
    } catch (e) {
        console.error('❌ Erro ao sincronizar comandos:', e);
    }
});

// --- INTERAÇÕES SLASH ---
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    try {
        if (commandName === 'ping') {
            await interaction.reply('Pong!');
        } else if (commandName === 'setvip') {
            const user = options.getUser('usuario');
            const guild = interaction.guild;
            const roleName = toSmallCaps('divulgador vip') + ' 💎';
            const role = guild.roles.cache.find(r => r.name === roleName);
            if (!role) return interaction.reply('Cargo não encontrado!');
            const member = guild.members.cache.get(user.id);
            await member.roles.add(role);
            await interaction.reply(`${user.tag} recebeu o cargo VIP!`);
        } else if (commandName === 'sendmsg') {
            const channel = options.getChannel('canal');
            const message = options.getString('mensagem');
            if (!channel.isTextBased()) return interaction.reply('Canal inválido!');
            await channel.send(message);
            await interaction.reply(`Mensagem enviada em ${channel.name}`);
        }
    } catch (err) {
        console.error(err);
        await interaction.reply({ content: 'Erro ao executar comando.', ephemeral: true });
    }
});

// --- API ENDPOINTS PARA DASHBOARD ---
// Pega servidores do bot
app.get('/api/servers', (req, res) => {
    const guilds = bot.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL() || null,
        memberCount: g.memberCount
    }));
    res.json(guilds);
});

// Pega canais de um servidor
app.get('/api/servers/:guildId/channels', (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });
    const channels = guild.channels.cache.filter(c => c.isTextBased()).map(c => ({
        id: c.id,
        name: c.name
    }));
    res.json(channels);
});

// Pega membros de um servidor
app.get('/api/servers/:guildId/members', (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });
    const members = guild.members.cache.map(m => ({
        id: m.user.id,
        tag: m.user.tag
    }));
    res.json(members);
});

// Pega cargos de um servidor
app.get('/api/servers/:guildId/roles', (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });
    const roles = guild.roles.cache.map(r => ({
        id: r.id,
        name: r.name
    }));
    res.json(roles);
});

// Envia mensagem via dashboard
app.post('/api/send-message', async (req, res) => {
    const { guildId, channelId, message } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return res.status(404).json({ error: 'Canal inválido' });
    await channel.send(message);
    res.json({ success: true });
});

// Adiciona cargo a um usuário
app.post('/api/set-role', async (req, res) => {
    const { guildId, userId, roleId } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    const member = guild.members.cache.get(userId);
    const role = guild.roles.cache.get(roleId);
    if (!guild || !member || !role) return res.status(404).json({ error: 'Algo inválido' });
    await member.roles.add(role);
    res.json({ success: true });
});

// --- LOGIN BOT ---
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('❌ BOT_TOKEN não encontrado no .env ou variável do Railway');
} else {
    bot.login(token).catch(err => console.error('❌ Erro ao logar o bot:', err));
}

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// server.js
const express = require('express');
const { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());
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

// Logs de comandos
let logs = [];

// --- Slash Commands ---
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

const token = process.env.BOT_TOKEN;
if (!token) console.error('❌ BOT_TOKEN não encontrado');
else bot.login(token).catch(err => console.error('❌ Erro ao logar o bot:', err));

// --- Interações Slash ---
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, user } = interaction;

    try {
        if (commandName === 'ping') {
            await interaction.reply('Pong!');
            logs.unshift(`[${new Date().toLocaleTimeString()}] /ping usado por ${user.tag}`);
        } else if (commandName === 'setvip') {
            const target = options.getUser('usuario');
            const guild = interaction.guild;
            const roleName = 'Divulgador VIP';
            const role = guild.roles.cache.find(r => r.name === roleName);
            if (!role) return interaction.reply('Cargo não encontrado!');
            await guild.members.cache.get(target.id).roles.add(role);
            await interaction.reply(`${target.tag} recebeu o cargo VIP!`);
            logs.unshift(`[${new Date().toLocaleTimeString()}] /setvip usado por ${user.tag} em ${target.tag}`);
        } else if (commandName === 'sendmsg') {
            const channel = options.getChannel('canal');
            const msg = options.getString('mensagem');
            await channel.send(msg);
            await interaction.reply(`Mensagem enviada em ${channel.name}`);
            logs.unshift(`[${new Date().toLocaleTimeString()}] /sendmsg usado por ${user.tag} em #${channel.name}`);
        }
    } catch (err) {
        console.error(err);
        await interaction.reply({ content: 'Erro ao executar comando.', ephemeral: true });
        logs.unshift(`[${new Date().toLocaleTimeString()}] ERRO: ${commandName} por ${user.tag}`);
    }
});

// --- API Endpoints ---
app.get('/api/servers', (req, res) => {
    res.json(bot.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL() || null,
        memberCount: g.memberCount
    })));
});

app.get('/api/servers/:guildId/channels', (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });
    res.json(guild.channels.cache.filter(c => c.isTextBased()).map(c => ({ id: c.id, name: c.name })));
});

app.get('/api/servers/:guildId/members', (req, res) => {
    const guild = bot.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });
    res.json(guild.members.cache.map(m => ({ id: m.user.id, tag: m.user.tag })));
});

app.post('/api/send-message', async (req, res) => {
    try {
        const { guildId, channelId, message } = req.body;
        const guild = bot.guilds.cache.get(guildId);
        const channel = guild.channels.cache.get(channelId);
        await channel.send(message);
        logs.unshift(`[${new Date().toLocaleTimeString()}] Mensagem enviada em #${channel.name}`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

app.post('/api/set-role', async (req, res) => {
    try {
        const { guildId, userId, roleId } = req.body;
        const guild = bot.guilds.cache.get(guildId);
        const member = await guild.members.fetch(userId);
        await member.roles.add(roleId);
        logs.unshift(`[${new Date().toLocaleTimeString()}] Cargo adicionado a ${member.user.tag}`);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao adicionar cargo' });
    }
});

app.get('/api/logs', (req, res) => res.json(logs.slice(0,50))); // últimos 50 logs

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

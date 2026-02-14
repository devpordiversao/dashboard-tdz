// server.js
require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 8080;

// Serve arquivos estáticos da dashboard
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// --- Bot Discord ---
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

// Funções utilitárias
function toSmallCaps(text) {
    const normal = "abcdefghijklmnopqrstuvwxyz";
    const smallCaps = "ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠʷxʏᴢ";
    return text.split('').map(c => normal.includes(c.toLowerCase()) ? smallCaps[normal.indexOf(c.toLowerCase())] : c).join('');
}

function toMonospace(text) {
    const normal = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const mono = "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣0123456789";
    return text.split('').map(c => normal.includes(c) ? mono[normal.indexOf(c)] : c).join('');
}

// --- Slash Commands ---
bot.once('ready', async () => {
    console.log(`✅ Bot online: ${bot.user.tag}`);

    try {
        await bot.application.commands.set([
            new SlashCommandBuilder().setName('ping').setDescription('Teste do bot'),
            new SlashCommandBuilder().setName('criar_canais').setDescription('Cria canais VIP e de divulgação').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder().setName('limpar_canais').setDescription('Remove todos os canais criados pelo bot').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder().setName('confirmar_limpar').setDescription('Confirma a remoção de todos os canais').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder().setName('setvip').setDescription('Dá o cargo Divulgador VIP para um usuário')
                .addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder().setName('setcargo').setDescription('Dá um cargo específico para um usuário')
                .addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true))
                .addRoleOption(opt => opt.setName('cargo').setDescription('Cargo').setRequired(true))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder().setName('ajuda').setDescription('Mostra os comandos do bot'),
            new SlashCommandBuilder().setName('renomear_cargos').setDescription('Renomeia todos os cargos para monospace').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder().setName('criar_canais_normais').setDescription('Cria canais públicos').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        ]);
        console.log('✅ Comandos slash sincronizados!');
    } catch (err) {
        console.error('❌ Erro ao sincronizar comandos:', err);
    }
});

// --- Interações Slash ---
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    try {
        switch (commandName) {
            case 'ping':
                await interaction.reply('Pong!');
                break;
            case 'ajuda':
                await interaction.reply('Lista de comandos: /ping, /criar_canais, /limpar_canais, /confirmar_limpar, /setvip, /setcargo, /renomear_cargos, /criar_canais_normais');
                break;
            default:
                await interaction.reply('Comando em desenvolvimento...');
        }
    } catch (err) {
        console.error('❌ Erro na interação:', err);
        try { await interaction.reply('❌ Ocorreu um erro ao executar o comando.'); } catch {}
    }
});

// --- API Endpoints ---
app.get('/api/servers', (req, res) => {
    try {
        const guilds = bot.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            memberCount: g.memberCount
        }));
        res.json({ guilds });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar servidores' });
    }
});

app.get('/api/:guildId/channels', (req, res) => {
    try {
        const guild = bot.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });

        const channels = guild.channels.cache.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type
        }));
        res.json({ channels });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar canais' });
    }
});

app.get('/api/:guildId/roles', (req, res) => {
    try {
        const guild = bot.guilds.cache.get(req.params.guildId);
        if (!guild) return res.status(404).json({ error: 'Servidor não encontrado' });

        const roles = guild.roles.cache.map(r => ({
            id: r.id,
            name: r.name,
            color: r.color,
            position: r.position
        }));
        res.json({ roles });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar cargos' });
    }
});

// --- Login Bot ---
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('❌ BOT_TOKEN não encontrado no .env ou variável do Railway');
} else {
    bot.login(token).catch(err => console.error('❌ Erro ao logar o bot:', err));
}

// --- Start Express ---
app.listen(PORT, () => console.log(`✅ Dashboard rodando na porta ${PORT}`));

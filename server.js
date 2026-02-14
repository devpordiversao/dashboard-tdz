// server.js
const express = require('express');
const { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Serve dashboard
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// --- Bot Discord ---
const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

bot.once('ready', async () => {
    console.log(`Bot online: ${bot.user.tag}`);

    // Sincronizar comandos globalmente
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
    } catch (e) {
        console.error('❌ Erro ao sincronizar comandos:', e);
    }
});

// Logar com token
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('❌ BOT_TOKEN não encontrado no .env ou variável do Railway');
} else {
    bot.login(token).catch(err => console.error('❌ Erro ao logar o bot:', err));
}

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

// --- Interações slash ---
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const guild = interaction.guild;

    try {
        if (commandName === 'ping') {
            await interaction.reply('Pong!');
        }
        // Aqui você adiciona todos os outros comandos que você tinha, como criar_canais, limpar_canais, setvip, etc.
        // Pode copiar do código Python/JS anterior e adaptar para Discord.js v14
    } catch (e) {
        console.error('Erro na interação:', e);
        await interaction.reply({ content: '❌ Ocorreu um erro!', ephemeral: true });
    }
});

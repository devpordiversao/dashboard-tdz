const express = require("express");
const path = require("path");
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const app = express();

// Variáveis de ambiente
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Pasta pública
app.use(express.static(path.join(__dirname, "public")));

// Configura bot
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

let paused = false;
let commandLog = [];

// Funções de formatação
function toSmallCaps(text) {
    const normal = "abcdefghijklmnopqrstuvwxyz";
    const small = "ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ";
    return text.toLowerCase().split('').map(c => {
        const i = normal.indexOf(c);
        return i >= 0 ? small[i] : c;
    }).join('');
}

function toMonospace(text) {
    const normal = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const mono = "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣0123456789";
    return text.split('').map(c => {
        const i = normal.indexOf(c);
        return i >= 0 ? mono[i] : c;
    }).join('');
}

// Bot ready
bot.once('ready', () => {
    console.log(`Bot online: ${bot.user.tag}`);
});

// Registrar comandos no Discord (template)
const commands = [
    new SlashCommandBuilder().setName('criar_canais').setDescription('Cria todos os canais VIP e de divulgação').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('limpar_canais').setDescription('Remove todos os canais criados pelo bot').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('confirmar_limpar').setDescription('Confirma a remoção de todos os canais criados').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('setvip').setDescription('Dá o cargo Divulgador VIP para um usuário').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('setcargo').setDescription('Dá um cargo específico para um usuário').addRoleOption(opt => opt.setName('cargo').setDescription('Cargo').setRequired(true)).addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('ajuda').setDescription('Mostra os comandos disponíveis'),
    new SlashCommandBuilder().setName('renomear_cargos').setDescription('Renomeia todos os cargos existentes para fonte Monospace').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('criar_canais_normais').setDescription('Cria canais públicos (Info, Comunidade, Suporte, Divulgação)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map(cmd => cmd.toJSON());

// Deploy dos comandos
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
(async () => {
    try {
        console.log('Registrando comandos...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('Comandos registrados!');
    } catch (err) {
        console.error(err);
    }
})();

// Evento de interações
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    if (paused) return;

    try {
        // Template de todos os comandos da Claude

        if (interaction.commandName === 'criar_canais') {
            await interaction.reply('✅ /criar_canais executado! Aqui você implementa a criação de canais VIP e divulgação');
        }

        if (interaction.commandName === 'limpar_canais') {
            await interaction.reply('⚠️ Confirme com /confirmar_limpar');
        }

        if (interaction.commandName === 'confirmar_limpar') {
            await interaction.reply('✅ Todos os canais foram removidos! Aqui você implementa a lógica');
        }

        if (interaction.commandName === 'setvip') {
            const user = interaction.options.getUser('usuario');
            await interaction.reply(`✅ Cargo VIP dado para ${user.username} (implementar lógica de cargo real)`);
        }

        if (interaction.commandName === 'setcargo') {
            const role = interaction.options.getRole('cargo');
            const user = interaction.options.getUser('usuario');
            await interaction.reply(`✅ Cargo ${role.name} dado para ${user.username} (implementar lógica de cargo real)`);
        }

        if (interaction.commandName === 'ajuda') {
            await interaction.reply('🤖 Comandos disponíveis:\n/criar_canais\n/limpar_canais\n/confirmar_limpar\n/setvip\n/setcargo\n/ajuda\n/renomear_cargos\n/criar_canais_normais');
        }

        if (interaction.commandName === 'renomear_cargos') {
            await interaction.reply('✅ /renomear_cargos executado! (implementar lógica de renomeação de cargos)');
        }

        if (interaction.commandName === 'criar_canais_normais') {
            await interaction.reply('✅ /criar_canais_normais executado! (implementar lógica dos canais públicos)');
        }

        // Registrar comando no dashboard
        commandLog.push({
            user: interaction.user.username,
            command: `/${interaction.commandName}`,
            date: new Date().toLocaleString()
        });

    } catch (err) {
        console.error(err);
        await interaction.reply({ content: '❌ Erro ao executar comando', ephemeral: true });
    }
});

// Rotas do Dashboard
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/servers", (req, res) => {
    const guilds = bot.guilds.cache.map(g => ({ id: g.id, name: g.name }));
    res.json(guilds);
});

app.get("/api/commands", (req, res) => {
    res.json(commandLog.slice(-10));
});

app.post("/api/pause", (req, res) => {
    paused = true;
    res.json({ status: "paused" });
});

app.post("/api/resume", (req, res) => {
    paused = false;
    res.json({ status: "active" });
});

// Porta Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => console.log(`Dashboard rodando na porta ${PORT}`));

// Login do bot
bot.login(BOT_TOKEN);

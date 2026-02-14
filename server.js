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
            new SlashCommandBuilder().setName('setvip').setDescription('Dá o cargo Divulgador VIP para um usuário').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            new SlashCommandBuilder().setName('setcargo').setDescription('Dá um cargo específico para um usuário').addUserOption(opt => opt.setName('usuario').setDescription('Usuário').setRequired(true)).addRoleOption(opt => opt.setName('cargo').setDescription('Cargo').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
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
    console.error('❌ BOT_TOKEN não encontrado no .env');
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

        if (commandName === 'ajuda') {
            await interaction.reply({
                content: `Comandos disponíveis:\n/ping\n/criar_canais\n/limpar_canais\n/confirmar_limpar\n/setvip\n/setcargo\n/renomear_cargos\n/criar_canais_normais`,
                ephemeral: true
            });
        }

        if (commandName === 'criar_canais') {
            // exemplo rápido: cria categoria VIP e um canal
            const categoria = await guild.channels.create({ name: toSmallCaps("Área VIP"), type: 4 }); // 4 = GUILD_CATEGORY
            await guild.channels.create({ name: toSmallCaps("chat-vip"), type: 0, parent: categoria.id });
            await interaction.reply('✅ Canais VIP criados!');
        }

        if (commandName === 'limpar_canais') {
            await interaction.reply('⚠️ Use /confirmar_limpar para remover os canais.');
        }

        if (commandName === 'confirmar_limpar') {
            const categorias = guild.channels.cache.filter(c => c.type === 4 && c.name.includes('vip'));
            for (const [_, cat] of categorias) {
                await cat.delete().catch(() => {});
            }
            await interaction.reply('✅ Canais VIP removidos!');
        }

        if (commandName === 'setvip') {
            const user = interaction.options.getUser('usuario');
            const roleName = toSmallCaps('Divulgador VIP') + ' 💎';
            let role = guild.roles.cache.find(r => r.name === roleName);
            if (!role) role = await guild.roles.create({ name: roleName, color: 0x40E0D0, hoist: true, mentionable: true });
            const member = await guild.members.fetch(user.id);
            await member.roles.add(role);
            await interaction.reply(`✅ ${user.tag} agora tem o cargo Divulgador VIP!`);
        }

        if (commandName === 'setcargo') {
            const user = interaction.options.getUser('usuario');
            const role = interaction.options.getRole('cargo');
            const member = await guild.members.fetch(user.id);
            await member.roles.add(role);
            await interaction.reply(`✅ ${user.tag} recebeu o cargo ${role.name}!`);
        }

        if (commandName === 'renomear_cargos') {
            let count = 0;
            for (const role of guild.roles.cache.values()) {
                if (!role.managed && role.name !== '@everyone') {
                    await role.setName(toMonospace(role.name));
                    count++;
                }
            }
            await interaction.reply(`✅ ${count} cargos renomeados para monospace!`);
        }

        if (commandName === 'criar_canais_normais') {
            const categoria = await guild.channels.create({ name: toSmallCaps('Informações'), type: 4 });
            await guild.channels.create({ name: toSmallCaps('regras'), type: 0, parent: categoria.id });
            await interaction.reply('✅ Canais públicos criados!');
        }

    } catch (e) {
        console.error(e);
        await interaction.reply({ content: '❌ Ocorreu um erro.', ephemeral: true });
    }
});

// server.js
const express = require('express');
const app = express();
const path = require('path');
const { Client, IntentsBitField } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // pasta com o HTML

// -------------------- BOT --------------------
const bot = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates
    ]
});

bot.login(process.env.TOKEN);

bot.once('ready', () => {
    console.log(`Bot conectado como ${bot.user.tag}`);
});

// -------------------- ENDPOINTS --------------------

// Retorna lista de servidores
app.get('/api/servers', (req, res) => {
    const servers = bot.guilds.cache.map(g => ({ id: g.id, name: g.name }));
    res.json(servers);
});

// Retorna lista de usuários do servidor
app.get('/api/users', async (req, res) => {
    const guild = bot.guilds.cache.first(); // opcional se só 1 servidor
    if (!guild) return res.json([]);
    await guild.members.fetch();
    const users = guild.members.cache.map(m => ({ id: m.id, username: m.user.username }));
    res.json(users);
});

// Retorna lista de cargos do servidor
app.get('/api/roles', (req, res) => {
    const guild = bot.guilds.cache.first();
    if (!guild) return res.json([]);
    const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name }));
    res.json(roles);
});

// Retorna lista de canais do servidor
app.get('/api/channels', (req, res) => {
    const guild = bot.guilds.cache.first();
    if (!guild) return res.json([]);
    const channels = guild.channels.cache.map(c => ({ id: c.id, name: c.name }));
    res.json(channels);
});

// Envia mensagem em canal
app.post('/api/send-message', async (req, res) => {
    const { channelId, message } = req.body;
    try {
        const channel = await bot.channels.fetch(channelId);
        if (!channel) return res.status(404).json({ error: 'Canal não encontrado' });
        await channel.send(message);
        res.json({ message: 'Mensagem enviada!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cria canal
app.post('/api/create-channel', async (req, res) => {
    const { guildId, name, type } = req.body;
    const guild = bot.guilds.cache.get(guildId) || bot.guilds.cache.first();
    if (!guild) return res.status(400).send('Servidor não encontrado');

    const channelType = type.toLowerCase() === 'texto' ? 0 : 2; // 0=texto, 2=voz

    try {
        const channel = await guild.channels.create({ name, type: channelType });
        res.json({ id: channel.id, name: channel.name });
    } catch (err) {
        console.error('Erro ao criar canal:', err);
        res.status(500).send(err.message);
    }
});

// Dar cargo
app.post('/api/give-role', async (req, res) => {
    const { userId, roleId } = req.body;
    try {
        const guild = bot.guilds.cache.first();
        const member = await guild.members.fetch(userId);
        const role = guild.roles.cache.get(roleId);
        if (!member || !role) return res.status(404).json({ error: 'Usuário ou cargo não encontrado' });
        await member.roles.add(role);
        res.json({ message: `Cargo ${role.name} adicionado para ${member.user.username}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remover cargo
app.post('/api/remove-role', async (req, res) => {
    const { userId, roleId } = req.body;
    try {
        const guild = bot.guilds.cache.first();
        const member = await guild.members.fetch(userId);
        const role = guild.roles.cache.get(roleId);
        if (!member || !role) return res.status(404).json({ error: 'Usuário ou cargo não encontrado' });
        await member.roles.remove(role);
        res.json({ message: `Cargo ${role.name} removido de ${member.user.username}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------- NOVOS COMANDOS --------------------
// Estes endpoints podem ser chamados pelo dashboard ou pelo front-end

// /embed
app.post('/api/embed', async (req, res) => {
    const { canalId, titulo, descricao, cor, imagem, thumbnail, footer } = req.body;
    try {
        const channel = await bot.channels.fetch(canalId);
        if (!channel) return res.status(404).json({ error: 'Canal não encontrado' });
        const colorInt = parseInt(cor.replace('#', ''), 16);
        const embed = {
            title: titulo,
            description: descricao,
            color: colorInt,
            timestamp: new Date(),
            image: imagem ? { url: imagem } : undefined,
            thumbnail: thumbnail ? { url: thumbnail } : undefined,
            footer: { text: footer || 'TDZ Bot' }
        };
        await channel.send({ embeds: [embed] });
        res.json({ message: 'Embed enviado!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// /sugerir
app.post('/api/sugerir', async (req, res) => {
    const { sugestao } = req.body;
    try {
        const guild = bot.guilds.cache.first();
        let canal = guild.channels.cache.find(c => c.name === '💡・sugestoes');
        if (!canal) canal = await guild.channels.create('💡・sugestoes', { type: 0 });
        const embed = {
            title: '💡 Nova Sugestão',
            description: sugestao,
            color: 0x5865F2,
            timestamp: new Date()
        };
        const msg = await canal.send({ embeds: [embed] });
        await msg.react('👍');
        await msg.react('👎');
        res.json({ message: 'Sugestão enviada!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// /stats
app.get('/api/stats', async (req, res) => {
    try {
        const guild = bot.guilds.cache.first();
        await guild.members.fetch();
        const totalMembros = guild.memberCount;
        const online = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const humanos = totalMembros - bots;
        res.json({
            totalMembros,
            online,
            bots,
            humanos,
            canaisTexto: guild.channels.cache.filter(c => c.type === 0).size,
            canaisVoz: guild.channels.cache.filter(c => c.type === 2).size,
            categorias: guild.channels.cache.filter(c => c.type === 4).size,
            cargos: guild.roles.cache.size,
            boostCount: guild.premiumSubscriptionCount,
            boostLevel: guild.premiumTier
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// /relatorio
app.get('/api/relatorio', async (req, res) => {
    try {
        const guild = bot.guilds.cache.first();
        await guild.members.fetch();
        const membros = guild.members.cache;
        const topRoles = guild.roles.cache
            .filter(r => r.name !== '@everyone')
            .map(r => ({ name: r.name, count: membros.filter(m => m.roles.cache.has(r.id)).size }))
            .sort((a,b)=>b.count-a.count)
            .slice(0,5);
        res.json({ topRoles });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// /backup
app.get('/api/backup', async (req,res)=>{
    try{
        const guild = bot.guilds.cache.first();
        await guild.members.fetch();
        const backup = {
            servidor: guild.name,
            canais: guild.channels.cache.map(c=>({name:c.name,type:c.type})),
            cargos: guild.roles.cache.map(r=>({name:r.name,color:r.color}))
        };
        const nomeArquivo = `backup_${guild.name}_${Date.now()}.json`;
        fs.writeFileSync(nomeArquivo, JSON.stringify(backup,null,4));
        res.download(nomeArquivo, err=>{
            if(err) console.log(err);
            fs.unlinkSync(nomeArquivo);
        });
    }catch(err){
        res.status(500).json({ error: err.message });
    }
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Dashboard rodando na porta ${PORT}`));

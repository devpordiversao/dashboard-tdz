const express = require('express');
const app = express();
const cors = require('cors');
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // sua pasta do HTML

// Inicializa o bot
const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });
bot.login(process.env.TOKEN_BOT);

// ============================================================
// ENDPOINTS PARA DROPDOWNS
// ============================================================

// Lista usuários do servidor
app.get('/api/get-users', async (req, res) => {
    try {
        const guild = bot.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return res.status(400).send([]);
        await guild.members.fetch();
        const users = guild.members.cache.map(u => ({ id: u.id, username: u.user.username }));
        res.json(users);
    } catch(e) { res.status(500).send([]); }
});

// Lista cargos do servidor
app.get('/api/get-roles', async (req, res) => {
    try {
        const guild = bot.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return res.status(400).send([]);
        const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name }));
        res.json(roles);
    } catch(e) { res.status(500).send([]); }
});

// Lista canais do servidor
app.get('/api/get-channels', async (req, res) => {
    try {
        const guild = bot.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return res.status(400).send([]);
        const channels = guild.channels.cache.map(c => ({ id: c.id, name: c.name }));
        res.json(channels);
    } catch(e) { res.status(500).send([]); }
});

// ============================================================
// ENDPOINTS DE AÇÃO
// ============================================================

// Envia mensagem
app.post('/api/send-message', async (req,res) => {
    const { channelId, message } = req.body;
    try {
        const channel = await bot.channels.fetch(channelId);
        await channel.send(message);
        res.json({ success:true });
    } catch(e){ res.status(500).json({ success:false, error:e.message }); }
});

// Cria canal
app.post('/api/create-channel', async (req,res) => {
    const { guildId, name, type } = req.body;
    try {
        const guild = bot.guilds.cache.get(guildId);
        if (!guild) return res.status(400).send('Servidor não encontrado');
        const channelType = type.toLowerCase() === 'texto' ? 0 : 2;
        const channel = await guild.channels.create({ name, type: channelType });
        res.json({ id: channel.id, name: channel.name });
    } catch(err) { res.status(500).send(err.message); }
});

// Dar cargo
app.post('/api/give-role', async (req,res) => {
    const { userId, roleId } = req.body;
    try {
        const guild = bot.guilds.cache.get(process.env.GUILD_ID);
        const member = await guild.members.fetch(userId);
        const role = guild.roles.cache.get(roleId);
        await member.roles.add(role);
        res.json({ success:true });
    } catch(e){ res.status(500).json({ success:false, error:e.message }); }
});

// Remover cargo
app.post('/api/remove-role', async (req,res) => {
    const { userId, roleId } = req.body;
    try {
        const guild = bot.guilds.cache.get(process.env.GUILD_ID);
        const member = await guild.members.fetch(userId);
        const role = guild.roles.cache.get(roleId);
        await member.roles.remove(role);
        res.json({ success:true });
    } catch(e){ res.status(500).json({ success:false, error:e.message }); }
});

// ============================================================
// EXECUTAR COMANDOS NOVOS (EMBED, SUGERIR, STATS, RELATORIO, BACKUP)
// ============================================================

app.post('/api/command', async (req,res) => {
    const { command, params } = req.body;
    const guild = bot.guilds.cache.get(process.env.GUILD_ID);
    try {
        if(command==='embed'){
            const canal = await bot.channels.fetch(params.canal);
            canal.send({ embeds:[{ title: params.titulo, description: params.descricao, color: parseInt(params.cor.replace('#',''),16) }] });
        } else if(command==='sugerir'){
            let canal = guild.channels.cache.find(c=>c.name==='💡・sugestoes');
            if(!canal) canal = await guild.channels.create('💡・sugestoes',{type:0});
            canal.send({ content:`💡 Sugestão de ${params.user || 'Usuário'}: ${params.sugestao}`});
        } else if(command==='stats'){
            let total_membros = guild.memberCount;
            let bots = guild.members.cache.filter(m=>m.user.bot).size;
            let humanos = total_membros - bots;
            res.json({ total: total_membros, bots, humanos });
            return;
        } else if(command==='relatorio'){
            let relatorio = { membros: guild.memberCount, canais_texto: guild.channels.cache.filter(c=>c.type===0).size, canais_voz: guild.channels.cache.filter(c=>c.type===2).size };
            res.json(relatorio);
            return;
        } else if(command==='backup'){
            // backup básico JSON
            const data = {
                categorias: guild.channels.cache.filter(c=>c.type===4).map(c=>c.name),
                canais: guild.channels.cache.map(c=>c.name),
                cargos: guild.roles.cache.map(r=>r.name)
            };
            const fileName=`backup_${Date.now()}.json`;
            fs.writeFileSync(fileName,JSON.stringify(data,null,2));
            res.json({ file:fileName });
            return;
        }
        res.json({ success:true });
    } catch(e){ res.status(500).json({ success:false, error:e.message }); }
});

// ============================================================

app.listen(3000,()=>console.log('Servidor rodando na porta 3000'));

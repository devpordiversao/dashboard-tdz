require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'tdzsecret', resave: false, saveUninitialized: true }));
app.use(express.static('public')); // pasta com o dashboard HTML

// Bot setup
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

const token = process.env.BOT_TOKEN;
if (!token) console.error('❌ BOT_TOKEN não encontrado');

// ------------------- ENDPOINTS -------------------

// Pega servidores
app.get('/api/servers', (req,res)=>{
    try{
        const servers = bot.guilds.cache.map(g=>({
            id: g.id,
            name: g.name,
            icon: g.iconURL()
        }));
        res.json(servers);
    }catch(err){
        console.error('Erro /servers:', err);
        res.status(500).json({error: err.message});
    }
});

// Pega canais de um servidor
app.get('/api/channels/:guildId', (req,res)=>{
    try{
        const guild = bot.guilds.cache.get(req.params.guildId);
        if(!guild) return res.status(404).json([]);
        const channels = guild.channels.cache
            .filter(c => c.isTextBased())
            .map(c => ({id:c.id, name:c.name}));
        res.json(channels);
    }catch(err){
        console.error('Erro /channels:', err);
        res.status(500).json({error: err.message});
    }
});

// Pega membros de um servidor
app.get('/api/users/:guildId', async (req,res)=>{
    try{
        const guild = bot.guilds.cache.get(req.params.guildId);
        if(!guild) return res.status(404).json([]);
        await guild.members.fetch(); // fetch seguro
        const members = guild.members.cache.map(m=>({id:m.id, username:m.user.username}));
        res.json(members);
    }catch(err){
        console.error('Erro /users:', err);
        res.status(500).json({error: err.message});
    }
});

// Pega cargos de um servidor
app.get('/api/roles/:guildId', async (req,res)=>{
    try{
        const guild = bot.guilds.cache.get(req.params.guildId);
        if(!guild) return res.status(404).json([]);
        const roles = guild.roles.cache
            .filter(r => r.name !== '@everyone')
            .map(r => ({id:r.id, name:r.name}));
        res.json(roles);
    }catch(err){
        console.error('Erro /roles:', err);
        res.status(500).json({error: err.message});
    }
});

// Criar canal
app.post('/api/create-channel', async (req,res)=>{
    try{
        const { guildId, name, type } = req.body;
        const guild = bot.guilds.cache.get(guildId);
        if(!guild) return res.status(404).send('Servidor não encontrado');

        const channelType = type.toLowerCase() === 'texto' ? 0 : 2;
        const channel = await guild.channels.create({ name, type: channelType });
        res.json({id:channel.id, name:channel.name});
    }catch(err){
        console.error('Erro ao criar canal:', err);
        res.status(500).send(err.message);
    }
});

// Dar cargo
app.post('/api/give-role', async (req,res)=>{
    try{
        const { guildId, roleId, userId } = req.body;
        const guild = bot.guilds.cache.get(guildId);
        if(!guild) return res.status(404).send('Servidor não encontrado');

        const role = guild.roles.cache.get(roleId);
        const member = guild.members.cache.get(userId);
        if(!role || !member) return res.status(404).send('Role ou Member não encontrado');

        await member.roles.add(role);
        res.json({success:true});
    }catch(err){
        console.error('Erro ao dar cargo:', err);
        res.status(500).send(err.message);
    }
});

// Remover cargo
app.post('/api/remove-role', async (req,res)=>{
    try{
        const { guildId, roleId, userId } = req.body;
        const guild = bot.guilds.cache.get(guildId);
        if(!guild) return res.status(404).send('Servidor não encontrado');

        const role = guild.roles.cache.get(roleId);
        const member = guild.members.cache.get(userId);
        if(!role || !member) return res.status(404).send('Role ou Member não encontrado');

        await member.roles.remove(role);
        res.json({success:true});
    }catch(err){
        console.error('Erro ao remover cargo:', err);
        res.status(500).send(err.message);
    }
});

// Enviar mensagem
app.post('/api/send-message', async (req,res)=>{
    try{
        const { guildId, channelId, content } = req.body;
        const guild = bot.guilds.cache.get(guildId);
        if(!guild) return res.status(404).send('Servidor não encontrado');

        const channel = guild.channels.cache.get(channelId);
        if(!channel || !channel.isTextBased()) return res.status(404).send('Canal não encontrado');

        await channel.send(content);
        res.json({success:true});
    }catch(err){
        console.error('Erro ao enviar mensagem:', err);
        res.status(500).send(err.message);
    }
});

// ------------------- START BOT -------------------
bot.once('ready', () => {
    console.log(`Bot conectado como ${bot.user.tag}`);
    app.listen(PORT, () => console.log(`Dashboard rodando na porta ${PORT}`));
});

bot.login(token);

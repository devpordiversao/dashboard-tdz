// server.js - versão estável TDZ Bot
const express = require('express');
const bodyParser = require('body-parser');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // pasta onde o HTML fica

// === Inicializa Bot ===
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

bot.login(process.env.BOT_TOKEN);

bot.once('ready', () => {
    console.log(`Bot logado como ${bot.user.tag}`);
});

// === API para enviar mensagem ===
app.post('/api/send-message', async (req,res)=>{
    const { guildId, channelName, message } = req.body;
    try {
        const guild = bot.guilds.cache.get(guildId);
        if(!guild) return res.status(404).send('Servidor não encontrado');

        const channel = guild.channels.cache.find(c=>c.name===channelName && c.isTextBased());
        if(!channel) return res.status(404).send('Canal não encontrado');

        await channel.send(message);
        res.json({status:'ok', message:'Mensagem enviada!'});
    } catch(err){
        console.error(err);
        res.status(500).send(err.message);
    }
});

// === API para criar canal ===
app.post('/api/create-channel', async (req,res)=>{
    const { guildId, name, type } = req.body;
    const guild = bot.guilds.cache.get(guildId);
    if(!guild) return res.status(404).send('Servidor não encontrado');

    // Tipo: 0 = texto, 2 = voz
    const channelType = type.toLowerCase() === 'texto' ? 0 : 2;

    try{
        const channel = await guild.channels.create({name, type: channelType});
        res.json({status:'ok', id: channel.id, name: channel.name});
    } catch(err){
        console.error(err);
        res.status(500).send(err.message);
    }
});

// === API para dar cargo ===
app.post('/api/give-role', async (req,res)=>{
    const { guildId, userId, roleName } = req.body;
    try{
        const guild = bot.guilds.cache.get(guildId);
        if(!guild) return res.status(404).send('Servidor não encontrado');

        const member = guild.members.cache.get(userId);
        if(!member) return res.status(404).send('Usuário não encontrado');

        let role = guild.roles.cache.find(r=>r.name===roleName);
        if(!role) {
            role = await guild.roles.create({name: roleName, color:'BLUE', mentionable:true});
        }

        await member.roles.add(role);
        res.json({status:'ok', message:`Cargo ${roleName} dado para ${member.user.tag}`});
    } catch(err){
        console.error(err);
        res.status(500).send(err.message);
    }
});

// === API para remover cargo ===
app.post('/api/remove-role', async (req,res)=>{
    const { guildId, userId, roleName } = req.body;
    try{
        const guild = bot.guilds.cache.get(guildId);
        if(!guild) return res.status(404).send('Servidor não encontrado');

        const member = guild.members.cache.get(userId);
        if(!member) return res.status(404).send('Usuário não encontrado');

        const role = guild.roles.cache.find(r=>r.name===roleName);
        if(!role) return res.status(404).send('Cargo não encontrado');

        await member.roles.remove(role);
        res.json({status:'ok', message:`Cargo ${roleName} removido de ${member.user.tag}`});
    } catch(err){
        console.error(err);
        res.status(500).send(err.message);
    }
});

// === Inicia servidor web ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Servidor rodando na porta ${PORT}`));

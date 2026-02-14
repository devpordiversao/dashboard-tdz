// server.js
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// === SERVE O DASHBOARD HTML ===
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// === INICIA O SERVIDOR WEB ===
app.listen(PORT, () => console.log(`🌐 Servidor rodando na porta ${PORT}`));

// === BOT DISCORD ===
const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

bot.once('ready', () => {
    console.log(`🤖 Bot online: ${bot.user.tag}`);
});

const token = process.env.BOT_TOKEN;
if (!token) {
    console.error("❌ ERRO: Adicione BOT_TOKEN no arquivo .env");
} else {
    bot.login(token);
}

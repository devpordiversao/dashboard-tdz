const express = require("express");
const session = require("express-session");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();

// Variáveis de ambiente
const BOT_TOKEN = process.env.BOT_TOKEN;

// Sessão Express
app.use(session({
  secret: "tdz-secret",
  resave: false,
  saveUninitialized: false
}));

// Pasta pública
app.use(express.static(path.join(__dirname, "public")));

// Bot Discord
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });
let paused = false;
let commandLog = [];

bot.once('ready', () => {
    console.log(`Bot online: ${bot.user.tag}`);
});

bot.login(BOT_TOKEN);

// Dashboard principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API: Servidores do bot
app.get("/api/servers", (req, res) => {
  const guilds = bot.guilds.cache.map(g => ({
    id: g.id,
    name: g.name
  }));
  res.json(guilds);
});

// API: Comandos recentes
app.get("/api/commands", (req, res) => {
  res.json(commandLog.slice(-10)); // últimos 10 comandos
});

// API: Pausar Bot
app.post("/api/pause", (req, res) => {
  paused = true;
  res.json({ status: "paused" });
});

// API: Ativar Bot
app.post("/api/resume", (req, res) => {
  paused = false;
  res.json({ status: "active" });
});

// Exemplo de registro de comando (simulado)
function registerCommand(user, command) {
  if (!paused) {
    commandLog.push({
      user,
      command,
      date: new Date().toLocaleString()
    });
  }
}

// Simulando comandos (pode substituir pelo evento real do bot)
bot.on("messageCreate", message => {
  if (!paused) registerCommand(message.author.username, message.content);
});

// Porta Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

const express = require("express");
const axios = require("axios");
const session = require("express-session");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();

// Variáveis do Railway
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;

// Express session
app.use(session({
  secret: "tdz-secret",
  resave: false,
  saveUninitialized: false
}));

// Pasta pública
app.use(express.static(path.join(__dirname, "public")));

// Bot Discord
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

bot.once('ready', () => {
  console.log(`Bot online: ${bot.user.tag}`);
});

bot.login(BOT_TOKEN);

// Página inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Login Discord
app.get("/login", (req, res) => {
  const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify%20guilds`;
  res.redirect(url);
});

// Callback Discord
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("Erro ao logar.");

  try {
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get(
      "https://discord.com/api/users/@me",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const guildsResponse = await axios.get(
      "https://discord.com/api/users/@me/guilds",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    req.session.user = userResponse.data;
    req.session.guilds = guildsResponse.data;

    res.redirect("/dashboard");

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.send("Erro na autenticação.");
  }
});

// Dashboard
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");

  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// API: Servidores do Bot
app.get("/api/servers", (req, res) => {
  const guilds = bot.guilds.cache.map(g => ({
    id: g.id,
    name: g.name
  }));
  res.json(guilds);
});

// API: Comandos recentes (placeholder)
app.get("/api/commands", (req, res) => {
  res.json([
    { command: "/teste", user: "Rafa", date: "12/02/2026 22:42" },
    { command: "/divulgar", user: "Lucas", date: "12/02/2026 21:30" }
  ]);
});

// Porta Railway
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando...");
});

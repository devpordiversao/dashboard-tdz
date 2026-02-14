const express = require("express");
const axios = require("axios");
const session = require("express-session");
const path = require("path");

const app = express();

// 🔐 Variáveis do Railway
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

app.use(session({
  secret: "tdz-secret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "public")));

// ✅ Rota principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔥 Login
app.get("/login", (req, res) => {
  const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify%20guilds`;
  res.redirect(url);
});

// 🔥 Callback
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
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get(
      "https://discord.com/api/users/@me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    req.session.user = userResponse.data;

    res.redirect("/dashboard");

  } catch (error) {
    console.error(error);
    res.send("Erro na autenticação.");
  }
});

// 🔥 Dashboard
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.send(`
    <h1>Bem-vindo ${req.session.user.username}</h1>
    <p>ID: ${req.session.user.id}</p>
    <a href="/logout">Sair</a>
  `);
});

// 🔥 Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando..."));

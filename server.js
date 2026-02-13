const express = require("express");
const axios = require("axios");
const session = require("express-session");
const path = require("path");

const app = express();

const CLIENT_ID = "SEU_CLIENT_ID_AQUI";
const CLIENT_SECRET = "SEU_CLIENT_SECRET_AQUI";
const REDIRECT_URI = "https://SEUSITE.com/callback";

app.use(session({
  secret: "tdz-secret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "public")));

app.get("/login", (req, res) => {
  const url = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=identify%20guilds`;
  res.redirect(url);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;

  const tokenResponse = await axios.post("https://discord.com/api/oauth2/token", new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI
  }), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  const accessToken = tokenResponse.data.access_token;

  const userResponse = await axios.get("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const guildsResponse = await axios.get("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  req.session.user = userResponse.data;
  req.session.guilds = guildsResponse.data;

  res.redirect("/dashboard.html");
});

app.get("/api/user", (req, res) => {
  res.json(req.session.user || {});
});

app.get("/api/guilds", (req, res) => {
  res.json(req.session.guilds || []);
});

app.listen(3000, () => console.log("Dashboard rodando na porta 3000"));

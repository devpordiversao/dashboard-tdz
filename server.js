require("dotenv").config();

const express = require("express");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(express.json());

// ---------------- DISCORD BOT ----------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

client.once("ready", () => {
    console.log(`🤖 Bot conectado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

// ---------------- SERVIR HTML ----------------
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html")); // nome do teu HTML
});

// ---------------- ENVIAR MENSAGEM NO CANAL ----------------
app.post("/send-message", async (req, res) => {
    try {
        const { channelId, message } = req.body;

        const channel = await client.channels.fetch(channelId);
        if (!channel) return res.json({ success: false });

        await channel.send(message);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
});

// ---------------- ENVIAR DM ----------------
app.post("/send-dm", async (req, res) => {
    try {
        const { userId, message } = req.body;

        const user = await client.users.fetch(userId);
        if (!user) return res.json({ success: false });

        await user.send(message);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
});

// ---------------- START SERVER ----------------
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🌐 Dashboard rodando em http://localhost:${PORT}`);
});

require("dotenv").config();

const express = require("express");
const path = require("path");
const { Client, GatewayIntentBits, Partials } = require("discord.js");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------- DISCORD BOT ----------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel] // necessário pra DM
});

client.once("ready", () => {
    console.log(`🤖 Bot online: ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

// ---------------- SERVIR HTML ----------------
app.use(express.static(path.join(__dirname))); 
// garante que o dashboard.html abre direto

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
});

// ---------------- ENVIAR MENSAGEM ----------------
app.post("/send-message", async (req, res) => {
    try {
        const { canal, mensagem } = req.body;

        if (!canal || !mensagem) {
            return res.json({ success: false, error: "Dados inválidos" });
        }

        const channel = await client.channels.fetch(canal);

        if (!channel) {
            return res.json({ success: false, error: "Canal não encontrado" });
        }

        await channel.send(mensagem);

        console.log("📨 Mensagem enviada:", mensagem);

        res.json({ success: true });
    } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
        res.json({ success: false, error: "Erro interno" });
    }
});

// ---------------- ENVIAR DM ----------------
app.post("/send-dm", async (req, res) => {
    try {
        const { userId, mensagem } = req.body;

        if (!userId || !mensagem) {
            return res.json({ success: false });
        }

        const user = await client.users.fetch(userId);

        await user.send(mensagem);

        console.log("📩 DM enviada para:", userId);

        res.json({ success: true });
    } catch (err) {
        console.error("Erro DM:", err);
        res.json({ success: false });
    }
});

// ---------------- PORTA (RAILWAY) ----------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🌐 Dashboard rodando na porta ${PORT}`);
});

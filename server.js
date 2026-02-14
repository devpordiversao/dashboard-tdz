const express = require("express");
const path = require("path");
const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");

const app = express();

// Variáveis de ambiente
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Pasta pública
app.use(express.static(path.join(__dirname, "public")));

// Configura bot
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

let paused = false;
let commandLog = [];

// Inicializa bot
bot.once('ready', () => {
    console.log(`Bot online: ${bot.user.tag}`);
});

// Registro de slash commands simples
const commands = [
    {
        name: 'teste',
        description: 'Comando de teste'
    }
];

// Deploy dos comandos (global ou por guild)
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
(async () => {
    try {
        console.log('Registrando comandos...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('Comandos registrados com sucesso!');
    } catch (err) {
        console.error(err);
    }
})();

// Evento de interações
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    if (paused) return;

    // Exemplo de comando
    if (interaction.commandName === 'teste') {
        await interaction.reply('Comando funcionando!');
    }

    // Registrar no dashboard
    commandLog.push({
        user: interaction.user.username,
        command: `/${interaction.commandName}`,
        date: new Date().toLocaleString()
    });
});

// Login do bot
bot.login(BOT_TOKEN);

// Rotas do Dashboard
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

// Porta Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => console.log(`Servidor rodando na porta ${PORT}`));

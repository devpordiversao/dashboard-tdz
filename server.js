// server.js - Adicione estas rotas
app.post('/send-message', async (req, res) => {
    const { canal, mensagem } = req.body;
    
    try {
        // Seu código do Discord.js aqui
        // const channel = await client.channels.fetch(canalId);
        // await channel.send(mensagem);
        
        res.json({ ok: true });
    } catch (error) {
        res.json({ ok: false, error: error.message });
    }
});

app.post('/send-dm', async (req, res) => {
    const { userId, mensagem } = req.body;
    
    try {
        // const user = await client.users.fetch(userId);
        // await user.send(mensagem);
        
        res.json({ ok: true });
    } catch (error) {
        res.json({ ok: false, error: error.message });
    }
});

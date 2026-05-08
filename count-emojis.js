require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const c = new Client({ intents: [GatewayIntentBits.Guilds] });
c.once('ready', () => {
    const g = c.guilds.cache.first();
    const s = g.emojis.cache.filter(e => !e.animated).size;
    const a = g.emojis.cache.filter(e => e.animated).size;
    console.log(`Static: ${s} | Animated: ${a} | Total: ${s + a}`);
    c.destroy();
});
c.login(process.env.DISCORD_TOKEN);

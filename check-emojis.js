require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const c = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers] });
c.once('ready', async () => {
    const g = c.guilds.cache.get(process.env.GUILD_ID);
    const emojis = g.emojis.cache;
    const animated = emojis.filter(e => e.animated);
    const notAnimated = emojis.filter(e => !e.animated);
    console.log('Total emojis:', emojis.size);
    console.log('Animated:', animated.size, '/ Static:', notAnimated.size);
    console.log('Boost level:', g.premiumTier, '- Boosts:', g.premiumSubscriptionCount);

    const maxAnimated = g.premiumTier === 0 ? 50 : g.premiumTier === 1 ? 100 : g.premiumTier === 2 ? 150 : 250;
    console.log('Animated limit:', maxAnimated, '- Free:', maxAnimated - animated.size);

    console.log('\nAnimated emojis:');
    animated.forEach(e => console.log(' ', e.name, '-', e.id));

    process.exit(0);
});
c.login(process.env.DISCORD_TOKEN);

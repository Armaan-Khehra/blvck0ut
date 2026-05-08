require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Check for the souls emoji
    const emojiId = '1473022445559746612';
    const emoji = client.emojis.cache.get(emojiId);

    if (emoji) {
        console.log(`✓ Found emoji: ${emoji.name} (${emoji.id}) - animated: ${emoji.animated}`);
        console.log(`  Format: <${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`);
        console.log(`  Guild: ${emoji.guild?.name}`);
    } else {
        console.log(`✗ Emoji ${emojiId} NOT FOUND in any guild the bot is in`);
    }

    // List all animated emojis that could be the souls emoji
    console.log('\nAll animated emojis the bot can see:');
    const animated = client.emojis.cache.filter(e => e.animated);
    animated.forEach(e => {
        console.log(`  <a:${e.name}:${e.id}> — ${e.name} (${e.guild?.name})`);
    });

    // Also check for any emoji with 'soul' or 'z_' in the name
    console.log('\nEmojis matching "soul" or "z_" or "z":');
    const matches = client.emojis.cache.filter(e =>
        e.name.toLowerCase().includes('soul') ||
        e.name.toLowerCase().includes('z_') ||
        e.name === 'z' ||
        e.name === 'z_'
    );
    matches.forEach(e => {
        console.log(`  <${e.animated ? 'a' : ''}:${e.name}:${e.id}> — ${e.name} (animated: ${e.animated})`);
    });

    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);

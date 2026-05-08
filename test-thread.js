require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Try to send a message to the About Our Economy thread
    const THREAD_ID = '1474670653268299959';

    try {
        console.log('Fetching thread...');
        const channel = await client.channels.fetch(THREAD_ID);
        console.log(`Found channel: ${channel?.name} (type: ${channel?.type})`);
        console.log(`Is thread: ${channel?.isThread?.()}`);
        console.log(`Archived: ${channel?.archived}`);
        console.log(`Locked: ${channel?.locked}`);

        if (channel.archived) {
            console.log('Unarchiving thread...');
            await channel.setArchived(false);
        }

        console.log('Sending test message...');
        const msg = await channel.send({ content: 'Test message from bot - delete me' });
        console.log(`Message sent! ID: ${msg.id}`);

        // Now test an embed
        console.log('Sending test embed...');
        const embed = new EmbedBuilder()
            .setColor(0x0d0d0d)
            .setDescription('Test embed - delete me');
        const msg2 = await channel.send({ embeds: [embed] });
        console.log(`Embed sent! ID: ${msg2.id}`);

        // Clean up
        await msg.delete();
        await msg2.delete();
        console.log('Test messages cleaned up. Everything works!');
    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('Full error:', error);
    }

    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);

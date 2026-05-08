require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const c = new Client({ intents: [GatewayIntentBits.Guilds] });

c.once('ready', async () => {
    const g = c.guilds.cache.get(process.env.GUILD_ID);
    // Send to shop channel, then delete the message but keep the attachment URL
    const channel = g.channels.cache.get('1473715246962184304');
    if (!channel) {
        console.log('Channel not found');
        process.exit(1);
    }

    const attachment = new AttachmentBuilder('./spacer.png', { name: 'spacer.png' });
    const msg = await channel.send({ files: [attachment] });
    const url = msg.attachments.first().url;
    console.log('Spacer URL:', url);
    await msg.delete();
    console.log('Message deleted, URL still works');
    process.exit(0);
});

c.login(process.env.DISCORD_TOKEN);

require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const config = require('./config');
const path = require('path');

const CHANNEL_ID = '1483842575340273664';
const BANNER_PATH = path.join(__dirname, 'assets', 'welcome-banner.png');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const banner = new AttachmentBuilder(BANNER_PATH, { name: 'welcome-banner.png' });

    const line = '<a:A_white_line:1450681652270600274>';
    const border = line.repeat(16);

    const msg1 = `${border}
<a:black_cross:1415493337808506914><:B_letter_b:842901060624187402><:B_letter_l:842901059206119444><:B_letter_v:842901059521609728><:B_letter_c:842901060829839370><:B_letter_k:842901059873538090><:B_letter_o:842901060678451200><:B_letter_u:842901060141056051><:B_letter_t:842901059005579274><a:blackparasol:1482371456188022925>
**  **
**Dear soul, thanks for stepping into the void. Hope you survive every moment you spend here. Welcome to the BLVCK<a:o_black_rose:1482371495882784799>UT
**
-# <:9a_black_cosmetic:1406547332081778789>from the shadows — **<@&1472744407294939220>**<a:001_blackheart:1475235856725049585>`;

    const msg2 = `<:02star:1479049924036399262> <#1471599230492610645>
<:02star:1479049924036399262> <#1471599230492610648>
<:02star:1479049924036399262> <#1471599231528861865>
***<:stars:1482371516703314052>ʙʟᴠᴄᴋᴏᴜᴛ — lights off. morals gone.<a:black_awk:1385436579023028256>***
${border}`;

    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel) {
            console.error('Channel not found!');
            process.exit(1);
        }

        // Delete old bot messages
        const messages = await channel.messages.fetch({ limit: 20 });
        const botMessages = messages.filter(m => m.author.id === client.user.id);
        for (const [, msg] of botMessages) {
            await msg.delete().catch(() => {});
            console.log(`Deleted old message: ${msg.id}`);
        }

        // Send in order: banner -> main text -> channels + tagline + border
        await channel.send({ files: [banner] });
        await channel.send({ content: msg1 });
        await channel.send({ content: msg2 });

        console.log(`Welcome message sent to #${channel.name}!`);
    } catch (err) {
        console.error('Failed to send welcome message:', err.message);
    }

    client.destroy();
    process.exit(0);
});

client.login(config.token);

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');

const CHANNEL_ID = '1471599230492610645';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const rulesText = `# ⛧ SERVER LAW ⛧
### I. This server is 16+ and toxic.
We talk shit, we roast, we don't baby anyone. If you can't handle it, leave.
### II. No slurs.
Being toxic is one thing. Slurs are another. No racial, homophobic, or any other slurs. You will get warned, then banned.
### III. No raids or threats.
No doxxing, no threats, no illegal content.
### IV. Keep content in the right channels.
Media → <#1471599230702321957>
Bots → <#1471599230702321958>
### V. No NSFW allowed.
This includes images, links, and messages. You will get yourself banned.
### VI. Toxicity ≠ Harassment.
Banter and roasting are fine. Genuine targeted harassment is not. Know the difference or get removed.
### VII. Do not impersonate staff or members.
### VIII. Follow Discord ToS at all times.
### IX. Staff word is final.
Arguing moderation publicly will get you muted.
────────────────
*Need help or want to report someone?*
Use: \`/report\`
For ANY server-related issue.
Breaking the law results in mute, kick, or ban.
No warnings guaranteed.`;

    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel) {
            console.error('Channel not found!');
            process.exit(1);
        }

        await channel.send(rulesText);
        console.log(`Rules sent to #${channel.name}!`);
    } catch (err) {
        console.error('Failed to send rules:', err.message);
    }

    client.destroy();
    process.exit(0);
});

client.login(config.token);

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const EMOJIS_TO_UPLOAD = [
    { name: 'blackfire', url: 'https://cdn3.emoji.gg/emojis/2849-blackfire.gif' },
    { name: 'blackbat', url: 'https://cdn3.emoji.gg/emojis/8243-blackbat.gif' },
    { name: 'blackrose', url: 'https://cdn3.emoji.gg/emojis/8715-rose-black.gif' },
    { name: 'heartdrip', url: 'https://cdn3.emoji.gg/emojis/5956-blackheart-drip.gif' },
    { name: 'darkskull', url: 'https://cdn3.emoji.gg/emojis/4386-skull-2.gif' },
    { name: 'darkcross', url: 'https://cdn3.emoji.gg/emojis/7277-cross-3.gif' },
    { name: 'crystalheart', url: 'https://cdn3.emoji.gg/emojis/7059-black-crystal-heart.gif' },
    { name: 'glowskull', url: 'https://cdn3.emoji.gg/emojis/319907-skullglowingeyes.gif' },
    { name: 'blackpuff', url: 'https://cdn3.emoji.gg/emojis/1278-heart-black-puff.gif' },
    { name: 'darkchain', url: 'https://cdn3.emoji.gg/emojis/7934-upsidedowncross.gif' },
];

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
        console.error('Guild not found');
        process.exit(1);
    }

    console.log(`Uploading ${EMOJIS_TO_UPLOAD.length} emojis to ${guild.name}...\n`);

    const results = [];

    for (const emoji of EMOJIS_TO_UPLOAD) {
        try {
            const created = await guild.emojis.create({
                attachment: emoji.url,
                name: emoji.name,
            });
            const format = created.animated ? 'a' : '';
            const emojiString = `<${format}:${created.name}:${created.id}>`;
            console.log(`✓ ${emoji.name} → ${emojiString} (ID: ${created.id})`);
            results.push({ name: emoji.name, id: created.id, animated: created.animated, string: emojiString });
        } catch (err) {
            console.error(`✗ ${emoji.name} — ${err.message}`);
        }
    }

    console.log('\n═══ RESULTS ═══');
    console.log('Copy this into shoppost.js:\n');
    console.log('const SHOP_EMOJIS = {');
    for (const r of results) {
        const a = r.animated ? 'a' : '';
        console.log(`    ${r.name}: '<${a}:${r.name}:${r.id}>',`);
    }
    console.log('};');

    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);

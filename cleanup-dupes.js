require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const guild = client.guilds.cache.first();
    if (!guild) { console.error('No guild'); process.exit(1); }

    const emojis = guild.emojis.cache;
    console.log(`Total emojis: ${emojis.size}`);

    // Also remove test_upload_1
    const testEmoji = emojis.find(e => e.name === 'test_upload_1');
    if (testEmoji) {
        await testEmoji.delete().catch(() => {});
        console.log('Deleted test_upload_1');
    }

    // Group by name, find duplicates
    const groups = {};
    emojis.forEach(e => {
        if (!groups[e.name]) groups[e.name] = [];
        groups[e.name].push(e);
    });

    let deleted = 0;
    for (const [name, list] of Object.entries(groups)) {
        if (list.length <= 1) continue;

        // Keep the first one (oldest), delete the rest
        const toDelete = list.slice(1);
        console.log(`"${name}" has ${list.length} copies — deleting ${toDelete.length}`);

        for (const e of toDelete) {
            try {
                await e.delete();
                console.log(`  DEL ${e.id}`);
                deleted++;
                await sleep(1500);
            } catch (err) {
                console.error(`  FAIL ${e.id}: ${err.message}`);
            }
        }
    }

    console.log(`\nDone! Deleted ${deleted} duplicates.`);
    const remaining = guild.emojis.cache.size;
    console.log(`Emojis remaining: ${remaining}`);

    client.destroy();
    process.exit(0);
});

client.login(config.token);

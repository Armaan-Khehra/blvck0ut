require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const c = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers] });

// Delete these unused ones to make room
const TO_DELETE = [
    '1472057311152439367', // black (duplicate)
    '1472059655130710056', // lmaoo
    '1472109673388970226', // tits
    '1472058993951585892', // 2pinkalert - try alternate ID
    '1472058031591260323', // bnanascker
];

// Upload these new gothic ones
const TO_UPLOAD = [
    { name: 'darkcross', url: 'https://cdn3.emoji.gg/emojis/7277-cross-3.gif' },
    { name: 'crystalheart', url: 'https://cdn3.emoji.gg/emojis/7059-black-crystal-heart.gif' },
    { name: 'blackpuff', url: 'https://cdn3.emoji.gg/emojis/1278-heart-black-puff.gif' },
    { name: 'darkribbon', url: 'https://cdn3.emoji.gg/emojis/4297_black_ribbon.gif' },
    { name: 'darkwand', url: 'https://cdn3.emoji.gg/emojis/5554-black-wand.gif' },
];

c.once('ready', async () => {
    const g = c.guilds.cache.get(process.env.GUILD_ID);
    console.log(`Connected to ${g.name}`);

    // Delete old ones
    let deleted = 0;
    for (const id of TO_DELETE) {
        try {
            const emoji = g.emojis.cache.get(id);
            if (emoji) {
                await emoji.delete();
                console.log(`✗ Deleted: ${emoji.name} (${id})`);
                deleted++;
            } else {
                console.log(`- Not found: ${id}`);
            }
        } catch (err) {
            console.log(`- Failed to delete ${id}: ${err.message}`);
        }
    }
    console.log(`\nDeleted ${deleted} emojis. Uploading ${TO_UPLOAD.length} new ones...\n`);

    // Upload new ones
    const results = [];
    for (const emoji of TO_UPLOAD) {
        try {
            const created = await g.emojis.create({ attachment: emoji.url, name: emoji.name });
            const a = created.animated ? 'a' : '';
            const str = `<${a}:${created.name}:${created.id}>`;
            console.log(`✓ ${emoji.name} → ${str}`);
            results.push({ name: emoji.name, id: created.id, animated: created.animated, str });
        } catch (err) {
            console.error(`✗ ${emoji.name}: ${err.message}`);
        }
    }

    console.log('\n═══ ALL SHOP EMOJIS ═══\n');
    const existing = [
        { name: 'blackfire', id: '1473778355307286620' },
        { name: 'blackbat', id: '1473778357392117911' },
        { name: 'blackrose', id: '1473778362102190202' },
        { name: 'heartdrip', id: '1473778363528249410' },
        { name: 'darkskull', id: '1473778367835803870' },
    ];
    const all = [...existing.map(e => ({ ...e, str: `<a:${e.name}:${e.id}>` })), ...results];
    for (const e of all) {
        console.log(`${e.name}: '${e.str}',`);
    }

    process.exit(0);
});

c.login(process.env.DISCORD_TOKEN);

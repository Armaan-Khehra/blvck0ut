require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Exact same pattern as upload-dark-emojis.js which successfully uploaded 50
const EMOJIS = [
    { name: 'black_heart2', url: 'https://cdn3.emoji.gg/emojis/94188-blackheart.png' },
    { name: 'black_crown', url: 'https://cdn3.emoji.gg/emojis/1272-black-crown.png' },
    { name: 'goth_heart', url: 'https://cdn3.emoji.gg/emojis/80412-blackgothheart.png' },
    { name: 'marble_heart', url: 'https://cdn3.emoji.gg/emojis/38053-black-marble-heart.png' },
    { name: 'gothic_choker', url: 'https://cdn3.emoji.gg/emojis/11565-gothic-choker.png' },
    { name: 'darksaber', url: 'https://cdn3.emoji.gg/emojis/10342-darksaber.png' },
    { name: 'dark_goth_heart', url: 'https://cdn3.emoji.gg/emojis/21779-dark-goth-heart.png' },
    { name: 'black_lolipop', url: 'https://cdn3.emoji.gg/emojis/70883-black-lolipop.png' },
    { name: 'gothic_card', url: 'https://cdn3.emoji.gg/emojis/81692-gothic-card.png' },
    { name: 'gothic_crown', url: 'https://cdn3.emoji.gg/emojis/50553-gothic-crown.png' },
    { name: 'goth_black_cross', url: 'https://cdn3.emoji.gg/emojis/28632-gothblackcross.png' },
    { name: 'goth_heart2', url: 'https://cdn3.emoji.gg/emojis/15934-goth-heart.png' },
    { name: 'devil_woman', url: 'https://cdn3.emoji.gg/emojis/88709-devildarkwoman.png' },
    { name: 'y2k_star', url: 'https://cdn3.emoji.gg/emojis/98496-y2k-star2.png' },
    { name: 'goth_star', url: 'https://cdn3.emoji.gg/emojis/1983-goth-star.png' },
    { name: 'starry_moon', url: 'https://cdn3.emoji.gg/emojis/79071-starrymoon.png' },
    { name: 'purple_ghost', url: 'https://cdn3.emoji.gg/emojis/91577-purple-ghost.png' },
    { name: 'black_eggplant', url: 'https://cdn3.emoji.gg/emojis/3227_black_eggplant.png' },
    { name: 'black_paw', url: 'https://cdn3.emoji.gg/emojis/2740_PawPrint_Black.png' },
    { name: 'black_teddy', url: 'https://cdn3.emoji.gg/emojis/20051-black-teddybear.png' },
    { name: 'red_black_crown', url: 'https://cdn3.emoji.gg/emojis/49757-redblackcrown.png' },
    { name: 'goth_envelope', url: 'https://cdn3.emoji.gg/emojis/36577-goth-envelope.png' },
    { name: 'pastel_goth_heart', url: 'https://cdn3.emoji.gg/emojis/2076-pastelgothheart.png' },
    { name: 'glossy_heart', url: 'https://cdn3.emoji.gg/emojis/98310-glossyheart.png' },
    { name: 'gothic_teddybear', url: 'https://cdn3.emoji.gg/emojis/44942-gothic-teddybear.png' },
    { name: 'purple_sakura_heart', url: 'https://cdn3.emoji.gg/emojis/13125-purplesakuragothheart.png' },
    { name: 'goth_cupcake', url: 'https://cdn3.emoji.gg/emojis/42825-goth-cupcake.png' },
    { name: 'goth_juice', url: 'https://cdn3.emoji.gg/emojis/90148-goth-juice.png' },
    { name: 'emo_notebook', url: 'https://cdn3.emoji.gg/emojis/71559-emo-notebook.png' },
    { name: 'black_playboy', url: 'https://cdn3.emoji.gg/emojis/5523_Black_palyboi.png' },
    { name: 'black_cri', url: 'https://cdn3.emoji.gg/emojis/8981_black_cri.png' },
    { name: 'lolipop_black', url: 'https://cdn3.emoji.gg/emojis/7876-lolipop-black.png' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const guild = client.guilds.cache.first();
    if (!guild) {
        console.error('No guild found');
        process.exit(1);
    }

    const existingNames = new Set(guild.emojis.cache.map(e => e.name.toLowerCase()));
    console.log(`Existing: ${existingNames.size} emojis`);

    let uploaded = 0;
    let failed = 0;
    let skipped = 0;

    for (const emoji of EMOJIS) {
        if (existingNames.has(emoji.name.toLowerCase())) {
            skipped++;
            continue;
        }
        try {
            await guild.emojis.create({ attachment: emoji.url, name: emoji.name });
            console.log(`✅ Uploaded: ${emoji.name}`);
            uploaded++;
            await sleep(3000);
        } catch (err) {
            console.error(`❌ Failed: ${emoji.name} — ${err.message}`);
            failed++;
            if (err.message.includes('rate limit') || err.status === 429) {
                console.log('⏳ Rate limited, waiting 60 seconds...');
                await sleep(60000);
            }
            await sleep(2000);
        }
    }

    console.log(`\n━━━ Done ━━━`);
    console.log(`✅ Uploaded: ${uploaded}`);
    console.log(`❌ Failed: ${failed}`);

    client.destroy();
    process.exit(0);
});

client.login(config.token);

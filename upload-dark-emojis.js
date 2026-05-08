require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Curated dark/gothic/edgy emojis from emoji.gg packs
const EMOJIS = [
    // ── Animated dark aesthetic ──
    { name: 'blackfire2', url: 'https://cdn3.emoji.gg/emojis/2849-blackfire.gif' },
    { name: 'black_drip_heart', url: 'https://cdn3.emoji.gg/emojis/1434-black-drip-heart.gif' },
    { name: 'black_drip_heart2', url: 'https://cdn3.emoji.gg/emojis/4013-black-drip-heart-2.gif' },
    { name: 'black_heart_glow', url: 'https://cdn3.emoji.gg/emojis/6488-black-heart.gif' },
    { name: 'black_wings', url: 'https://cdn3.emoji.gg/emojis/7770-black-wings.gif' },
    { name: 'black_wand', url: 'https://cdn3.emoji.gg/emojis/5554-black-wand.gif' },
    { name: 'black_world', url: 'https://cdn3.emoji.gg/emojis/6601-black-world.gif' },
    { name: 'black_verify', url: 'https://cdn3.emoji.gg/emojis/3055-black-verify.gif' },
    { name: 'black_butterfly', url: 'https://cdn3.emoji.gg/emojis/3451_black_butterfly.gif' },
    { name: 'black_hearts_spin', url: 'https://cdn3.emoji.gg/emojis/3935_hearts_black.gif' },
    { name: 'pixel_butterflies', url: 'https://cdn3.emoji.gg/emojis/8463_butterflies_pixelblack.gif' },
    { name: 'black_mended', url: 'https://cdn3.emoji.gg/emojis/3915-black-mendedheart.gif' },
    { name: 'gothic_cross', url: 'https://cdn3.emoji.gg/emojis/26515-gothic-cross.gif' },
    { name: 'dark_cross', url: 'https://cdn3.emoji.gg/emojis/54446-cross.gif' },
    { name: 'gothic_cross2', url: 'https://cdn3.emoji.gg/emojis/684179-cross.gif' },
    { name: 'goth_heart_gif', url: 'https://cdn3.emoji.gg/emojis/5680-blackgothheartgif.gif' },
    { name: 'blueblack_heart', url: 'https://cdn3.emoji.gg/emojis/89181-blueblackheartgif.gif' },
    { name: 'goth_bow_gif', url: 'https://cdn3.emoji.gg/emojis/85022-gothbowgif.gif' },
    { name: 'fire_black', url: 'https://cdn3.emoji.gg/emojis/91149-fire-black.gif' },
    { name: 'dark_potion', url: 'https://cdn3.emoji.gg/emojis/5098-black-purple-potion.gif' },
    { name: 'purple_crown', url: 'https://cdn3.emoji.gg/emojis/2586-purplecrown.gif' },
    { name: 'purple_black_heart', url: 'https://cdn3.emoji.gg/emojis/40760-purplenblackglowheart.gif' },
    { name: 'black_bat2', url: 'https://cdn3.emoji.gg/emojis/8243-blackbat.gif' },
    { name: 'verify_black', url: 'https://cdn3.emoji.gg/emojis/5106-verify-black.gif' },
    { name: 'cat_depression', url: 'https://cdn3.emoji.gg/emojis/4095-cat-depression.gif' },
    { name: 'emoshit', url: 'https://cdn3.emoji.gg/emojis/3342-emoshit.gif' },
    { name: 'black_lol', url: 'https://cdn3.emoji.gg/emojis/1922_black_lol.gif' },
    { name: 'pixel_kiss_dark', url: 'https://cdn3.emoji.gg/emojis/3793-pixel-emoji-kissing-heart-anim.gif' },
    { name: 'pixel_wink_dark', url: 'https://cdn3.emoji.gg/emojis/1885-pixel-emoji-winks-anim.gif' },
    { name: 'check_bw', url: 'https://cdn3.emoji.gg/emojis/8632-chech-bw.gif' },
    { name: 'purple_paws', url: 'https://cdn3.emoji.gg/emojis/42507-purplepaws.gif' },
    { name: 'haunter_spin', url: 'https://cdn3.emoji.gg/emojis/7588-haunterspin.gif' },
    { name: 'black_lv', url: 'https://cdn3.emoji.gg/emojis/6697-black-lv.gif' },
    { name: 'kitty_laptop', url: 'https://cdn3.emoji.gg/emojis/45218-kittylaptop.gif' },

    // ── Static dark aesthetic ──
    { name: 'inverted_cross', url: 'https://cdn3.emoji.gg/emojis/8981-invertedcross.png' },
    { name: 'gothic_bow', url: 'https://cdn3.emoji.gg/emojis/5561-gothicbow.png' },
    { name: 'black_rose2', url: 'https://cdn3.emoji.gg/emojis/1256-f-blackrose.png' },
    { name: 'cute_but_psycho', url: 'https://cdn3.emoji.gg/emojis/8139_cute_but_psycho.png' },
    { name: 'black_ribbon', url: 'https://cdn3.emoji.gg/emojis/2163_non_animated_black_ribbon.png' },
    { name: 'shiny_black_heart', url: 'https://cdn3.emoji.gg/emojis/8858_ShinyBlackHeart.png' },
    { name: 'black_uwu', url: 'https://cdn3.emoji.gg/emojis/9273_BlackUwU.png' },
    { name: 'black_sparkles', url: 'https://cdn3.emoji.gg/emojis/6238_BlackSparkles.png' },
    { name: 'black_book', url: 'https://cdn3.emoji.gg/emojis/1784_black_book.png' },
    { name: 'black_gem', url: 'https://cdn3.emoji.gg/emojis/3044_black_gem.png' },
    { name: 'blacker_heart', url: 'https://cdn3.emoji.gg/emojis/2988_blacker_heart.png' },
    { name: 'death_note', url: 'https://cdn3.emoji.gg/emojis/7520_death_note_book.png' },
    { name: 'baphomet', url: 'https://cdn3.emoji.gg/emojis/1866-baphomet.png' },
    { name: 'hypnosis_heart', url: 'https://cdn3.emoji.gg/emojis/7123-hypnosis-heart.png' },
    { name: 'black_bow2', url: 'https://cdn3.emoji.gg/emojis/34909-blackbow.png' },
    { name: 'skull_bow', url: 'https://cdn3.emoji.gg/emojis/9552-gothic-skull-bow.png' },
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

// Delay helper to avoid rate limits
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const guild = client.guilds.cache.first();
    if (!guild) {
        console.error('No guild found!');
        process.exit(1);
    }

    // Get existing emoji names to avoid duplicates
    const existingNames = new Set(guild.emojis.cache.map(e => e.name.toLowerCase()));
    console.log(`Server has ${existingNames.size} existing emojis`);

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const emoji of EMOJIS) {
        if (existingNames.has(emoji.name.toLowerCase())) {
            console.log(`⏭  Skipping "${emoji.name}" — already exists`);
            skipped++;
            continue;
        }

        try {
            await guild.emojis.create({ attachment: emoji.url, name: emoji.name });
            console.log(`✅ Uploaded: ${emoji.name}`);
            uploaded++;
            // Rate limit: Discord allows ~50 emoji creates per hour
            // Wait 3 seconds between uploads to be safe
            await sleep(3000);
        } catch (err) {
            console.error(`❌ Failed: ${emoji.name} — ${err.message}`);
            failed++;
            // If rate limited, wait longer
            if (err.message.includes('rate limit') || err.status === 429) {
                console.log('⏳ Rate limited, waiting 60 seconds...');
                await sleep(60000);
            }
            await sleep(2000);
        }
    }

    console.log(`\n━━━ Done ━━━`);
    console.log(`✅ Uploaded: ${uploaded}`);
    console.log(`⏭  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Total: ${EMOJIS.length}`);

    client.destroy();
    process.exit(0);
});

client.login(config.token);

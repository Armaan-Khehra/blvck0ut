// ─── Monster Emoji Upload & Cache System ───
// Uploads custom emojis to the server on first run, caches IDs in JSON file.
// Subsequent runs read from cache. If an emoji is missing, re-uploads it.

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const CACHE_FILE = path.join(__dirname, '../data/monster-emojis.json');

// Rarity dot emojis (static PNGs — use static emoji slots)
const RARITY_EMOJI_SOURCES = {
    r_common:    'https://cdn3.emoji.gg/emojis/99049-blackdot.png',
    r_uncommon:  'https://cdn3.emoji.gg/emojis/47306-greendot.png',
    r_rare:      'https://cdn3.emoji.gg/emojis/32352-darkbluedot.png',
    r_epic:      'https://cdn3.emoji.gg/emojis/57540-purpledot.png',
    r_legendary: 'https://cdn3.emoji.gg/emojis/72836-goldendot.png',
};

// Monster ID → image URL mapping (from emoji.gg CDN — animated GIFs, cartoonish/collectible style)
const EMOJI_SOURCES = {
    // ─── COMMON (10) ───
    ghoul:        'https://cdn3.emoji.gg/emojis/78325-spiffopop.gif',
    plaguebearer: 'https://cdn3.emoji.gg/emojis/34550-poison.gif',
    husk:         'https://cdn3.emoji.gg/emojis/363741-skeletonbash.gif',
    thrall:       'https://cdn3.emoji.gg/emojis/6576-metalslug-undead.gif',
    corpsefly:    'https://cdn3.emoji.gg/emojis/278845-cornershaking.gif',
    rotling:      'https://cdn3.emoji.gg/emojis/48238-mushroombounce.gif',
    ashwalker:    'https://cdn3.emoji.gg/emojis/2144-fire.gif',
    bonerat:      'https://cdn3.emoji.gg/emojis/8061-ratjam.gif',
    cryptmaw:     'https://cdn3.emoji.gg/emojis/605250-skull.gif',
    hollowborn:   'https://cdn3.emoji.gg/emojis/81502-ghost.gif',

    // ─── UNCOMMON (10) ───
    wraith:       'https://cdn3.emoji.gg/emojis/341711-ghost.gif',
    gravecrawler: 'https://cdn3.emoji.gg/emojis/97026-spiderweb.gif',
    nightstalker: 'https://cdn3.emoji.gg/emojis/41929-bat.gif',
    bonewitch:    'https://cdn3.emoji.gg/emojis/74289-witchmymelody.gif',
    skinwearer:   'https://cdn3.emoji.gg/emojis/678398-thering.gif',
    marrowfiend:  'https://cdn3.emoji.gg/emojis/75702-flashingskull.gif',
    soulleech:    'https://cdn3.emoji.gg/emojis/32528-potion.gif',
    tombguard:    'https://cdn3.emoji.gg/emojis/172501-deusvultyes.gif',
    duskwolf:     'https://cdn3.emoji.gg/emojis/6653-wolfdance.gif',
    mirefang:     'https://cdn3.emoji.gg/emojis/25102-sneakysnake.gif',

    // ─── RARE (8) ───
    banshee:      'https://cdn3.emoji.gg/emojis/698613-ghostcry.gif',
    fleshweaver:  'https://cdn3.emoji.gg/emojis/817164-jackenstein.gif',
    revenant:     'https://cdn3.emoji.gg/emojis/491410-knight.gif',
    shadowfiend:  'https://cdn3.emoji.gg/emojis/256057-shadowboum.gif',
    plaguedoctor: 'https://cdn3.emoji.gg/emojis/71858-brew.gif',
    nighthag:     'https://cdn3.emoji.gg/emojis/909230-jackensteindanceparent.gif',
    cryptwyrm:    'https://cdn3.emoji.gg/emojis/56677-firebreathingdragon.gif',
    dreadweaver:  'https://cdn3.emoji.gg/emojis/19490-spiderweb.gif',

    // ─── EPIC (6) ───
    nosferatu:    'https://cdn3.emoji.gg/emojis/137055-vamp.gif',
    deathknight:  'https://cdn3.emoji.gg/emojis/399378-neonwarrior.gif',
    abomination:  'https://cdn3.emoji.gg/emojis/75929-slimemonster.gif',
    grimreaver:   'https://cdn3.emoji.gg/emojis/387466-flamingfiresword.gif',
    soulforger:   'https://cdn3.emoji.gg/emojis/8903-rainbow-flames-skull.gif',
    lichpriest:   'https://cdn3.emoji.gg/emojis/20409-magicbook.gif',

    // ─── LEGENDARY (5) ───
    bloodqueen:   'https://cdn3.emoji.gg/emojis/96383-shalltear.gif',
    voidreaper:   'https://cdn3.emoji.gg/emojis/263991-grimreaper.gif',
    archlich:     'https://cdn3.emoji.gg/emojis/319907-skullglowingeyes.gif',
    demonlord:    'https://cdn3.emoji.gg/emojis/66464-felizao.gif',
    eternalwarden:'https://cdn3.emoji.gg/emojis/20756-irongolem.gif',
};

// In-memory cache: { monsterId: { id: '123', name: 'h_ghoul', animated: false, full: '<:h_ghoul:123>' } }
let emojiCache = {};

/**
 * Load cached emoji IDs from disk
 */
function loadCache() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            emojiCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            return true;
        }
    } catch (err) {
        logger.error('Failed to load monster emoji cache:', err.message);
    }
    return false;
}

/**
 * Save emoji IDs to disk
 */
function saveCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(emojiCache, null, 2));
    } catch (err) {
        logger.error('Failed to save monster emoji cache:', err.message);
    }
}

/**
 * Upload missing monster emojis to the guild.
 * Called once on bot startup from ready.js.
 * Deletes outdated h_ emojis and re-uploads if source URL changed.
 * @param {Guild} guild - The Discord guild to upload emojis to
 */
async function setupMonsterEmojis(guild) {
    loadCache();

    const existing = await guild.emojis.fetch();
    let uploaded = 0;
    let skipped = 0;
    let deleted = 0;

    // Upload all emojis (monsters + rarity gems)
    const allSources = { ...EMOJI_SOURCES, ...RARITY_EMOJI_SOURCES };

    for (const [emojiId, imageUrl] of Object.entries(allSources)) {
        // Rarity emojis already have their prefix (r_common), monsters need h_ prefix
        const emojiName = emojiId.startsWith('r_') ? emojiId : `h_${emojiId}`;

        // Check if already cached AND still exists in guild AND same source URL
        if (emojiCache[emojiId]) {
            const stillExists = existing.has(emojiCache[emojiId].id);
            const sameSource = emojiCache[emojiId].sourceUrl === imageUrl;

            if (stillExists && sameSource) {
                skipped++;
                continue;
            }

            // Source changed or emoji missing — delete old one if it still exists
            if (stillExists && !sameSource) {
                try {
                    const oldEmoji = existing.get(emojiCache[emojiId].id);
                    if (oldEmoji) {
                        await oldEmoji.delete('Replacing with updated emoji');
                        deleted++;
                        logger.info(`Deleted outdated emoji: ${emojiName}`);
                        await new Promise(r => setTimeout(r, 500));
                    }
                } catch (err) {
                    logger.error(`Failed to delete old emoji ${emojiName}: ${err.message}`);
                }
            }
        }

        try {
            const emoji = await guild.emojis.create({
                attachment: imageUrl,
                name: emojiName,
                reason: 'Monster hunting system emoji',
            });

            emojiCache[emojiId] = {
                id: emoji.id,
                name: emoji.name,
                animated: emoji.animated,
                full: emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`,
                sourceUrl: imageUrl,
            };

            uploaded++;
            logger.info(`Uploaded monster emoji: ${emojiName} (${emoji.id})`);

            // Small delay to avoid rate limits
            await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
            logger.error(`Failed to upload emoji ${emojiName}: ${err.message}`);
        }
    }

    saveCache();
    logger.info(`Monster emojis: ${uploaded} uploaded, ${skipped} cached, ${deleted} replaced`);
}

/**
 * Get the custom emoji string for a monster.
 * @param {string} monsterId
 * @param {string} [fallback] - Fallback unicode emoji
 * @returns {string}
 */
function getMonsterEmoji(monsterId, fallback = '❓') {
    if (emojiCache[monsterId] && emojiCache[monsterId].full) {
        return emojiCache[monsterId].full;
    }
    return fallback;
}

/**
 * Get the custom emoji string for a rarity tier.
 * @param {string} rarity - e.g. 'common', 'epic', 'legendary'
 * @param {string} [fallback] - Fallback unicode emoji
 * @returns {string}
 */
function getRarityEmoji(rarity, fallback = '⚪') {
    const key = `r_${rarity}`;
    if (emojiCache[key] && emojiCache[key].full) {
        return emojiCache[key].full;
    }
    return fallback;
}

/**
 * Get the original image URL for a monster (for embed thumbnails)
 * @param {string} monsterId
 * @returns {string|null}
 */
function getMonsterImageUrl(monsterId) {
    return EMOJI_SOURCES[monsterId] || null;
}

/**
 * Check if emojis are loaded
 */
function isEmojiCacheLoaded() {
    return Object.keys(emojiCache).length > 0;
}

// Try loading cache on require (synchronous, for immediate use)
loadCache();

module.exports = {
    setupMonsterEmojis,
    getMonsterEmoji,
    getRarityEmoji,
    getMonsterImageUrl,
    isEmojiCacheLoaded,
    loadCache,
    EMOJI_SOURCES,
    RARITY_EMOJI_SOURCES,
};

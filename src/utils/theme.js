// ─── Animated emoji names (as uploaded to Discord) ───
// Resolved dynamically from the bot's emoji cache at runtime
const ANIMATED_EMOJI_NAMES = {
    fire:    'blackfire',
    bat:     'blackbat',
    rose:    'blackrose',
    heart:   'heartdrip',
    skull:   'darkskull',
    cross:   'darkcross',
    crystal: 'crystalheart',
    puff:    'blackpuff',
    ribbon:  'darkribbon',
    souls:   '001_blackheart',
};

// Unicode fallbacks if the animated emoji isn't found
const EMOJI_FALLBACKS = {
    fire: '🔥', bat: '🦇', rose: '🌹', heart: '🖤',
    skull: '💀', cross: '✝️', crystal: '🔮', puff: '💨',
    ribbon: '🎀', souls: '🖤',
};

/**
 * Resolve animated emojis from the bot's emoji cache by NAME.
 * This way, if an emoji is re-uploaded (new ID), it auto-detects.
 * Falls back to unicode if not found.
 *
 * @param {Client} client - The Discord client
 * @returns {object} E object with all emoji strings + pre-built border
 */
function resolveAnimatedEmojis(client) {
    const E = {};

    for (const [key, name] of Object.entries(ANIMATED_EMOJI_NAMES)) {
        const emoji = client.emojis.cache.find(e => e.name === name);
        if (emoji) {
            E[key] = emoji.animated
                ? `<a:${emoji.name}:${emoji.id}>`
                : `<:${emoji.name}:${emoji.id}>`;
        } else {
            E[key] = EMOJI_FALLBACKS[key] || '⬥';
        }
    }

    // Pre-built border strip used by every panel
    E.border = `${E.heart}${E.fire}${E.skull}${E.bat}${E.rose}${E.cross}${E.crystal}${E.puff}${E.ribbon}${E.heart}${E.fire}${E.skull}`;

    return E;
}

// ─── Emoji name → theme key mapping ───
// Maps animated emoji names to theme.emojis keys so initEmojis() can overwrite them
const EMOJI_NAME_TO_KEY = {
    blackfire:      'fire',
    blackbat:       'bat',
    blackrose:      'rose',
    heartdrip:      'heart',
    darkskull:      'skull',
    darkcross:      'cross',
    crystalheart:   'crystal',
    blackpuff:      'puff',
    darkribbon:     'ribbon',
    '001_blackheart': 'souls',
};

// The emojis object — starts with unicode fallbacks, gets overwritten with animated versions on ready
const emojis = {
    skull:   '💀',
    bat:     '🦇',
    moon:    '🌑',
    rose:    '🌹',
    spider:  '🕷️',
    coffin:  '⚰️',
    crystal: '🔮',
    candle:  '🕯️',
    chain:   '⛓️',
    dagger:  '🗡️',
    music:   '🎶',
    fire:    '🔥',
    sword:   '⚔️',
    bolt:    '⚡',
    crown:   '👑',
    diamond: '💎',
    star:    '✦',
    heart:   '🖤',
    cross:   '✝️',
    puff:    '💨',
    ribbon:  '🎀',
    souls:   '🖤',
};

/**
 * Called once on bot ready — replaces unicode emojis with animated server emojis.
 * Every file that uses theme.emojis.skull etc. will automatically get the animated version.
 */
function initEmojis(client) {
    let resolved = 0;
    for (const [emojiName, key] of Object.entries(EMOJI_NAME_TO_KEY)) {
        const emoji = client.emojis.cache.find(e => e.name === emojiName);
        if (emoji) {
            emojis[key] = emoji.animated
                ? `<a:${emoji.name}:${emoji.id}>`
                : `<:${emoji.name}:${emoji.id}>`;
            resolved++;
        }
    }

    // Build the border strip from resolved emojis
    emojis.border = `${emojis.heart}${emojis.fire}${emojis.skull}${emojis.bat}${emojis.rose}${emojis.cross}${emojis.crystal}${emojis.puff}${emojis.ribbon}${emojis.heart}${emojis.fire}${emojis.skull}`;

    return resolved;
}

module.exports = {
    resolveAnimatedEmojis,
    initEmojis,
    colors: {
        primary:   0x0a0a12,   // Abyss black — base embed color
        accent:    0xc2185b,   // Dante crimson — main accent
        vergil:    0x1565c0,   // Vergil ice blue
        danger:    0xb71c1c,   // Blood red — errors, bans
        success:   0x1b5e20,   // Dark emerald — confirmations
        music:     0x4a148c,   // Royal purple — music embeds
        gold:      0xffd700,   // Gold — economy, rewards
        blood:     0x880e4f,   // Deep rose — warnings
        void:      0x0d0d0d,   // True void
        devil:     0xd32f2f,   // Devil Trigger red
        yamato:    0x0d47a1,   // Yamato blue
        stylish:   0x6a1b9a,   // SSS rank purple
    },
    emojis,
    // ─── Decorative elements for embeds ───
    dividers: {
        pointed:  '▸▹▸▹▸▹▸▹▸▹▸▹▸▹▸▹▸▹▸▹▸▹▸▹▸▹▸',
        thin:     '━━━━━━━━━━━━━━━━━━━━━━━━━',
        dotted:   '· · · · · · · · · · · · · · ·',
        fade:     '░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░',
        stylish:  '╾━━━━━━━━━━━━━━━━━━━━━━╼',
        blood:    '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
    },
    // GIFs — DMC / dark anime style (media.tenor.com AAAAM format for Discord embed support)
    gifs: {
        // Economy
        balance:     'https://media.tenor.com/5CP1zO1lVPgAAAAM/vergil-devil-may-cry.gif',
        work:        'https://media.tenor.com/eDVuNUm5ym0AAAAM/vergil-dmc5-vergil-dmc.gif',
        crime:       'https://media.tenor.com/goMuZIzAOKIAAAAM/vergil-sparda-vergil.gif',
        daily:       'https://media.tenor.com/c3vAXtQFaHAAAAAM/dmc-dmc5.gif',
        coinflip:    'https://media.tenor.com/88Op634UwbUAAAAM/af.gif',
        coinflipHeads: 'https://media.tenor.com/88Op634UwbUAAAAM/af.gif',
        coinflipTails: 'https://media.tenor.com/88Op634UwbUAAAAM/af.gif',
        dice:        'https://media.tenor.com/YiCb0MOIYu8AAAAM/vargillllll-vargil.gif',
        slots:       'https://media.tenor.com/1fVQ4c3by7YAAAAM/peta-farbar-petr-farbar.gif',
        give:        'https://media.tenor.com/c3vAXtQFaHAAAAAM/dmc-dmc5.gif',
        pick:        'https://media.tenor.com/goMuZIzAOKIAAAAM/vergil-sparda-vergil.gif',
        shop:        'https://media.tenor.com/5CP1zO1lVPgAAAAM/vergil-devil-may-cry.gif',
        leaderboard: 'https://media.tenor.com/eDVuNUm5ym0AAAAM/vergil-dmc5-vergil-dmc.gif',
        cooldowns:   'https://media.tenor.com/YiCb0MOIYu8AAAAM/vargillllll-vargil.gif',
        buy:         'https://media.tenor.com/goMuZIzAOKIAAAAM/vergil-sparda-vergil.gif',
        inventory:   'https://media.tenor.com/c3vAXtQFaHAAAAAM/dmc-dmc5.gif',
        // Fun
        oracle:      'https://media.tenor.com/5CP1zO1lVPgAAAAM/vergil-devil-may-cry.gif',
        afk:         'https://media.tenor.com/YiCb0MOIYu8AAAAM/vargillllll-vargil.gif',
        poll:        'https://media.tenor.com/eDVuNUm5ym0AAAAM/vergil-dmc5-vergil-dmc.gif',
        tarot:       'https://media.tenor.com/5CP1zO1lVPgAAAAM/vergil-devil-may-cry.gif',
        uwu:         'https://media.tenor.com/88Op634UwbUAAAAM/af.gif',
        snipe:       'https://media.tenor.com/goMuZIzAOKIAAAAM/vergil-sparda-vergil.gif',
        serverstats: 'https://media.tenor.com/c3vAXtQFaHAAAAAM/dmc-dmc5.gif',
        reminder:    'https://media.tenor.com/5CP1zO1lVPgAAAAM/vergil-devil-may-cry.gif',
        // Moderation
        ban:         'https://media.tenor.com/goMuZIzAOKIAAAAM/vergil-sparda-vergil.gif',
        kick:        'https://media.tenor.com/eDVuNUm5ym0AAAAM/vergil-dmc5-vergil-dmc.gif',
        mute:        'https://media.tenor.com/YiCb0MOIYu8AAAAM/vargillllll-vargil.gif',
        warn:        'https://media.tenor.com/1fVQ4c3by7YAAAAM/peta-farbar-petr-farbar.gif',
        purge:       'https://media.tenor.com/goMuZIzAOKIAAAAM/vergil-sparda-vergil.gif',
        report:      'https://media.tenor.com/5CP1zO1lVPgAAAAM/vergil-devil-may-cry.gif',
        steal:       'https://media.tenor.com/eDVuNUm5ym0AAAAM/vergil-dmc5-vergil-dmc.gif',
        automod:     'https://media.tenor.com/YiCb0MOIYu8AAAAM/vargillllll-vargil.gif',
        // Leveling
        rank:        'https://media.tenor.com/c3vAXtQFaHAAAAAM/dmc-dmc5.gif',
        levelroles:  'https://media.tenor.com/eDVuNUm5ym0AAAAM/vergil-dmc5-vergil-dmc.gif',
        // Music
        playing:     'https://media.tenor.com/goMuZIzAOKIAAAAM/vergil-sparda-vergil.gif',
        queued:      'https://media.tenor.com/YiCb0MOIYu8AAAAM/vargillllll-vargil.gif',
        // Events
        welcome:     'https://media.tenor.com/c3vAXtQFaHAAAAAM/dmc-dmc5.gif',
        goodbye:     'https://media.tenor.com/goMuZIzAOKIAAAAM/vergil-sparda-vergil.gif',
        souldrop:    'https://media.tenor.com/5CP1zO1lVPgAAAAM/vergil-devil-may-cry.gif',
        profanity:   'https://media.tenor.com/1fVQ4c3by7YAAAAM/peta-farbar-petr-farbar.gif',
        // Giveaways
        giveaway:    'https://media.tenor.com/c3vAXtQFaHAAAAAM/dmc-dmc5.gif',
        giveawayEnd: 'https://media.tenor.com/goMuZIzAOKIAAAAM/vergil-sparda-vergil.gif',
        giveawayWin: 'https://media.tenor.com/eDVuNUm5ym0AAAAM/vergil-dmc5-vergil-dmc.gif',
    },
    // Roleplay category GIFs — large images for >bite, >ritual, etc.
    rpGifs: {
        'dark intimacy': 'https://media.tenor.com/c3vAXtQFaHAAAAAM/dmc-dmc5.gif',
        'occult':        'https://media.tenor.com/5CP1zO1lVPgAAAAM/vergil-devil-may-cry.gif',
        'gothic expression': 'https://media.tenor.com/YiCb0MOIYu8AAAAM/vargillllll-vargil.gif',
        'violent':       'https://media.tenor.com/goMuZIzAOKIAAAAM/vergil-sparda-vergil.gif',
    },
    footer: '⚔ blvck0ut • the power you seek',
    divider: '━'.repeat(25),
};

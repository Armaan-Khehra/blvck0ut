const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../data/database');
const { createEmbed } = require('./embeds');
const theme = require('./theme');
const logger = require('./logger');

// ─── Role Gatekeeping ───
// These IDs mirror the ones used by the anti-invite system in messageCreate.js
const OWNER_ROLE_ID = '1471599229255417919';
const STAFF_ROLE_IDS = new Set([
    '1471599229255417919', // Owner
    '1471599229255417918', // Admin
    '1471599229221732536', // Senior Mod
    '1496310444522999898', // Mod
    '1499936239078473889', // Trial Mod
    '1498927541321207870', // Head PM
    '1471599229221732535', // PM
]);

function isOwner(member) {
    if (!member) return false;
    // Server owner is always treated as "owner" as a convenience
    if (member.guild?.ownerId === member.id) return true;
    return member.roles?.cache?.has(OWNER_ROLE_ID) ?? false;
}

function isStaff(member) {
    if (!member) return false;
    if (member.guild?.ownerId === member.id) return true;
    return member.roles?.cache?.some(r => STAFF_ROLE_IDS.has(r.id)) ?? false;
}

// ─── Duration parsing ───
// Accepts: 30s, 5m, 2h, 1d, 1w — or combos like "1d2h30m"
function parseDuration(input) {
    if (!input) return null;
    const clean = String(input).toLowerCase().replace(/\s+/g, '');
    const re = /(\d+)(s|sec|secs|m|min|mins|h|hr|hrs|d|day|days|w|wk|wks|week|weeks)/g;
    const units = {
        s: 1_000, sec: 1_000, secs: 1_000,
        m: 60_000, min: 60_000, mins: 60_000,
        h: 3_600_000, hr: 3_600_000, hrs: 3_600_000,
        d: 86_400_000, day: 86_400_000, days: 86_400_000,
        w: 604_800_000, wk: 604_800_000, wks: 604_800_000, week: 604_800_000, weeks: 604_800_000,
    };

    let total = 0;
    let match;
    let matched = false;
    while ((match = re.exec(clean)) !== null) {
        matched = true;
        total += parseInt(match[1], 10) * (units[match[2]] || 0);
    }
    return matched ? total : null;
}

// ─── Pretty duration formatter ───
function formatDuration(ms) {
    if (ms <= 0) return '0s';
    const units = [
        { label: 'w', ms: 604_800_000 },
        { label: 'd', ms: 86_400_000 },
        { label: 'h', ms: 3_600_000 },
        { label: 'm', ms: 60_000 },
        { label: 's', ms: 1_000 },
    ];
    const parts = [];
    let remaining = ms;
    for (const u of units) {
        const val = Math.floor(remaining / u.ms);
        if (val > 0) {
            parts.push(`${val}${u.label}`);
            remaining -= val * u.ms;
        }
        if (parts.length >= 2) break;
    }
    return parts.join(' ') || '0s';
}

// ─── DB statements ───
const insertGiveaway = db.prepare(`
    INSERT INTO giveaways (guild_id, channel_id, host_id, prize, winner_count, is_fake, ends_at, requirement)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const setMessageId = db.prepare('UPDATE giveaways SET message_id = ? WHERE id = ?');
const getGiveaway = db.prepare('SELECT * FROM giveaways WHERE id = ?');
const getGiveawayByGuild = db.prepare('SELECT * FROM giveaways WHERE id = ? AND guild_id = ?');
const getActiveGiveaways = db.prepare(`
    SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0 AND cancelled = 0
    ORDER BY ends_at ASC
`);
const getDueGiveaways = db.prepare(`
    SELECT * FROM giveaways WHERE ended = 0 AND cancelled = 0 AND ends_at <= ?
`);
const markEnded = db.prepare('UPDATE giveaways SET ended = 1, winners = ? WHERE id = ?');
const markCancelled = db.prepare('UPDATE giveaways SET cancelled = 1 WHERE id = ?');
const updateWinners = db.prepare('UPDATE giveaways SET winners = ? WHERE id = ?');
const setForcedWinners = db.prepare('UPDATE giveaways SET forced_winners = ? WHERE id = ?');

const insertEntry = db.prepare(`
    INSERT OR IGNORE INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)
`);
const removeEntry = db.prepare('DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?');
const hasEntry = db.prepare('SELECT 1 FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?');
const countEntries = db.prepare('SELECT COUNT(*) AS n FROM giveaway_entries WHERE giveaway_id = ?');
const listEntries = db.prepare('SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?');

// ─── Giveaway embed builder ───
// Identical visuals for real and fake — only the host sees the fake tell-tale.
function buildGiveawayEmbed(gw, { ended = false, winners = [] } = {}) {
    const endsAtMs = new Date(gw.ends_at).getTime();
    const entryCount = countEntries.get(gw.id)?.n ?? 0;

    const status = ended
        ? `**ENDED**`
        : `**LIVE** — ends <t:${Math.floor(endsAtMs / 1000)}:R>`;

    const winnersLine = winners.length > 0
        ? winners.map(id => `<@${id}>`).join(', ')
        : `*${gw.winner_count} winner${gw.winner_count > 1 ? 's' : ''} will be chosen*`;

    const reqLine = gw.requirement === 'rep'
        ? `**Requirement:** \`/blvck0ut\` or \`.gg/blvck0ut\` in your status`
        : gw.requirement === 'invites'
            ? `**Requirement:** at least **1** server invite`
            : null;

    const description = [
        `**Prize:** ${gw.prize}`,
        `**Winners:** ${gw.winner_count}`,
        `**Host:** <@${gw.host_id}>`,
        `**Entries:** \`${entryCount}\``,
        reqLine,
        ``,
        status,
        ``,
        ended ? `**Winner${winners.length > 1 ? 's' : ''}:** ${winnersLine}` : `*Press the button below to enter.*`,
    ].filter(Boolean).join('\n');

    return createEmbed({
        title: `🎁 Giveaway`,
        description,
        color: theme.colors.void,
        fields: [
            {
                name: `Giveaway ID`,
                value: `\`${gw.id}\``,
                inline: true,
            },
            {
                name: `${ended ? 'Ended' : 'Closes'}`,
                value: `<t:${Math.floor(endsAtMs / 1000)}:F>`,
                inline: true,
            },
        ],
    });
}

function buildJoinRow(giveawayId, disabled = false, entryCount = 0) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`gw_join_${giveawayId}`)
            .setLabel(`Enter${entryCount > 0 ? ` · ${entryCount}` : ''}`)
            .setEmoji('🎁')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
    );
    return row;
}

// ─── Winner rolling ───
function rollWinners(giveawayId, winnerCount) {
    const entries = listEntries.all(giveawayId).map(r => r.user_id);
    if (entries.length === 0) return [];

    // Fisher-Yates shuffle, take first N
    const pool = entries.slice();
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(winnerCount, pool.length));
}

// ─── End giveaway (shared logic between manual end + poller) ───
async function endGiveaway(client, giveawayId, { forcedWinners = null } = {}) {
    const gw = getGiveaway.get(giveawayId);
    if (!gw || gw.ended || gw.cancelled) return null;

    // Priority: explicit arg > DB forced_winners > random roll
    let winners;
    if (forcedWinners && forcedWinners.length > 0) {
        winners = forcedWinners;
    } else if (gw.forced_winners) {
        let forced = [];
        try { forced = JSON.parse(gw.forced_winners) || []; } catch {}
        if (Array.isArray(forced) && forced.length > 0) {
            // If we have fewer forced winners than winner_count, fill the rest from real entries
            if (forced.length < gw.winner_count) {
                const entries = listEntries.all(giveawayId).map(r => r.user_id);
                const pool = entries.filter(id => !forced.includes(id));
                for (let i = pool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pool[i], pool[j]] = [pool[j], pool[i]];
                }
                const fillCount = gw.winner_count - forced.length;
                winners = [...forced, ...pool.slice(0, fillCount)];
            } else {
                winners = forced.slice(0, gw.winner_count);
            }
        } else {
            winners = rollWinners(giveawayId, gw.winner_count);
        }
    } else {
        winners = rollWinners(giveawayId, gw.winner_count);
    }

    markEnded.run(JSON.stringify(winners), giveawayId);

    // Fetch the original message so we can update it
    const channel = await client.channels.fetch(gw.channel_id).catch(() => null);
    if (!channel) return { gw, winners, messageFound: false };

    const message = gw.message_id
        ? await channel.messages.fetch(gw.message_id).catch(() => null)
        : null;

    const endedEmbed = buildGiveawayEmbed(gw, { ended: true, winners });
    const disabledRow = buildJoinRow(gw.id, true, countEntries.get(gw.id)?.n ?? 0);

    if (message) {
        // Edit the original embed — suppress pings so winners aren't pinged from the embed update
        await message.edit({ embeds: [endedEmbed], components: [disabledRow], allowedMentions: { parse: [] } }).catch(() => {});
    }

    // Public winner announcement — single ping from content only
    const announcement = winners.length === 0
        ? {
            content: `No entries — nobody won **${gw.prize}**.`,
        }
        : {
            content: `🎉 ${winners.map(id => `<@${id}>`).join(' ')} — you won!`,
            embeds: [createEmbed({
                title: `🎁 Giveaway ended`,
                description: [
                    `**Prize:** ${gw.prize}`,
                    `**Winner${winners.length > 1 ? 's' : ''}:** ${winners.map(id => `<@${id}>`).join(', ')}`,
                    `**Host:** <@${gw.host_id}>`,
                    ``,
                    `*DM the host to claim your prize.*`,
                ].join('\n'),
                color: theme.colors.void,
            })],
            // Only ping from the content line, not the embed mentions
            allowedMentions: { users: winners },
        };

    if (message) {
        await message.reply(announcement).catch(() => {
            channel.send(announcement).catch(() => {});
        });
    } else {
        await channel.send(announcement).catch(() => {});
    }

    logger.info(`Giveaway #${gw.id} ended (${gw.is_fake ? 'fake' : 'real'}) — winners: ${winners.join(', ') || 'none'}`);
    return { gw, winners, messageFound: !!message };
}

// ─── Update the live-entry count on the message ───
async function refreshGiveawayMessage(client, giveawayId) {
    const gw = getGiveaway.get(giveawayId);
    if (!gw || gw.ended || gw.cancelled) return;
    if (!gw.message_id) return;

    const channel = await client.channels.fetch(gw.channel_id).catch(() => null);
    if (!channel) return;
    const message = await channel.messages.fetch(gw.message_id).catch(() => null);
    if (!message) return;

    const entryCount = countEntries.get(gw.id)?.n ?? 0;
    const embed = buildGiveawayEmbed(gw);
    const row = buildJoinRow(gw.id, false, entryCount);
    await message.edit({ embeds: [embed], components: [row] }).catch(() => {});
}

module.exports = {
    // Permissions
    OWNER_ROLE_ID,
    STAFF_ROLE_IDS,
    isOwner,
    isStaff,
    // Helpers
    parseDuration,
    formatDuration,
    // Embed
    buildGiveawayEmbed,
    buildJoinRow,
    // DB prepared statements
    insertGiveaway,
    setMessageId,
    getGiveaway,
    getGiveawayByGuild,
    getActiveGiveaways,
    getDueGiveaways,
    markEnded,
    markCancelled,
    updateWinners,
    setForcedWinners,
    insertEntry,
    removeEntry,
    hasEntry,
    countEntries,
    listEntries,
    // Operations
    rollWinners,
    endGiveaway,
    refreshGiveawayMessage,
};

const { Events, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, createEmbed } = require('../utils/embeds');
const config = require('../../config');
const logger = require('../utils/logger');
const db = require('../data/database');
const { sendLog } = require('../utils/channelLog');
const theme = require('../utils/theme');
const { ensureUser, addSouls, removeSouls, formatSouls, checkCooldown, setCooldownFor, applyMultiplier, getCurrencyEmoji } = require('../utils/economy');
const leveling = require('../utils/leveling');
const { getUnwelcomedJoin, markWelcomed } = require('../utils/recentJoins');
const { handleRoleplayCommand } = require('../commands/economy/roleplay');
const { isChannelActive, isConnected, queueTTS, getUserVoice } = require('../utils/tts');
const { syncSupporterRole } = require('./guildMemberUpdate');

// ─── Economy: Passive Chat Earnings ───
const CHAT_EARN_MIN = 10;
const CHAT_EARN_MAX = 30;
const CHAT_EARN_COOLDOWN = 30 * 1000; // 30 seconds

// ─── Economy: Soul Drops ───
const SOUL_DROP_CHANCE = 1 / 150; // 1 in 150 messages
const SOUL_DROP_MIN = 200;
const SOUL_DROP_MAX = 2000;

// ─── Auto-React: Keyword Reactions ───
const AUTO_REACT_EMOJI = '1475235856725049585'; // soul emoji (just the ID for react)
const AUTO_REACT_KEYWORDS = ['souls', 'soul'];

// ─── Welcome Reward ───
// Regex catches all variations: welcome, welcom, welc, welcs, welcomee, welcomeee,
// welc0me, welcum, wlcm, wlcme, wellcome, wellcum, w3lcome, welcm, etc.
// Also catches: wb (welcome back)
const WELCOME_REGEX = /\bw+[e3]*l+[c3]+[o0u]*m*e*s?\b|\bwb\b|\bwlcm\b|\bwlc\b/i;
const WELCOME_REWARD_MIN = 50;
const WELCOME_REWARD_MAX = 100;

// ─── Economy: Profanity Fines ───
const PROFANITY_FINE = 500;
const getFilteredWords = db.prepare('SELECT word FROM word_filter WHERE guild_id = ?');

// ─── UwU Lock ───
const isUwuLocked = db.prepare('SELECT * FROM uwu_locked WHERE guild_id = ? AND user_id = ?');

// ─── AFK ───
const getAfk = db.prepare('SELECT * FROM afk_users WHERE guild_id = ? AND user_id = ?');
const removeAfk = db.prepare('DELETE FROM afk_users WHERE guild_id = ? AND user_id = ?');

// Matches discord.gg/xxx, discord.com/invite/xxx, discordapp.com/invite/xxx
const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/gi;

// Role ID for regular members who should have invites blocked
const MEMBER_ROLE_ID = '1471599229221732533';

// Staff roles exempt from invite filtering (can post invites freely)
const INVITE_EXEMPT_ROLES = new Set([
    '1471599229255417919', // Owner
    '1471599229255417918', // Admin
    '1471599229221732536', // Senior Mod
    '1496310444522999898', // Mod
    '1499936239078473889', // Trial Mod
    '1498927541321207870', // Head PM
    '1471599229221732535', // PM
]);

// Channels/categories excluded from invite filtering (tickets)
const EXCLUDED_IDS = new Set([
    '1471613210296844571',  // Tickets category
    '1471599231528861861',  // Ticket channel
    '1471599230702321953',  // Ticket channel
]);

// ─── Partnership Channel ───
const PARTNERSHIP_CHANNEL_ID = '1471599231528861863';
const PARTNERSHIP_PING_ROLE_ID = '1474785256237170748';

// ─── Link Block: #general ───
// Blocks ONLY Discord invites + Spotify links from non-staff members in #general.
// Staff (INVITE_EXEMPT_ROLES above) can post anything freely.
// GIFs, images, plain links, etc. — all allowed for everyone.
const GENERAL_CHANNEL_ID = '1471599230702321955';
// Patterns that trigger a delete. Add more here to extend the blocklist.
const BLOCKED_IN_GENERAL = [
    // Discord invites — discord.gg/xxx, discord.com/invite/xxx, discordapp.com/invite/xxx
    /\bdiscord(?:app)?\.com\/invite\/[a-z0-9-]+/i,
    /\bdiscord\.gg\/[a-z0-9-]+/i,
    // Spotify — open.spotify.com/..., spotify.com/..., spoti.fi/...
    /\b(?:open\.)?spotify\.com\/\S+/i,
    /\bspoti\.fi\/\S+/i,
    // YouTube — youtube.com/..., youtu.be/..., m.youtube.com/...
    /\b(?:m\.)?youtube\.com\/\S+/i,
    /\byoutu\.be\/\S+/i,
];

// Permission flag name → bit mapping for prefix command permission checks
const PERMISSION_MAP = {
    [PermissionFlagsBits.ModerateMembers]: 'ModerateMembers',
    [PermissionFlagsBits.BanMembers]: 'BanMembers',
    [PermissionFlagsBits.KickMembers]: 'KickMembers',
    [PermissionFlagsBits.ManageMessages]: 'ManageMessages',
    [PermissionFlagsBits.ManageGuild]: 'ManageGuild',
    [PermissionFlagsBits.Administrator]: 'Administrator',
    [PermissionFlagsBits.ManageChannels]: 'ManageChannels',
    [PermissionFlagsBits.ManageRoles]: 'ManageRoles',
};

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message) {
        // ─── OWO Hunt Reminder ───
        // When OWO responds to a hunt in the owo channel, remind after 15s
        const OWO_CHANNEL_ID = '1499126730848338120';
        const OWO_BOT_ID = '408785106942164992';
        if (message.author.id === OWO_BOT_ID
            && message.channel.id === OWO_CHANNEL_ID
            && message.content.includes('hunt is empowered by')) {
            setTimeout(() => {
                message.channel.send('`owo h`').then(msg => {
                    // Auto-delete the reminder after 30s so it doesn't clutter
                    setTimeout(() => msg.delete().catch(() => {}), 30_000);
                }).catch(() => {});
            }, 15_000);
        }

        // ─── DISBOARD Bump Reminder ───
        const BUMP_CHANNEL_ID = '1471604405055782965';
        const DISBOARD_BOT_ID = '302050872383242240';
        const BUMP_COOLDOWN = 2 * 60 * 60 * 1000; // 2 hours

        if (message.author.id === DISBOARD_BOT_ID && message.channel.id === BUMP_CHANNEL_ID) {
            // Detect "Bump done!" from DISBOARD embeds
            const hasBumpDone = message.embeds.some(e =>
                e.description?.includes('Bump done') || e.title?.includes('Bump done')
            ) || message.content?.includes('Bump done');

            if (hasBumpDone) {
                // Find who bumped — check the message right before this one (the /bump command)
                let bumper = null;
                try {
                    const msgs = await message.channel.messages.fetch({ before: message.id, limit: 3 });
                    const bumpCmd = msgs.find(m =>
                        !m.author.bot && (m.interaction?.commandName === 'bump' || m.content?.includes('/bump'))
                    );
                    bumper = bumpCmd?.member || bumpCmd?.author || null;
                } catch {}

                const bumperMention = bumper ? `${bumper}` : 'Someone';
                const bumperName = bumper?.displayName || bumper?.username || 'A mysterious soul';

                // ─── Thank-you embed ───
                const thankEmbed = createEmbed({
                    title: `${theme.emojis.crystal} Server Bumped!`,
                    description: [
                        `${theme.emojis.fire} **${bumperName}** just bumped the server!`,
                        ``,
                        `${theme.emojis.heart} Thank you for helping us grow.`,
                        `${theme.emojis.bat} Next bump available <t:${Math.floor((Date.now() + BUMP_COOLDOWN) / 1000)}:R>`,
                    ].join('\n'),
                    color: theme.colors.success,
                    image: 'https://www.image2url.com/r2/default/gifs/1777726970001-5f933b37-5185-4174-956d-d69128e6b585.gif',
                });

                await message.channel.send({ content: `${bumperMention} ${theme.emojis.crystal}`, embeds: [thankEmbed] }).catch(() => {});

                // ─── Save bump time to DB (survives restarts) ───
                const remindAt = Date.now() + BUMP_COOLDOWN;
                db.prepare('UPDATE bump_reminder SET remind_at = ? WHERE id = 1').run(remindAt);

                logger.info(`[Bump] Bumped by ${bumperName} — reminder set for 2h`);
            }
        }

        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        // ─── TTS: Auto-read messages aloud in VC ───
        handleTTSAutoRead(message);

        const isMainGuild = message.guild.id === config.guildId;

        // ─── Supporter Role: Passive sync on every message (lightweight) ───
        if (isMainGuild && message.member) {
            syncSupporterRole(message.member).catch(() => {});
        }

        // ─── Partnership Channel: Auto-ping + @everyone Strip (main server only) ───
        if (isMainGuild && message.channel.id === PARTNERSHIP_CHANNEL_ID) {
            // Strip @everyone from pasted server ads so it doesn't ping the whole server
            if (message.mentions.everyone) {
                await stripEveryonePing(message);
                // handlePartnershipAd on the reposted message is not needed —
                // the webhook message triggers handlePartnershipAd via the bot check above
                // So we manually fire the auto-ping here
                await message.channel.send({
                    content: `<@&${PARTNERSHIP_PING_ROLE_ID}>`,
                    allowedMentions: { roles: [PARTNERSHIP_PING_ROLE_ID] },
                }).then(ping => {
                    setTimeout(() => ping.delete().catch(() => {}), 5000);
                }).catch(() => {});
                return;
            }
            await handlePartnershipAd(message);
            return; // Don't process economy/leveling for partnership ads
        }

        // ─── Shop Channel Auto-Clean (main server only) ───
        const SHOP_CHANNEL_ID = '1473715246962184304';
        if (isMainGuild && message.channel.id === SHOP_CHANNEL_ID && !message.content.startsWith(config.prefix)) {
            setTimeout(() => message.delete().catch(() => {}), 3000);
            return; // Don't process anything else for non-command messages in shop
        }

        // ─── Link Block: #general (main server only, non-staff) ───
        // Runs BEFORE prefix/economy handlers so blocked messages don't earn souls/XP.
        // Skips bot prefix commands so staff/users can still run `-cmd https://...` etc.
        if (isMainGuild
            && message.channel.id === GENERAL_CHANNEL_ID
            && !message.content.startsWith(config.prefix)
            && !message.content.startsWith('>')
            && await handleGeneralLinkBlock(message)) {
            return;
        }

        // ─── Prefix Command Handler ───
        if (message.content.startsWith(config.prefix)) {
            return handlePrefixCommand(message);
        }

        // ─── Gothic Roleplay Commands (> prefix) ───
        if (message.content.startsWith('>')) {
            if (handleRoleplayCommand(message)) return;
        }

        // ─── AFK System ───
        await handleAfk(message);

        // ─── UwU Lock ───
        if (await handleUwuLock(message)) return;

        // ─── Auto-React: Keyword Reactions ───
        handleAutoReact(message);

        // ─── Welcome Reward ───
        handleWelcomeReward(message);

        // ─── Economy: Profanity Fine ───
        handleProfanityFine(message);

        // ─── Economy: Passive Chat Earnings ───
        handleChatEarnings(message);

        // ─── Economy: Random Soul Drops ───
        handleSoulDrop(message);

        // ─── Leveling: XP Earn ───
        handleXpEarn(message);

        // ─── Anti-Invite System (main server only) ───
        if (!isMainGuild) return;
        // Ignore ticket channels (by ID, parent category, or name pattern)
        if (EXCLUDED_IDS.has(message.channel.id) || EXCLUDED_IDS.has(message.channel.parentId)) return;
        if (message.channel.name?.toLowerCase().startsWith('ticket-')) return;

        // Skip staff — they can post invites freely
        if (message.member?.roles.cache.some(r => INVITE_EXEMPT_ROLES.has(r.id))) return;

        // Only check messages from users with the member role
        if (!message.member?.roles.cache.has(MEMBER_ROLE_ID)) return;

        // Check for invite links
        const invites = message.content.match(INVITE_REGEX);
        if (!invites || invites.length === 0) return;

        // Check if any invite is external (not this server)
        try {
            const guildInvites = await message.guild.invites.fetch();
            const guildInviteCodes = guildInvites.map(i => i.code);

            // Also get the vanity URL if the server has one
            let vanityCode = null;
            try {
                const vanity = await message.guild.fetchVanityData();
                vanityCode = vanity.code;
            } catch {}

            const isExternal = invites.some(inviteUrl => {
                // Extract the invite code from the URL
                const code = inviteUrl.replace(INVITE_REGEX, '$1');
                // It's external if it's NOT one of our server's invite codes
                return !guildInviteCodes.includes(code) && code !== vanityCode;
            });

            if (isExternal) {
                await message.delete();
                logger.info(`[AntiInvite] Deleted external invite from ${message.author.tag} in #${message.channel.name}`);

                sendLog(message.client, {
                    title: `${theme.emojis.spider} External Invite Blocked`,
                    description: `An external server invite was detected and removed.`,
                    color: theme.colors.danger,
                    fields: [
                        { name: `${theme.emojis.skull} User`, value: `${message.author} (${message.author.tag})`, inline: true },
                        { name: `${theme.emojis.crystal} Channel`, value: `${message.channel} (#${message.channel.name})`, inline: true },
                        { name: `${theme.emojis.chain} Invite(s)`, value: invites.join(', ').slice(0, 1024), inline: false },
                    ],
                    thumbnail: message.author.displayAvatarURL({ size: 256 }),
                });

                // Send a temporary warning
                const warning = await message.channel.send({
                    content: `${message.author}, external server invites are not allowed here.`,
                });

                // Auto-delete the warning after 5 seconds
                setTimeout(() => warning.delete().catch(() => {}), 5000);
            }
        } catch (error) {
            logger.error(`[AntiInvite] Error: ${error.message}`);
        }
    },
};

// ─── Prefix Command Handler ───
async function handlePrefixCommand(message) {
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // ─── Prefix Aliases ───
    const PREFIX_ALIASES = {
        lb: 'lootbox',
        sr: 'supporter',
        ub: 'unban',
        br: 'boostcolor',
    };
    const resolvedName = PREFIX_ALIASES[commandName] || commandName;

    const command = message.client.commands.get(resolvedName);
    if (!command) return; // Not a known command, silently ignore

    // Check permissions if the slash command has defaultMemberPermissions set
    const requiredPerms = command.data.default_member_permissions;
    if (requiredPerms) {
        const permBigInt = BigInt(requiredPerms);
        if (!message.member.permissions.has(permBigInt)) {
            const permName = PERMISSION_MAP[permBigInt] || 'the required permission';
            return message.reply({
                embeds: [errorEmbed(`You lack the power for this command. Requires **${permName}**.`)],
                allowedMentions: { repliedUser: false },
            });
        }
    }

    // Build a fake interaction object that wraps the message
    const fakeInteraction = createPrefixInteraction(message, command, args);

    // Special handling: -quote as a reply to a message
    if (commandName === 'quote' && message.reference?.messageId) {
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            if (repliedMsg && repliedMsg.content) {
                const repliedMember = repliedMsg.member || await message.guild.members.fetch(repliedMsg.author.id).catch(() => null);
                fakeInteraction._prefixReplyData = {
                    text: repliedMsg.content,
                    user: repliedMsg.author,
                    displayName: repliedMember?.displayName || repliedMsg.author.username,
                };
            }
        } catch (err) {
            logger.error(`[Quote] Failed to fetch replied message: ${err.message}`);
        }
    }

    // Special handling: -tr as a reply to translate that message
    if (commandName === 'tr' && message.reference?.messageId) {
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            if (repliedMsg && repliedMsg.content) {
                fakeInteraction._prefixReplyData = {
                    text: repliedMsg.content,
                };
            }
        } catch (err) {
            logger.error(`[Translate] Failed to fetch replied message: ${err.message}`);
        }
    }

    // Special handling: -stealsticker or -removesticker as a reply to a message with a sticker
    if ((commandName === 'stealsticker' || commandName === 'removesticker') && message.reference?.messageId) {
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            if (repliedMsg && repliedMsg.stickers.size > 0) {
                const sticker = repliedMsg.stickers.first();
                fakeInteraction._prefixReplyData = {
                    sticker: {
                        id: sticker.id,
                        name: sticker.name,
                        format: sticker.format,
                        tags: sticker.tags,
                    },
                };
            }
        } catch (err) {
            logger.error(`[StealSticker] Failed to fetch replied message: ${err.message}`);
        }
    }

    // Special handling: -stealgif as a reply to a message with a GIF
    if (commandName === 'stealgif' && message.reference?.messageId) {
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            if (repliedMsg) {
                let gifUrl = null;
                let gifContext = null;

                // Log what we're working with for debugging
                logger.info(`[StealGif] Content: "${repliedMsg.content?.slice(0, 100)}"`);
                logger.info(`[StealGif] Embeds: ${repliedMsg.embeds.length}, Attachments: ${repliedMsg.attachments.size}`);
                for (const embed of repliedMsg.embeds) {
                    logger.info(`[StealGif] Embed: type=${embed.type} url=${embed.url} video=${embed.video?.url} image=${embed.image?.url} thumb=${embed.thumbnail?.url}`);
                }

                // 1. Check embeds — any embed with video/image/thumbnail (Tenor, Giphy, Klipy, etc.)
                for (const embed of repliedMsg.embeds) {
                    // Extract context from the embed URL path
                    const extractContext = (embed) => {
                        if (embed.title) return embed.title;
                        if (embed.description) return embed.description;
                        if (embed.url) return embed.url.split('/').pop().replace(/-\d+$/, '').replace(/[-_]/g, ' ');
                        return 'gif';
                    };

                    // Any embed with a video (Tenor, Klipy, Giphy, gifv, etc.)
                    // Prefer video URL — ffmpeg can convert mp4/webm to animated GIF
                    if (embed.video?.url || embed.video?.proxyURL) {
                        gifUrl = embed.video.proxyURL || embed.video.url
                            || embed.thumbnail?.proxyURL || embed.thumbnail?.url
                            || embed.image?.proxyURL || embed.image?.url;
                        gifContext = extractContext(embed);
                        break;
                    }
                    // Image embed that's a GIF
                    if (embed.image?.url && /\.gif/i.test(embed.image.url)) {
                        gifUrl = embed.image.proxyURL || embed.image.url;
                        gifContext = extractContext(embed);
                        break;
                    }
                    // Thumbnail with GIF
                    if (embed.thumbnail?.url && /\.gif/i.test(embed.thumbnail.url)) {
                        gifUrl = embed.thumbnail.proxyURL || embed.thumbnail.url;
                        gifContext = extractContext(embed);
                        break;
                    }
                    // Any embed with a thumbnail/image (catch-all for GIF providers)
                    if (embed.thumbnail?.url || embed.image?.url) {
                        gifUrl = embed.thumbnail?.proxyURL || embed.thumbnail?.url || embed.image?.proxyURL || embed.image?.url;
                        gifContext = extractContext(embed);
                        break;
                    }
                }

                // 2. Check attachments for .gif files
                if (!gifUrl) {
                    const gifAttachment = repliedMsg.attachments.find(a =>
                        a.name?.endsWith('.gif') || a.contentType === 'image/gif'
                    );
                    if (gifAttachment) {
                        gifUrl = gifAttachment.url;
                        gifContext = gifAttachment.name?.replace('.gif', '').replace(/[_-]/g, ' ') || 'gif';
                    }
                }

                // 3. Check message content for GIF URLs
                if (!gifUrl && repliedMsg.content) {
                    const urlMatch = repliedMsg.content.match(/https?:\/\/\S+\.gif(\?\S*)?/i)
                        || repliedMsg.content.match(/https?:\/\/tenor\.com\/view\/[\w-]+/i)
                        || repliedMsg.content.match(/https?:\/\/media\.tenor\.com\/\S+/i)
                        || repliedMsg.content.match(/https?:\/\/(?:media\d?\.)?giphy\.com\/\S+/i);
                    if (urlMatch) {
                        gifUrl = urlMatch[0];
                        gifContext = gifUrl.split('/').pop().replace(/-\d+$/, '').replace(/[-_]/g, ' ').replace(/\.\w+.*$/, '') || 'gif';
                    }
                }

                logger.info(`[StealGif] Found URL: ${gifUrl}, Context: ${gifContext}`);

                if (gifUrl) {
                    fakeInteraction._prefixReplyData = {
                        gifUrl,
                        gifContext: gifContext || 'gif',
                    };
                }
            }
        } catch (err) {
            logger.error(`[StealGif] Failed to fetch replied message: ${err.message}`);
        }
    }

    try {
        await command.execute(fakeInteraction);
    } catch (error) {
        logger.error(`[Prefix] Error in -${commandName}:`, error);
        message.reply({ embeds: [errorEmbed('Something went wrong... the spirits are restless.')], allowedMentions: { repliedUser: false } }).catch(() => {});
    }

    // ─── Shop Channel Auto-Clean (main server only) ───
    // Delete the user's command + bot reply after 8s in the shop channel
    const SHOP_CHANNEL_ID = '1473715246962184304';
    if (message.guild.id === config.guildId && message.channel.id === SHOP_CHANNEL_ID) {
        const AUTO_DELETE_MS = 8000;
        setTimeout(() => message.delete().catch(() => {}), AUTO_DELETE_MS);
        if (fakeInteraction._lastReply) {
            setTimeout(() => fakeInteraction._lastReply.delete().catch(() => {}), AUTO_DELETE_MS);
        }
    }
}

// ─── Fake Interaction Adapter ───
// Creates an object that mimics a discord.js ChatInputCommandInteraction
// so slash command execute() functions work with prefix commands too
function createPrefixInteraction(message, command, args) {
    // Parse the command's slash options to know what types to expect
    const optionDefs = command.data.options || [];
    const parsedOptions = parseArgs(message, args, optionDefs);

    let replied = false;
    let deferred = false;

    const interaction = {
        // Core properties
        client: message.client,
        guild: message.guild,
        guildId: message.guild.id,
        channel: message.channel,
        channelId: message.channel.id,
        member: message.member,
        user: message.author,
        commandName: command.data.name,
        _prefixArgs: args,

        // State tracking
        get replied() { return replied; },
        get deferred() { return deferred; },

        // Options accessor
        options: {
            getString(name) { return parsedOptions.get(name)?.value ?? null; },
            getInteger(name) {
                const val = parsedOptions.get(name)?.value;
                return val !== null && val !== undefined ? parseInt(val, 10) || null : null;
            },
            getNumber(name) {
                const val = parsedOptions.get(name)?.value;
                return val !== null && val !== undefined ? parseFloat(val) || null : null;
            },
            getBoolean(name) {
                const val = parsedOptions.get(name)?.value;
                if (val === null || val === undefined) return null;
                return ['true', 'yes', '1', 'on'].includes(val.toLowerCase());
            },
            getUser(name) { return parsedOptions.get(name)?.user ?? null; },
            getMember(name) { return parsedOptions.get(name)?.member ?? null; },
            getChannel(name) { return parsedOptions.get(name)?.channel ?? null; },
            getRole(name) { return parsedOptions.get(name)?.role ?? null; },
            getSubcommand() {
                const hasSubs = optionDefs.some(o => o.type === 1 || o.constructor?.name === 'SlashCommandSubcommandBuilder');
                if (hasSubs && args.length > 0) return args[0].toLowerCase();
                return null;
            },
        },

        // Reply methods — reply to the original message but suppress pings
        _lastReply: null,
        async reply(data) {
            replied = true;
            // Strip ephemeral since prefix commands can't do that
            if (typeof data === 'string') data = { content: data };
            delete data.ephemeral;
            data.allowedMentions = { ...data.allowedMentions, repliedUser: false };
            const sent = await message.reply(data);
            interaction._lastReply = sent;
            return sent;
        },
        async deferReply() {
            deferred = true;
            // No-op for prefix; editReply will send the actual message
            return Promise.resolve();
        },
        async editReply(data) {
            replied = true;
            if (typeof data === 'string') data = { content: data };
            delete data.ephemeral;
            data.allowedMentions = { ...data.allowedMentions, repliedUser: false };
            const sent = await message.reply(data);
            interaction._lastReply = sent;
            return sent;
        },
        async followUp(data) {
            if (typeof data === 'string') data = { content: data };
            delete data.ephemeral;
            data.allowedMentions = { ...data.allowedMentions, repliedUser: false };
            return message.channel.send(data);
        },
        async deleteReply() {
            // No-op for prefix commands
            return Promise.resolve();
        },

        // Checks
        isChatInputCommand() { return true; },
        isButton() { return false; },
    };

    return interaction;
}

// ─── AFK Handler ───
async function handleAfk(message) {
    const theme = require('../utils/theme');
    const { createEmbed } = require('../utils/embeds');

    // If the sender is AFK, remove their AFK status
    const senderAfk = getAfk.get(message.guild.id, message.author.id);
    if (senderAfk) {
        removeAfk.run(message.guild.id, message.author.id);
        const note = await message.reply({
            content: `${theme.emojis.moon} Welcome back, ${message.author}. Your AFK has been removed.`,
            allowedMentions: { repliedUser: false },
        });
        setTimeout(() => note.delete().catch(() => {}), 5000);
    }

    // Check if any mentioned users are AFK
    if (message.mentions.users.size > 0) {
        for (const [userId, user] of message.mentions.users) {
            const afkData = getAfk.get(message.guild.id, userId);
            if (afkData) {
                const timestamp = Math.floor(new Date(afkData.created_at).getTime() / 1000);
                await message.reply({
                    content: `${theme.emojis.moon} **${user.tag}** is AFK: ${afkData.reason} — <t:${timestamp}:R>`,
                    allowedMentions: { repliedUser: false },
                });
            }
        }
    }
}

// ─── UwU Lock Handler ───
async function handleUwuLock(message) {
    const locked = isUwuLocked.get(message.guild.id, message.author.id);
    if (!locked) return false;

    // Don't uwu-ify empty messages (image-only, embeds, etc.)
    if (!message.content || message.content.trim().length === 0) return false;

    try {
        const uwuText = uwuify(message.content);

        // Use a webhook to impersonate the user (their name + avatar)
        const webhooks = await message.channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.name === 'blvck0ut-uwu' && wh.owner?.id === message.client.user.id);

        if (!webhook) {
            webhook = await message.channel.createWebhook({
                name: 'blvck0ut-uwu',
                reason: 'UwU lock feature',
            });
        }

        // Delete the original message
        await message.delete();

        // Send the uwu version as the user
        await webhook.send({
            content: uwuText,
            username: message.member.displayName,
            avatarURL: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
            allowedMentions: { parse: [] }, // Don't ping anyone
        });

        return true;
    } catch (error) {
        logger.error(`[UwU] Error: ${error.message}`);
        return false;
    }
}

// ─── UwU Text Transformer ───
function uwuify(text) {
    // Core letter replacements
    let uwu = text
        .replace(/(?:r|l)/g, 'w')
        .replace(/(?:R|L)/g, 'W')
        .replace(/n([aeiou])/g, 'ny$1')
        .replace(/N([aeiou])/g, 'Ny$1')
        .replace(/N([AEIOU])/g, 'NY$1')
        .replace(/ove/g, 'uv')
        .replace(/OVE/g, 'UV');

    // Stutter random words (~ 30% chance)
    uwu = uwu.replace(/\b([a-zA-Z])/g, (match, letter) => {
        return Math.random() < 0.3 ? `${letter}-${letter.toLowerCase()}` : match;
    });

    // Add random faces at the end of sentences
    const faces = [' owo', ' uwu', ' >w<', ' ^w^', ' OwO', ' UwU', ' (◕ᴗ◕✿)', ' ✧w✧', ' 💕', ' nyaa~', ' :3', ' (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)'];
    uwu = uwu.replace(/[.!?]+/g, (punct) => {
        const face = faces[Math.floor(Math.random() * faces.length)];
        return punct + face;
    });

    // Add a face at the end if there isn't one already
    const endsWithFace = faces.some(f => uwu.trim().endsWith(f.trim()));
    if (!endsWithFace) {
        const face = faces[Math.floor(Math.random() * faces.length)];
        uwu = uwu + face;
    }

    return uwu;
}

// ─── Auto-React: Keyword Reactions ───
function handleAutoReact(message) {
    try {
        const content = message.content.toLowerCase().trim();

        // Only trigger when "soul" or "souls" is typed alone, not in a sentence
        if (!AUTO_REACT_KEYWORDS.includes(content)) return;

        // React with the souls emoji
        message.react(AUTO_REACT_EMOJI).catch(() => {});

        // Show their balance as a reply (dolla bot style)
        const user = ensureUser(message.guild.id, message.author.id);
        const wallet = user.balance;
        message.reply({ content: `${message.author} currently have **${wallet.toLocaleString()}** ${getCurrencyEmoji()} **souls**`, allowedMentions: { repliedUser: false, parse: [] } }).catch(() => {});
    } catch (err) {
        logger.error(`[AutoReact] Error: ${err.message}`);
    }
}

// ─── Welcome Reward ───
// Only triggers when a real person joined in the last 10 minutes
// Each user can only get rewarded once per joiner (no spam)
function handleWelcomeReward(message) {
    try {
        const content = message.content.toLowerCase();
        if (!WELCOME_REGEX.test(content)) return;

        const guildId = message.guild.id;
        const welcomerId = message.author.id;

        // Only reward if someone actually joined recently (within 10 min)
        const joiner = getUnwelcomedJoin(guildId, welcomerId);
        if (!joiner) return;

        // Mark so this user can't get rewarded again for the same joiner
        markWelcomed(guildId, joiner.userId, welcomerId);

        // Random reward 50-100, apply multiplier
        const baseReward = Math.floor(Math.random() * (WELCOME_REWARD_MAX - WELCOME_REWARD_MIN + 1)) + WELCOME_REWARD_MIN;
        const { amount: reward } = applyMultiplier(guildId, welcomerId, baseReward, message.member);

        addSouls(guildId, welcomerId, reward, 'welcome', 'Welcoming a new member');

        // Send reward notification
        message.channel.send(`${getCurrencyEmoji()} **${message.author.username}** received ${formatSouls(reward)} for welcoming a new member.`).then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 15000);
        }).catch(() => {});
    } catch (err) {
        logger.error(`[WelcomeReward] Error: ${err.message}`);
    }
}

// ─── Economy: Passive Chat Earnings ───
function handleChatEarnings(message) {
    try {
        const guildId = message.guild.id;
        const userId = message.author.id;

        // Check cooldown (30 seconds between earnings)
        const remaining = checkCooldown(guildId, userId, 'chat_earn', CHAT_EARN_COOLDOWN);
        if (remaining > 0) return;

        // Random base amount 10-30, then apply multiplier
        const baseAmount = Math.floor(Math.random() * (CHAT_EARN_MAX - CHAT_EARN_MIN + 1)) + CHAT_EARN_MIN;
        const { amount } = applyMultiplier(guildId, userId, baseAmount, message.member);
        addSouls(guildId, userId, amount, 'chat', 'Passive chat earnings');
        setCooldownFor(guildId, userId, 'chat_earn');
    } catch (err) {
        logger.error(`[Economy] Chat earnings error: ${err.message}`);
    }
}

// ─── Economy: Random Soul Drops ───
async function handleSoulDrop(message) {
    try {
        if (Math.random() > SOUL_DROP_CHANCE) return;

        // Import the soul drops map from pick command
        const { soulDrops } = require('../commands/economy/pick');

        // Don't spawn if there's already an active drop in this channel
        if (soulDrops.has(message.channel.id)) return;

        const amount = Math.floor(Math.random() * (SOUL_DROP_MAX - SOUL_DROP_MIN + 1)) + SOUL_DROP_MIN;

        const embed = createEmbed({
            title: `${getCurrencyEmoji()} ${amount.toLocaleString()} souls`,
            description: `A lost soul wanders the void...\nUse \`/pick\` or \`-pick\` to claim`,
            color: 0x2b2b2b,
            thumbnail: theme.gifs.souldrop,
        });

        const msg = await message.channel.send({ embeds: [embed] });

        soulDrops.set(message.channel.id, {
            amount,
            timestamp: Date.now(),
            messageId: msg.id,
        });

        // Auto-expire after 30 seconds
        setTimeout(() => {
            const drop = soulDrops.get(message.channel.id);
            if (drop && drop.messageId === msg.id) {
                soulDrops.delete(message.channel.id);
                msg.delete().catch(() => {});
            }
        }, 30 * 1000);
    } catch (err) {
        logger.error(`[Economy] Soul drop error: ${err.message}`);
    }
}

// ─── Economy: Profanity Fine ───
function handleProfanityFine(message) {
    try {
        const guildId = message.guild.id;
        const userId = message.author.id;

        const words = getFilteredWords.all(guildId);
        if (words.length === 0) return;

        const content = message.content.toLowerCase();
        const hasProfanity = words.some(w => {
            const escaped = w.word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp(`\\b${escaped}\\b`, 'i').test(content);
        });
        if (!hasProfanity) return;

        // Check if user has an economy profile (don't create one just for fining)
        const user = ensureUser(guildId, userId);
        const actualFine = Math.min(PROFANITY_FINE, user.balance);
        if (actualFine <= 0) return;

        removeSouls(guildId, userId, actualFine, 'fine', 'Profanity filter');

        const embed = createEmbed({
            description: `${theme.emojis.skull} **${message.author.username}**, you lost ${formatSouls(actualFine)} for using forbidden words.`,
            color: theme.colors.danger,
            thumbnail: theme.gifs.profanity,
        });

        message.channel.send({ embeds: [embed] }).then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 8000);
        }).catch(() => {});
    } catch (err) {
        logger.error(`[Economy] Profanity fine error: ${err.message}`);
    }
}

// ─── Leveling: XP Earn ───
function handleXpEarn(message) {
    try {
        const guildId = message.guild.id;
        const userId = message.author.id;

        // Check cooldown (60 seconds between XP gains)
        const remaining = leveling.checkXpCooldown(guildId, userId);
        if (remaining > 0) return;

        // Random XP 15-40
        const amount = Math.floor(Math.random() * (leveling.XP_MAX - leveling.XP_MIN + 1)) + leveling.XP_MIN;
        const result = leveling.addXp(guildId, userId, amount);

        if (result.leveledUp) {
            // Send level-up announcement to the levels channel
            const channel = message.client.channels.cache.get(leveling.LEVEL_CHANNEL_ID);
            if (channel) {
                channel.send(`<a:z:1472059060881719498> ${message.author} has reached level **${result.newLevel}**. GG!`).catch(() => {});
            }

            // Assign level reward roles (stacking — add all roles at or below new level)
            const rolesToAdd = leveling.getRolesForLevel(guildId, result.newLevel);
            if (rolesToAdd.length > 0 && message.member) {
                for (const reward of rolesToAdd) {
                    if (!message.member.roles.cache.has(reward.role_id)) {
                        message.member.roles.add(reward.role_id).catch(err => {
                            logger.error(`[Leveling] Failed to add role ${reward.role_id}: ${err.message}`);
                        });
                    }
                }
            }
        }
    } catch (err) {
        logger.error(`[Leveling] XP earn error: ${err.message}`);
    }
}

// ─── Link Block: #general ───
// Deletes any message from a non-staff member that contains a Discord invite
// or Spotify link. Everything else (GIFs, YouTube, images, plain links) passes.
// Returns true if the message was blocked (so caller can stop further processing).
async function handleGeneralLinkBlock(message) {
    try {
        // Staff are exempt — they can post anything
        if (message.member?.roles.cache.some(r => INVITE_EXEMPT_ROLES.has(r.id))) return false;

        // No content to check (e.g., pure attachment-only message)
        if (!message.content) return false;

        // Only trigger if the content matches one of our blocked patterns
        const hit = BLOCKED_IN_GENERAL.find(re => re.test(message.content));
        if (!hit) return false;

        // Figure out the category for a cleaner warning
        const isInvite = /discord(?:app)?\.com\/invite|discord\.gg/i.test(message.content);
        const isSpotify = /spotify\.com|spoti\.fi/i.test(message.content);
        const kind = isInvite ? 'server invites' : (isSpotify ? 'Spotify links' : 'this type of link');

        await message.delete();
        logger.info(`[LinkBlock] Deleted ${kind} from ${message.author.tag} in #${message.channel.name}`);

        sendLog(message.client, {
            title: `${theme.emojis.chain} Link Blocked in #general`,
            description: `A non-staff member posted a blocked link type (\`${kind}\`) in <#${GENERAL_CHANNEL_ID}>.`,
            color: theme.colors.danger,
            fields: [
                { name: `${theme.emojis.skull} User`, value: `${message.author} (${message.author.tag})`, inline: true },
                { name: `${theme.emojis.crystal} Channel`, value: `${message.channel}`, inline: true },
                { name: `${theme.emojis.spider} Content`, value: message.content.slice(0, 1024), inline: false },
            ],
            thumbnail: message.author.displayAvatarURL({ size: 256 }),
        });

        // Temporary warning so the user knows why their message disappeared
        const warning = await message.channel.send({
            content: `${message.author}, ${kind} aren't allowed in <#${GENERAL_CHANNEL_ID}>.`,
            allowedMentions: { users: [message.author.id] },
        });
        setTimeout(() => warning.delete().catch(() => {}), 5000);

        return true;
    } catch (err) {
        logger.error(`[LinkBlock] Error: ${err.message}`);
        return false;
    }
}

// ─── Partnership Channel Handler ───
// Auto-pings the partnerships role when anyone posts an ad
async function handlePartnershipAd(message) {
    try {
        // Don't ping if the message already mentions the partnership role
        if (message.content.includes(PARTNERSHIP_PING_ROLE_ID)) return;

        await message.channel.send({
            content: `<@&${PARTNERSHIP_PING_ROLE_ID}>`,
            allowedMentions: { roles: [PARTNERSHIP_PING_ROLE_ID] },
        }).then(ping => {
            // Delete the ping message after 5 seconds so it doesn't clutter the ad
            setTimeout(() => ping.delete().catch(() => {}), 5000);
        });
    } catch (err) {
        logger.error(`[Partnership] Auto-ping error: ${err.message}`);
    }
}

// ─── Staff @everyone Strip ───
// Deletes the original message and reposts it via webhook without @everyone
async function stripEveryonePing(message) {
    try {
        // Remove @everyone and @here from the content
        const cleanContent = message.content
            .replace(/@everyone/g, '`@everyone`')
            .replace(/@here/g, '`@here`');

        // Use a webhook to repost as the staff member (preserves their name + avatar)
        const webhooks = await message.channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.name === 'blvck0ut-staff' && wh.owner?.id === message.client.user.id);

        if (!webhook) {
            webhook = await message.channel.createWebhook({
                name: 'blvck0ut-staff',
                reason: 'Staff @everyone strip',
            });
        }

        // Collect attachments and embeds from original message
        const files = [...message.attachments.values()];

        await message.delete();

        await webhook.send({
            content: cleanContent,
            username: message.member.displayName,
            avatarURL: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
            files,
            embeds: message.embeds,
            allowedMentions: { parse: ['users', 'roles'] }, // Allow user/role pings, NOT @everyone
        });

        logger.info(`[StaffFilter] Stripped @everyone from ${message.author.tag} in #${message.channel.name}`);
    } catch (err) {
        logger.error(`[StaffFilter] Error stripping @everyone: ${err.message}`);
    }
}

// ─── TTS Auto-Read Handler ───
// Reads messages aloud in VC when TTS is active for the channel
function handleTTSAutoRead(message) {
    try {
        const guildId = message.guild.id;
        if (!isConnected(guildId)) return;
        if (!isChannelActive(guildId, message.channel.id)) return;

        // Don't read bot commands (prefix commands start with -)
        const content = message.content;
        if (!content || content.trim().length === 0) return;
        if (content.startsWith(config.prefix)) return;
        if (content.startsWith('/')) return;
        if (content.startsWith('>')) return;

        // Clean the text for TTS
        let text = content
            .replace(/<@!?\d+>/g, '')           // strip user mentions
            .replace(/<@&\d+>/g, '')            // strip role mentions
            .replace(/<#\d+>/g, '')             // strip channel mentions
            .replace(/<a?:\w+:\d+>/g, '')       // strip custom emojis
            .replace(/https?:\/\/\S+/g, 'link') // replace URLs with "link"
            .replace(/\|\|[^|]+\|\|/g, 'spoiler') // replace spoilers
            .replace(/[*_~`>]/g, '')            // strip markdown
            .trim();

        if (text.length === 0) return;
        if (text.length > 200) text = text.slice(0, 200);

        // Prepend username for context
        const displayName = message.member?.displayName || message.author.username;
        const fullText = `${displayName} says: ${text}`;

        const voiceKey = getUserVoice(guildId, message.author.id);
        queueTTS(guildId, fullText, voiceKey);
    } catch (err) {
        // Silent fail — don't break message processing for TTS errors
    }
}

// ─── Argument Parser ───
// Maps positional args to the slash command's option definitions
function parseArgs(message, args, optionDefs) {
    const parsed = new Map();

    // ─── Subcommand support ───
    // If the command uses subcommands (type 1), the first text arg is the subcommand name.
    // We find that subcommand's option definitions and parse the remaining args against those.
    // Note: SlashCommandSubcommandBuilder doesn't expose .type directly — check constructor name
    const subcommandDefs = optionDefs.filter(o => o.type === 1 || o.constructor?.name === 'SlashCommandSubcommandBuilder');
    if (subcommandDefs.length > 0) {
        const textArgs = args.filter(a => !a.match(/^<[@#&!]+\d+>$/));
        const subName = textArgs[0]?.toLowerCase();
        const subDef = subcommandDefs.find(s => s.name === subName);
        if (subDef && subDef.options) {
            // Recurse with the subcommand's options and remaining args (skip subcommand name)
            const subArgs = args.slice(1);
            return parseArgs(message, subArgs, subDef.options);
        }
        return parsed; // Unknown subcommand or no args — return empty
    }

    const mentionedUsers = [...message.mentions.users.values()];
    const mentionedChannels = [...message.mentions.channels.values()];
    const mentionedRoles = [...message.mentions.roles.values()];
    let userIndex = 0;
    let channelIndex = 0;
    let roleIndex = 0;
    let textArgIndex = 0;

    // Collect non-mention text args
    const textArgs = args.filter(a => !a.match(/^<[@#&!]+\d+>$/));

    for (const opt of optionDefs) {
        const name = opt.name;
        // Option types: 3=String, 4=Integer, 5=Boolean, 6=User, 7=Channel, 8=Role, 10=Number
        const type = opt.type;

        if (type === 6) {
            // User option — grab from mentions
            const user = mentionedUsers[userIndex] || null;
            const member = user ? message.guild.members.cache.get(user.id) || null : null;
            parsed.set(name, { value: user?.id, user, member });
            if (user) userIndex++;
        } else if (type === 7) {
            // Channel option
            const channel = mentionedChannels[channelIndex] || null;
            parsed.set(name, { value: channel?.id, channel });
            if (channel) channelIndex++;
        } else if (type === 8) {
            // Role option
            const role = mentionedRoles[roleIndex] || null;
            parsed.set(name, { value: role?.id, role });
            if (role) roleIndex++;
        } else if (type === 3) {
            // String option — grab remaining text args joined (for the last string opt) or single arg
            const isLastStringOpt = optionDefs.filter(o => o.type === 3).indexOf(opt) ===
                optionDefs.filter(o => o.type === 3).length - 1;

            if (isLastStringOpt) {
                // Last string option gets all remaining text args
                const value = textArgs.slice(textArgIndex).join(' ') || null;
                parsed.set(name, { value });
                textArgIndex = textArgs.length;
            } else {
                const value = textArgs[textArgIndex] || null;
                parsed.set(name, { value });
                if (value) textArgIndex++;
            }
        } else if (type === 4 || type === 10) {
            // Integer or Number
            const value = textArgs[textArgIndex] || null;
            parsed.set(name, { value });
            if (value) textArgIndex++;
        } else if (type === 5) {
            // Boolean
            const value = textArgs[textArgIndex] || null;
            parsed.set(name, { value });
            if (value) textArgIndex++;
        } else {
            parsed.set(name, { value: null });
        }
    }

    return parsed;
}

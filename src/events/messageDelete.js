const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { sendLog } = require('../utils/channelLog');
const theme = require('../utils/theme');

// In-memory cache: channelId → { content, author, attachments, timestamp }
// Each channel stores only the most recently deleted message
const snipeCache = new Map();

// Auto-expire sniped messages after 5 minutes
const SNIPE_EXPIRY_MS = 5 * 60 * 1000;

module.exports = {
    name: Events.MessageDelete,
    once: false,
    execute(message) {
        // Partial messages (not in cache before deletion) won't have content — skip them
        if (message.partial) return;

        // Ignore bots, DMs, and messages with no content or attachments
        if (message.author?.bot || !message.guild) return;
        if (!message.content && message.attachments.size === 0) return;

        const data = {
            content: message.content || null,
            author: {
                tag: message.author.tag,
                displayAvatarURL: message.author.displayAvatarURL({ dynamic: true }),
            },
            attachments: [...message.attachments.values()].map(a => a.proxyURL),
            timestamp: Date.now(),
        };

        snipeCache.set(message.channel.id, data);

        const snippet = (message.content || '*[no text content]*').slice(0, 512);
        sendLog(message.client, {
            title: `${theme.emojis.moon} Message Deleted`,
            description: `A message was deleted in ${message.channel}.`,
            color: theme.colors.accent,
            fields: [
                { name: `${theme.emojis.skull} Author`, value: `${message.author} (${message.author.tag})`, inline: true },
                { name: `${theme.emojis.crystal} Channel`, value: `${message.channel} (#${message.channel.name})`, inline: true },
                { name: `${theme.emojis.candle} Content`, value: snippet, inline: false },
            ],
            thumbnail: message.author.displayAvatarURL({ size: 256 }),
        });

        logger.info(`[Snipe] Cached deleted message from ${data.author.tag} in #${message.channel.name}`);

        // Auto-expire after 5 minutes
        setTimeout(() => {
            const cached = snipeCache.get(message.channel.id);
            if (cached && cached.timestamp === data.timestamp) {
                snipeCache.delete(message.channel.id);
            }
        }, SNIPE_EXPIRY_MS);
    },

    // Exposed so the snipe command can access the cache
    snipeCache,
};

const { Events } = require('discord.js');
const logger = require('../utils/logger');
const { sendLog } = require('../utils/channelLog');
const theme = require('../utils/theme');

// In-memory cache: channelId → { content, author, attachments, timestamp, newContent }
// Each channel stores only the most recently edited message
const editSnipeCache = new Map();

// Auto-expire edited messages after 5 minutes
const SNIPE_EXPIRY_MS = 5 * 60 * 1000;

module.exports = {
    name: Events.MessageUpdate,
    once: false,
    async execute(oldMessage, newMessage) {
        // Fetch partial messages if needed
        if (oldMessage.partial) {
            try {
                await oldMessage.fetch();
            } catch {
                return;
            }
        }

        // Ignore bots, DMs, and messages with no content change
        if (oldMessage.author?.bot || !oldMessage.guild) return;
        if (!oldMessage.content && oldMessage.attachments.size === 0) return;
        if (oldMessage.content === newMessage.content) return;

        const data = {
            content: oldMessage.content || null,
            newContent: newMessage.content || null,
            author: {
                tag: oldMessage.author.tag,
                displayAvatarURL: oldMessage.author.displayAvatarURL({ dynamic: true }),
            },
            attachments: [...oldMessage.attachments.values()].map(a => a.proxyURL),
            timestamp: Date.now(),
        };

        editSnipeCache.set(oldMessage.channel.id, data);

        const snippet = (oldMessage.content || '*[no text content]*').slice(0, 512);
        sendLog(oldMessage.client, {
            title: `${theme.emojis.crystal} Message Edited`,
            description: `A message was edited in ${oldMessage.channel}.`,
            color: theme.colors.accent,
            fields: [
                { name: `${theme.emojis.skull} Author`, value: `${oldMessage.author} (${oldMessage.author.tag})`, inline: true },
                { name: `${theme.emojis.crystal} Channel`, value: `${oldMessage.channel} (#${oldMessage.channel.name})`, inline: true },
                { name: `${theme.emojis.candle} Before`, value: snippet, inline: false },
                { name: `${theme.emojis.fire} After`, value: (newMessage.content || '*[no text content]*').slice(0, 512), inline: false },
            ],
            thumbnail: oldMessage.author.displayAvatarURL({ size: 256 }),
        });

        logger.info(`[EditSnipe] Cached edited message from ${data.author.tag} in #${oldMessage.channel.name}`);

        // Auto-expire after 5 minutes
        setTimeout(() => {
            const cached = editSnipeCache.get(oldMessage.channel.id);
            if (cached && cached.timestamp === data.timestamp) {
                editSnipeCache.delete(oldMessage.channel.id);
            }
        }, SNIPE_EXPIRY_MS);
    },

    // Exposed so the snipe command can access the cache
    editSnipeCache,
};

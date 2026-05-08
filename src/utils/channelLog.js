const { createEmbed } = require('./embeds');
const logger = require('./logger');

const LOG_CHANNEL_ID = '1471605453220872323';

/**
 * Sends a styled embed log to the designated log channel.
 * Fails silently — logging should never crash the bot.
 *
 * @param {import('discord.js').Client} client
 * @param {Object} options
 * @param {string} options.title - Embed title (with emoji)
 * @param {string} [options.description] - Embed description
 * @param {number} [options.color] - Hex color
 * @param {Array} [options.fields] - Array of { name, value, inline }
 * @param {string} [options.thumbnail] - Thumbnail URL
 */
async function sendLog(client, options) {
    try {
        const channel = client.channels.cache.get(LOG_CHANNEL_ID)
            || await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

        if (!channel) {
            logger.warn('[ChannelLog] Log channel not found: ' + LOG_CHANNEL_ID);
            return;
        }

        const embed = createEmbed(options);
        await channel.send({ embeds: [embed] });
    } catch (err) {
        logger.error('[ChannelLog] Failed to send log:', err.message);
    }
}

module.exports = { sendLog };

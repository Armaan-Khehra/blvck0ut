const { EmbedBuilder } = require('discord.js');
const theme = require('./theme');

function createEmbed(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(options.color || theme.colors.primary)
        .setTimestamp();

    embed.setFooter({
        text: options.footer || theme.footer,
        iconURL: options.footerIcon || undefined,
    });

    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.fields) embed.addFields(options.fields);

    // thumbnail = small image on the right; image = large image at bottom
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.author) embed.setAuthor(options.author);

    return embed;
}

function errorEmbed(message, thumbnail) {
    const embed = new EmbedBuilder()
        .setColor(theme.colors.danger)
        .setDescription(`${theme.emojis.skull} ${message}`);
    if (thumbnail) embed.setThumbnail(thumbnail);
    return embed;
}

function successEmbed(title, message, thumbnail) {
    return createEmbed({
        title,
        description: message,
        color: theme.colors.accent,
        thumbnail: thumbnail || undefined,
    });
}

module.exports = { createEmbed, errorEmbed, successEmbed };

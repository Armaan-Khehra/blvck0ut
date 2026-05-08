const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { sendLog } = require('../../utils/channelLog');
const db = require('../../data/database');

const countWarnings = db.prepare(
    'SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?'
);
const getLatestWarning = db.prepare(
    'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1'
);
const getWarningById = db.prepare(
    'SELECT * FROM warnings WHERE id = ? AND guild_id = ?'
);
const deleteWarning = db.prepare(
    'DELETE FROM warnings WHERE id = ? AND guild_id = ?'
);
const deleteAllWarnings = db.prepare(
    'DELETE FROM warnings WHERE guild_id = ? AND user_id = ?'
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription(`${theme.emojis.coffin} Absolve a soul of their transgressions`)
        .addUserOption(opt => opt.setName('target').setDescription('The soul to absolve').setRequired(true))
        .addIntegerOption(opt => opt.setName('id').setDescription('Warning ID to remove (leave empty for latest)').setRequired(false))
        .addBooleanOption(opt => opt.setName('all').setDescription('Clear all warnings from this soul').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const warningId = interaction.options.getInteger('id');
        const clearAll = interaction.options.getBoolean('all');

        if (target.bot) {
            return interaction.reply({ embeds: [errorEmbed('Machines carry no sins to absolve.')], ephemeral: true });
        }

        const { count } = countWarnings.get(interaction.guild.id, target.id);

        if (count === 0) {
            return interaction.reply({
                embeds: [createEmbed({
                    title: `${theme.emojis.moon} A clean soul`,
                    description: `**${target.tag}** has no recorded transgressions to remove.`,
                })],
                ephemeral: true,
            });
        }

        // Clear all warnings
        if (clearAll) {
            deleteAllWarnings.run(interaction.guild.id, target.id);

            sendLog(interaction.client, {
                title: `${theme.emojis.coffin} All Warnings Cleared`,
                description: `All **${count}** warnings removed from **${target.tag}**.`,
                color: theme.colors.danger,
                fields: [
                    { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: `${theme.emojis.skull} Target`, value: `${target} (${target.tag})`, inline: true },
                    { name: `${theme.emojis.fire} Warnings Removed`, value: `${count}`, inline: true },
                ],
                thumbnail: target.displayAvatarURL({ size: 256 }),
            });

            return interaction.reply({
                embeds: [successEmbed(
                    `${theme.emojis.coffin} All sins absolved`,
                    `**${count}** warning${count !== 1 ? 's' : ''} removed from **${target.tag}**.\nTheir record is now clean.`,
                    theme.gifs.warn,
                )],
            });
        }

        // Remove specific warning by ID
        if (warningId) {
            const warning = getWarningById.get(warningId, interaction.guild.id);

            if (!warning || warning.user_id !== target.id) {
                return interaction.reply({
                    embeds: [errorEmbed(`Warning **#${warningId}** was not found for **${target.tag}**.`)],
                    ephemeral: true,
                });
            }

            deleteWarning.run(warningId, interaction.guild.id);
            const remaining = countWarnings.get(interaction.guild.id, target.id);

            sendLog(interaction.client, {
                title: `${theme.emojis.coffin} Warning Removed`,
                description: `Warning **#${warningId}** removed from **${target.tag}**.`,
                color: theme.colors.danger,
                fields: [
                    { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: `${theme.emojis.skull} Target`, value: `${target} (${target.tag})`, inline: true },
                    { name: `${theme.emojis.candle} Warning Was`, value: warning.reason, inline: false },
                    { name: `${theme.emojis.crystal} Remaining`, value: `${remaining.count}`, inline: true },
                ],
                thumbnail: target.displayAvatarURL({ size: 256 }),
            });

            return interaction.reply({
                embeds: [successEmbed(
                    `${theme.emojis.coffin} Sin absolved`,
                    `Warning **#${warningId}** removed from **${target.tag}**.\n${theme.divider}\n**Was:** ${warning.reason}\n**Remaining sins:** ${remaining.count}`,
                    theme.gifs.warn,
                )],
            });
        }

        // Remove latest warning (default)
        const latest = getLatestWarning.get(interaction.guild.id, target.id);

        if (!latest) {
            return interaction.reply({
                embeds: [errorEmbed('No warnings found to remove.')],
                ephemeral: true,
            });
        }

        deleteWarning.run(latest.id, interaction.guild.id);
        const remaining = countWarnings.get(interaction.guild.id, target.id);

        sendLog(interaction.client, {
            title: `${theme.emojis.coffin} Latest Warning Removed`,
            description: `Warning **#${latest.id}** removed from **${target.tag}**.`,
            color: theme.colors.danger,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.skull} Target`, value: `${target} (${target.tag})`, inline: true },
                { name: `${theme.emojis.candle} Warning Was`, value: latest.reason, inline: false },
                { name: `${theme.emojis.crystal} Remaining`, value: `${remaining.count}`, inline: true },
            ],
            thumbnail: target.displayAvatarURL({ size: 256 }),
        });

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.coffin} Latest sin absolved`,
                `Warning **#${latest.id}** removed from **${target.tag}**.\n${theme.divider}\n**Was:** ${latest.reason}\n**Remaining sins:** ${remaining.count}`,
                theme.gifs.warn,
            )],
        });
    },
};

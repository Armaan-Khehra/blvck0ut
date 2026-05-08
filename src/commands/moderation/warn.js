const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { sendLog } = require('../../utils/channelLog');
const db = require('../../data/database');
const logger = require('../../utils/logger');

const insertWarning = db.prepare(
    'INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)'
);
const countWarnings = db.prepare(
    'SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?'
);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription(`${theme.emojis.fire} Mark a transgression upon their record`)
        .addUserOption(opt => opt.setName('target').setDescription('The condemned').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Their transgression').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason');

        if (!target) {
            return interaction.reply({ embeds: [errorEmbed('You must mention a user to warn.')], ephemeral: true });
        }

        if (target.bot) {
            return interaction.reply({ embeds: [errorEmbed('Machines have no soul to warn.')], ephemeral: true });
        }

        if (!reason) {
            return interaction.reply({ embeds: [errorEmbed('You must provide a reason for the warning.')], ephemeral: true });
        }

        const result = insertWarning.run(interaction.guild.id, target.id, interaction.user.id, reason);
        logger.info(`[Warn] INSERT result: changes=${result.changes}, lastRowId=${result.lastInsertRowid}, guild=${interaction.guild.id}, target=${target.id}`);
        const { count } = countWarnings.get(interaction.guild.id, target.id);
        logger.info(`[Warn] COUNT after insert: ${count} for user ${target.id}`);

        sendLog(interaction.client, {
            title: `${theme.emojis.fire} Member Warned`,
            description: `**${target.tag}** has been marked with a transgression.`,
            color: theme.colors.danger,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.skull} Target`, value: `${target} (${target.tag})`, inline: true },
                { name: `${theme.emojis.candle} Reason`, value: reason, inline: false },
                { name: `${theme.emojis.crystal} Total Warnings`, value: `${count}`, inline: true },
            ],
            thumbnail: target.displayAvatarURL({ size: 256 }),
        });

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.fire} Transgression recorded`,
                `**${target.tag}** has been marked.\n${theme.divider}\n**Reason:** ${reason}\n**Total sins:** ${count}`,
                theme.gifs.warn,
            )],
        });
    },
};

const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const logger = require('../../utils/logger');
const { sendLog } = require('../../utils/channelLog');

// PMs channel where reports are sent
const REPORTS_CHANNEL_ID = '1471599231528861866';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription(`${theme.emojis.dagger} Report a disturbance in the realm`)
        .addStringOption(opt =>
            opt.setName('reason').setDescription('Describe the transgression').setRequired(true))
        .addUserOption(opt =>
            opt.setName('user').setDescription('The soul you wish to report (optional)').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const reportedUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const reporter = interaction.user;

        try {
            // Fetch the reports channel
            const reportsChannel =
                interaction.guild.channels.cache.get(REPORTS_CHANNEL_ID) ||
                await interaction.guild.channels.fetch(REPORTS_CHANNEL_ID).catch(() => null);

            if (!reportsChannel) {
                logger.error('[Report] Reports channel not found: ' + REPORTS_CHANNEL_ID);
                return interaction.editReply({
                    embeds: [errorEmbed('The report channel has vanished from the void. Contact an admin.')],
                });
            }

            // Build the report embed
            const fields = [
                { name: `${theme.emojis.candle} Reporter`, value: `${reporter} (${reporter.tag})`, inline: true },
            ];

            if (reportedUser) {
                fields.push({ name: `${theme.emojis.dagger} Reported User`, value: `${reportedUser} (${reportedUser.tag})`, inline: true });
            }

            fields.push(
                { name: '\u200b', value: theme.divider, inline: false },
                { name: `${theme.emojis.skull} Reason`, value: reason, inline: false },
                { name: `${theme.emojis.crystal} Channel`, value: `${interaction.channel} (#${interaction.channel.name})`, inline: true },
            );

            const reportEmbed = createEmbed({
                title: `${theme.emojis.spider} ✦ Incident Report ✦`,
                description: `A disturbance has been reported in the realm.`,
                color: theme.colors.danger,
                thumbnail: theme.gifs.report,
                fields,
            });

            await reportsChannel.send({ embeds: [reportEmbed] });

            sendLog(interaction.client, {
                title: `${theme.emojis.spider} Report Filed`,
                description: `A new report has been submitted.`,
                color: theme.colors.primary,
                fields: [
                    { name: `${theme.emojis.candle} Reporter`, value: `${reporter} (${reporter.tag})`, inline: true },
                    ...(reportedUser ? [{ name: `${theme.emojis.dagger} Reported User`, value: `${reportedUser} (${reportedUser.tag})`, inline: true }] : []),
                    { name: `${theme.emojis.crystal} Channel`, value: `${interaction.channel} (#${interaction.channel.name})`, inline: true },
                    { name: `${theme.emojis.skull} Reason`, value: reason.slice(0, 1024), inline: false },
                ],
            });

            await interaction.editReply({
                embeds: [successEmbed(
                    `${theme.emojis.crystal} Report submitted`,
                    `Your report has been sent to the staff. The shadows will handle this.`,
                    theme.gifs.report,
                )],
            });

            logger.info(`[Report] ${reporter.tag} filed a report${reportedUser ? ` against ${reportedUser.tag}` : ''} in #${interaction.channel.name}`);
        } catch (error) {
            logger.error(`[Report] Error: ${error.message}`);
            await interaction.editReply({
                embeds: [errorEmbed('Failed to submit your report. The spirits are restless.')],
            });
        }
    },
};

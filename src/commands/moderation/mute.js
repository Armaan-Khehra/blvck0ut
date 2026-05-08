const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { sendLog } = require('../../utils/channelLog');

const DURATION_MAP = {
    '60s': 60_000,
    '5m': 300_000,
    '10m': 600_000,
    '30m': 1_800_000,
    '1h': 3_600_000,
    '6h': 21_600_000,
    '12h': 43_200_000,
    '1d': 86_400_000,
    '7d': 604_800_000,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription(`${theme.emojis.chain} Silence a restless spirit`)
        .addUserOption(opt => opt.setName('target').setDescription('The condemned').setRequired(true))
        .addStringOption(opt =>
            opt.setName('duration').setDescription('Duration of silence').setRequired(true)
                .addChoices(
                    { name: '60 seconds', value: '60s' },
                    { name: '5 minutes', value: '5m' },
                    { name: '10 minutes', value: '10m' },
                    { name: '30 minutes', value: '30m' },
                    { name: '1 hour', value: '1h' },
                    { name: '6 hours', value: '6h' },
                    { name: '12 hours', value: '12h' },
                    { name: '1 day', value: '1d' },
                    { name: '7 days', value: '7d' },
                ))
        .addStringOption(opt => opt.setName('reason').setDescription('Their transgression'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason given';

        if (!target) {
            return interaction.reply({ embeds: [errorEmbed('This phantom cannot be found...')], ephemeral: true });
        }

        if (!target.moderatable) {
            return interaction.reply({ embeds: [errorEmbed('This soul is beyond my reach...')], ephemeral: true });
        }

        if (!DURATION_MAP[duration]) {
            const valid = Object.keys(DURATION_MAP).join(', ');
            return interaction.reply({ embeds: [errorEmbed(`Invalid duration. Use one of: ${valid}`)], ephemeral: true });
        }

        await target.timeout(DURATION_MAP[duration], reason);

        sendLog(interaction.client, {
            title: `${theme.emojis.chain} Member Muted`,
            description: `**${target.user.tag}** has been bound in silence.`,
            color: theme.colors.danger,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.skull} Target`, value: `${target.user} (${target.user.tag})`, inline: true },
                { name: `${theme.emojis.moon} Duration`, value: duration, inline: true },
                { name: `${theme.emojis.candle} Reason`, value: reason, inline: false },
            ],
            thumbnail: target.user.displayAvatarURL({ size: 256 }),
        });

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.chain} Silenced`,
                `**${target.user.tag}** has been bound in silence for **${duration}**.\n${theme.divider}\n**Reason:** ${reason}`,
                theme.gifs.mute,
            )],
        });
    },
};

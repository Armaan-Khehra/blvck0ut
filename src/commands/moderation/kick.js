const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { sendLog } = require('../../utils/channelLog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription(`${theme.emojis.dagger} Cast someone from the crypt`)
        .addUserOption(opt => opt.setName('target').setDescription('The condemned').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Their transgression'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'No reason given';

        if (!target) {
            return interaction.reply({ embeds: [errorEmbed('This phantom cannot be found...')], ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ embeds: [errorEmbed('You cannot exile yourself, foolish mortal.')], ephemeral: true });
        }

        if (!target.kickable) {
            return interaction.reply({ embeds: [errorEmbed('This soul is beyond my reach...')], ephemeral: true });
        }

        await target.kick(reason);

        sendLog(interaction.client, {
            title: `${theme.emojis.bat} Member Kicked`,
            description: `**${target.user.tag}** has been cast from the crypt.`,
            color: theme.colors.danger,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.skull} Target`, value: `${target.user} (${target.user.tag})`, inline: true },
                { name: `${theme.emojis.candle} Reason`, value: reason, inline: false },
            ],
            thumbnail: target.user.displayAvatarURL({ size: 256 }),
        });

        await interaction.reply({
            content: `${theme.emojis.bat} **${target.user.tag}** has been kicked. Reason: ${reason}`,
        });
    },
};

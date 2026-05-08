const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { sendLog } = require('../../utils/channelLog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription(`${theme.emojis.crystal} Return a soul from the void`)
        .addStringOption(opt => opt.setName('target').setDescription('User ID of the banned soul').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Why they are being freed'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        let userId = interaction.options.getString('target');
        const reason = interaction.options.getString('reason') || 'No reason given';

        // Support raw user IDs and mentions for prefix commands
        if (!userId && interaction._prefixArgs) {
            userId = interaction._prefixArgs[0];
        }

        // Clean up mentions/formatting to get raw ID
        if (userId) {
            userId = userId.replace(/[<@!>]/g, '');
        }

        if (!userId || !/^\d{17,20}$/.test(userId)) {
            return interaction.reply({ embeds: [errorEmbed('Provide a valid user ID to unban.')], ephemeral: true });
        }

        // Check if user is actually banned
        const banInfo = await interaction.guild.bans.fetch(userId).catch(() => null);
        if (!banInfo) {
            return interaction.reply({ embeds: [errorEmbed('This soul is not banished... they walk free already.')], ephemeral: true });
        }

        // Get prefix reason (everything after the ID)
        let finalReason = reason;
        if (interaction._prefixArgs && interaction._prefixArgs.length > 1) {
            finalReason = interaction._prefixArgs.slice(1).join(' ') || reason;
        }

        try {
            await interaction.guild.bans.remove(userId, finalReason);
        } catch (err) {
            return interaction.reply({ embeds: [errorEmbed(`Failed to unban: ${err.message}`)], ephemeral: true });
        }

        const target = banInfo.user;
        const targetTag = target.tag || `${target.username}` || target.id;

        sendLog(interaction.client, {
            title: `${theme.emojis.crystal} Member Unbanned`,
            description: `**${targetTag}** has been returned from the void.`,
            color: theme.colors.success,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.skull} Target`, value: `${target} (${targetTag})`, inline: true },
                { name: `${theme.emojis.candle} Reason`, value: finalReason, inline: false },
            ],
            thumbnail: target.displayAvatarURL?.({ size: 256 }) || null,
        });

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.crystal} Soul returned`,
                `**${targetTag}** has been freed from the eternal void.\n${theme.divider}\n**Reason:** ${finalReason}`,
            )],
        });
    },
};

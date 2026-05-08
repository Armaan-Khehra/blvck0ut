const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { sendLog } = require('../../utils/channelLog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription(`${theme.emojis.dagger} Banish a soul to the void`)
        .addUserOption(opt => opt.setName('target').setDescription('The condemned').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Their transgression'))
        .addIntegerOption(opt => opt.setName('days').setDescription('Days of messages to purge (0-7)').setMinValue(0).setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        let target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason given';
        const days = interaction.options.getInteger('days') || 0;

        // Support raw user IDs for prefix commands (e.g. -ban 123456789)
        if (!target && interaction._prefixArgs) {
            const idArg = interaction._prefixArgs[0]?.replace(/[<@!>]/g, '');
            if (idArg && /^\d{17,20}$/.test(idArg)) {
                target = await interaction.client.users.fetch(idArg).catch(() => null);
            }
        }

        if (!target) {
            return interaction.reply({ embeds: [errorEmbed('Could not find that user. Provide a valid mention or user ID.')], ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ embeds: [errorEmbed('You cannot banish yourself, foolish mortal.')], ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        if (member && !member.bannable) {
            return interaction.reply({ embeds: [errorEmbed('This soul is beyond my reach...')], ephemeral: true });
        }

        try {
            await interaction.guild.bans.create(target.id, { deleteMessageSeconds: days * 86400, reason });
        } catch (err) {
            return interaction.reply({ embeds: [errorEmbed(`Failed to ban: ${err.message}`)], ephemeral: true });
        }

        const targetTag = target.tag || `${target.username}` || target.id;

        sendLog(interaction.client, {
            title: `${theme.emojis.coffin} Member Banned`,
            description: `**${targetTag}** has been banished from the realm.`,
            color: theme.colors.danger,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.skull} Target`, value: `${target} (${targetTag})`, inline: true },
                { name: `${theme.emojis.candle} Reason`, value: reason, inline: false },
                { name: `${theme.emojis.fire} Messages Purged`, value: `${days} day(s)`, inline: true },
            ],
            thumbnail: target.displayAvatarURL?.({ size: 256 }) || null,
        });

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.coffin} Soul banished`,
                `**${targetTag}** has been cast into the eternal void.\n${theme.divider}\n**Reason:** ${reason}`,
                theme.gifs.ban,
            )],
        });
    },
};

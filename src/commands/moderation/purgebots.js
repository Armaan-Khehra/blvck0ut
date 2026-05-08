const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { sendLog } = require('../../utils/channelLog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purgebots')
        .setDescription(`${theme.emojis.fire} Purge only bot messages from the channel`)
        .addIntegerOption(opt => opt.setName('amount').setDescription('Messages to scan (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const amount = interaction.options.getInteger('amount');

        // Fetch recent messages
        const fetched = await interaction.channel.messages.fetch({ limit: amount });

        // Filter to bot messages only (not older than 14 days — Discord bulk delete limit)
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const botMessages = fetched.filter(msg => msg.author.bot && msg.createdTimestamp > twoWeeksAgo);

        if (botMessages.size === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('No bot messages found in the last ' + amount + ' messages.')],
            });
        }

        const deleted = await interaction.channel.bulkDelete(botMessages, true);

        sendLog(interaction.client, {
            title: `${theme.emojis.fire} Bot Messages Purged`,
            description: `**${deleted.size}** bot messages consumed into the abyss.`,
            color: theme.colors.danger,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.crystal} Channel`, value: `${interaction.channel} (#${interaction.channel.name})`, inline: true },
                { name: `${theme.emojis.skull} Deleted`, value: `${deleted.size} bot messages (scanned ${amount})`, inline: true },
            ],
        });

        await interaction.editReply({
            embeds: [successEmbed(
                `${theme.emojis.fire} Consumed`,
                `**${deleted.size}** bot messages have been devoured by the void.`,
                theme.gifs.purge,
            )],
        });
    },
};

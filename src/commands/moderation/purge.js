const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { sendLog } = require('../../utils/channelLog');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription(`${theme.emojis.fire} Consume messages into the abyss`)
        .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const amount = interaction.options.getInteger('amount');
        const deleted = await interaction.channel.bulkDelete(amount, true);

        sendLog(interaction.client, {
            title: `${theme.emojis.fire} Messages Purged`,
            description: `**${deleted.size}** messages consumed into the abyss.`,
            color: theme.colors.danger,
            fields: [
                { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: `${theme.emojis.crystal} Channel`, value: `${interaction.channel} (#${interaction.channel.name})`, inline: true },
                { name: `${theme.emojis.skull} Messages Deleted`, value: `${deleted.size}`, inline: true },
            ],
        });

        await interaction.editReply({
            embeds: [successEmbed(
                `${theme.emojis.fire} Consumed`,
                `**${deleted.size}** messages have been devoured by the void.`,
                theme.gifs.purge,
            )],
        });
    },
};

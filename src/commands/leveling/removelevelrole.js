const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const leveling = require('../../utils/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removelevelrole')
        .setDescription(`${theme.emojis.chain} Remove a role reward for a level`)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(opt => opt.setName('level').setDescription('The level to remove the reward from').setRequired(true).setMinValue(1)),

    async execute(interaction) {
        const level = interaction.options.getInteger('level');
        const result = leveling.deleteLevelRole.run(interaction.guild.id, level);

        if (result.changes === 0) {
            return interaction.reply({
                embeds: [errorEmbed(`No role reward found for level **${level}**.`)],
                ephemeral: true,
            });
        }

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.chain} Level Role Removed`,
                `Role reward for level **${level}** has been removed.`,
                theme.gifs.levelroles,
            )],
        });
    },
};

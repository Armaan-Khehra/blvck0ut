const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const leveling = require('../../utils/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlevelrole')
        .setDescription(`${theme.emojis.chain} Set a role reward for a level`)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(opt => opt.setName('level').setDescription('The level to reward at').setRequired(true).setMinValue(1))
        .addRoleOption(opt => opt.setName('role').setDescription('The role to give').setRequired(true)),

    async execute(interaction) {
        const level = interaction.options.getInteger('level');
        const role = interaction.options.getRole('role');

        if (!role) {
            return interaction.reply({ embeds: [errorEmbed('Invalid role.')], ephemeral: true });
        }

        leveling.upsertLevelRole.run(interaction.guild.id, level, role.id);

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.chain} Level Role Set`,
                `Level **${level}** will now grant ${role}.`,
                theme.gifs.levelroles,
            )],
        });
    },
};

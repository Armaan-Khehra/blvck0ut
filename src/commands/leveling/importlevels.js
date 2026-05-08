const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const leveling = require('../../utils/leveling');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('importlevels')
        .setDescription(`${theme.emojis.crystal} Import/set a user's level (migration from Arcane)`)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(opt => opt.setName('user').setDescription('The user to set the level for').setRequired(true))
        .addIntegerOption(opt => opt.setName('level').setDescription('The level to set').setRequired(true).setMinValue(0)),

    async execute(interaction) {
        const target = interaction.options.getUser('user');
        const level = interaction.options.getInteger('level');

        if (!target) {
            return interaction.reply({ embeds: [errorEmbed('Invalid user.')], ephemeral: true });
        }

        const user = leveling.setLevel(interaction.guild.id, target.id, level);

        // Also assign any reward roles they should have at this level
        const member = interaction.guild.members.cache.get(target.id)
            || await interaction.guild.members.fetch(target.id).catch(() => null);

        if (member) {
            const rolesToAdd = leveling.getRolesForLevel(interaction.guild.id, level);
            for (const reward of rolesToAdd) {
                if (!member.roles.cache.has(reward.role_id)) {
                    member.roles.add(reward.role_id).catch(err => {
                        logger.error(`[Leveling] Failed to add role ${reward.role_id} during import: ${err.message}`);
                    });
                }
            }
        }

        await interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.crystal} Level Imported`,
                `**${target.username}** has been set to level **${level}** (${leveling.totalXpForLevel(level).toLocaleString()} total XP).`,
                theme.gifs.rank,
            )],
        });
    },
};

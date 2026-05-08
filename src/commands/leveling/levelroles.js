const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const leveling = require('../../utils/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levelroles')
        .setDescription(`${theme.emojis.chain} View all level role rewards`),

    async execute(interaction) {
        const roles = leveling.getRewardRoles(interaction.guild.id);

        if (roles.length === 0) {
            return interaction.reply({
                embeds: [errorEmbed('No level role rewards configured.')],
                ephemeral: true,
            });
        }

        const lines = roles.map(r =>
            `${theme.emojis.dagger} Level **${r.level}** — <@&${r.role_id}>`,
        );

        const embed = createEmbed({
            title: `${theme.emojis.chain} Level Role Rewards`,
            thumbnail: theme.gifs.levelroles,
            description: [
                '*Roles granted upon ascension*',
                theme.divider,
                '',
                ...lines,
            ].join('\n'),
            color: theme.colors.accent,
        });

        await interaction.reply({ embeds: [embed] });
    },
};

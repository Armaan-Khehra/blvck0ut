const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription(`${theme.emojis.fire} Continue the dark hymn`),

    async execute(interaction) {
        const queue = useQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ embeds: [errorEmbed('No ritual is playing.')], ephemeral: true });
        }

        if (!queue.node.isPaused()) {
            return interaction.reply({ embeds: [errorEmbed('The hymn is not suspended.')], ephemeral: true });
        }

        queue.node.resume();
        await interaction.reply({
            embeds: [successEmbed(`${theme.emojis.fire} Resumed`, 'The dark hymn continues...', theme.gifs.playing)],
        });
    },
};

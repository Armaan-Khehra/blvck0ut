const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription(`${theme.emojis.moon} Suspend the dark hymn`),

    async execute(interaction) {
        const queue = useQueue(interaction.guildId);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ embeds: [errorEmbed('No ritual is playing.')], ephemeral: true });
        }

        if (queue.node.isPaused()) {
            return interaction.reply({ embeds: [errorEmbed('The hymn is already suspended.')], ephemeral: true });
        }

        queue.node.pause();
        await interaction.reply({
            embeds: [successEmbed(`${theme.emojis.moon} Suspended`, 'The dark hymn hangs in silence...', theme.gifs.playing)],
        });
    },
};

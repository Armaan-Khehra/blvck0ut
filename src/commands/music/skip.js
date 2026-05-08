const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription(`${theme.emojis.bat} Skip to the next requiem`),

    async execute(interaction) {
        const queue = useQueue(interaction.guildId);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ embeds: [errorEmbed('No ritual is playing.')], ephemeral: true });
        }

        queue.node.skip();
        await interaction.reply({ embeds: [successEmbed(`${theme.emojis.bat} Skipped`, 'Moving to the next dark hymn...', theme.gifs.playing)] });
    },
};

const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription(`${theme.emojis.coffin} Silence the ritual`),

    async execute(interaction) {
        const queue = useQueue(interaction.guildId);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ embeds: [errorEmbed('No ritual is playing.')], ephemeral: true });
        }

        queue.delete();
        await interaction.reply({ embeds: [successEmbed(`${theme.emojis.coffin} Silenced`, 'The ritual has been ended. Silence falls.', theme.gifs.playing)] });
    },
};

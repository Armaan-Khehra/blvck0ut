const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription(`${theme.emojis.fire} Adjust the intensity of the void`)
        .addIntegerOption(opt => opt.setName('level').setDescription('Volume level (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),

    async execute(interaction) {
        const queue = useQueue(interaction.guildId);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ embeds: [errorEmbed('No ritual is playing.')], ephemeral: true });
        }

        const level = interaction.options.getInteger('level');
        queue.node.setVolume(level);

        await interaction.reply({
            embeds: [successEmbed(`${theme.emojis.fire} Volume set`, `The void now resonates at **${level}%**.`, theme.gifs.playing)],
        });
    },
};

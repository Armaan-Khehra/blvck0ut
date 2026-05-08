const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription(`${theme.emojis.crystal} Reveal the current incantation`),

    async execute(interaction) {
        const queue = useQueue(interaction.guildId);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ embeds: [errorEmbed('No ritual is playing.')], ephemeral: true });
        }

        const track = queue.currentTrack;
        const progress = queue.node.createProgressBar({ length: 20 });

        const embed = createEmbed({
            title: `${theme.emojis.music} Currently channeling`,
            thumbnail: theme.gifs.playing,
            description: [
                `**[${track.title}](${track.url})**`,
                '',
                progress || '',
                '',
                `${theme.emojis.skull} Summoned by: ${track.requestedBy}`,
                `${theme.emojis.candle} Volume: ${queue.node.volume}%`,
            ].join('\n'),
            color: theme.colors.music,
        });

        if (track.thumbnail) embed.setThumbnail(track.thumbnail);

        await interaction.reply({ embeds: [embed] });
    },
};

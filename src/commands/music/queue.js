const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription(`${theme.emojis.candle} View the procession of hymns`),

    async execute(interaction) {
        const queue = useQueue(interaction.guildId);
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ embeds: [errorEmbed('No ritual is playing.')], ephemeral: true });
        }

        const current = queue.currentTrack;
        const tracks = queue.tracks.toArray().slice(0, 10);

        let description = `**Now channeling:**\n[${current.title}](${current.url}) [${current.duration}]\n\n`;

        if (tracks.length > 0) {
            description += '**Up next in the procession:**\n';
            description += tracks.map((t, i) =>
                `**${i + 1}.** [${t.title}](${t.url}) [${t.duration}]`
            ).join('\n');
        } else {
            description += '*No more hymns in the procession...*';
        }

        const totalSize = queue.tracks.size;
        if (totalSize > 10) {
            description += `\n\n...and **${totalSize - 10}** more`;
        }

        await interaction.reply({
            embeds: [createEmbed({
                title: `${theme.emojis.candle} Procession of Dark Hymns`,
            thumbnail: theme.gifs.queued,
                description,
                color: theme.colors.music,
            })],
        });
    },
};

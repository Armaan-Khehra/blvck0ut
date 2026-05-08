const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { joinForTTS, toggleChannel, isConnected, getState } = require('../../utils/tts');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tts')
        .setDescription(`${theme.emojis.candle} Join your VC and start reading messages aloud`),

    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [errorEmbed('You must be in a voice channel to summon the TTS spirit.')],
                ephemeral: true,
            });
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return interaction.reply({
                embeds: [errorEmbed('I lack the power to enter that voice channel. Grant me **Connect** and **Speak** permissions.')],
                ephemeral: true,
            });
        }

        await interaction.deferReply();

        try {
            await joinForTTS(voiceChannel);

            // Auto-enable reading for the current text channel
            const guildId = interaction.guild.id;
            const enabled = toggleChannel(guildId, interaction.channel.id);
            if (!enabled) {
                // Was already enabled, re-enable it
                toggleChannel(guildId, interaction.channel.id);
            }

            const embed = createEmbed({
                title: `${theme.emojis.candle} TTS Spirit Summoned`,
                description: [
                    `Connected to **${voiceChannel.name}**`,
                    `Now reading messages from <#${interaction.channel.id}>`,
                    '',
                    `\`-voice\` — change your voice`,
                    `\`-say <text>\` — speak something once`,
                    `\`-ttstop\` — silence the spirit`,
                ].join('\n'),
                color: theme.colors.accent,
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            await interaction.editReply({
                embeds: [errorEmbed(`Failed to join voice: ${err.message}`)],
            });
        }
    },
};

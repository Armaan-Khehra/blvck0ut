const { SlashCommandBuilder } = require('discord.js');
const { useMainPlayer } = require('discord-player');
const { errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { markUserTrack, isAutoplayRunning } = require('../../utils/autoplay');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription(`${theme.emojis.music} Summon a dark melody`)
        .addStringOption(opt => opt.setName('query').setDescription('URL or search term').setRequired(true)),

    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ embeds: [errorEmbed('You must be in a voice channel to summon music.')], ephemeral: true });
        }

        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return interaction.reply({ embeds: [errorEmbed('I lack the power to enter that voice channel. Grant me **Connect** and **Speak** permissions.')], ephemeral: true });
        }

        const query = interaction.options.getString('query');
        const logger = require('../../utils/logger');

        // deferReply can fail with Unknown interaction — don't let it block playback
        let deferred = false;
        try {
            await interaction.deferReply();
            deferred = true;
        } catch (e) {
            logger.warn('Failed to defer reply (will continue playing):', e.message);
        }

        try {
            const player = useMainPlayer();

            // Destroy stale voice connection to prevent rejoin timeouts
            const { getVoiceConnection } = require('discord-voip');
            const existing = getVoiceConnection(interaction.guildId);
            if (existing) {
                const { VoiceConnectionStatus } = require('discord-voip');
                if (existing.state.status === VoiceConnectionStatus.Destroyed ||
                    existing.state.status === VoiceConnectionStatus.Disconnected) {
                    logger.info('[VOICE] Destroying stale connection before play');
                    try { existing.destroy(); } catch (_) {}
                }
            }

            // If autoplay is running, mark this as a user-requested track
            // and clear the current autoplay queue
            if (isAutoplayRunning()) {
                markUserTrack();
                const queue = player.queues.get(interaction.guildId);
                if (queue) {
                    queue.tracks.clear();
                    queue.node.skip();
                }
            }

            logger.info(`Playing query: "${query}" in ${voiceChannel.name}`);
            const result = await player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        requestedBy: interaction.user,
                    },
                    leaveOnEmpty: false,
                    leaveOnEmptyCooldown: 0,
                    leaveOnEnd: false,
                    selfDeaf: true,
                    volume: 100,
                    // ─── All DSP disabled for Opus passthrough (zero re-encoding) ───
                    disableEqualizer: true,
                    disableBiquad: true,
                    disableVolume: true,
                    disableResampler: true,
                    disableFilters: true,
                    disableCompressor: true,
                    disableReverb: true,
                    disableSeeker: true,
                },
                // Voice connection options (top-level for player.play)
                connectionOptions: {
                    deaf: true,
                },
                requestedBy: interaction.user,
            });
            logger.info(`player.play() resolved for: ${result.track.title}`);

            if (deferred) await interaction.deleteReply().catch(() => {});
        } catch (error) {
            logger.error('Play command error:', error);
            if (deferred) {
                await interaction.editReply({ embeds: [errorEmbed(`Could not summon that melody: \`${error.message}\``)] }).catch(() => {});
            }
        }
    },
};

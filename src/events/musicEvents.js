const { createEmbed } = require('../utils/embeds');
const theme = require('../utils/theme');
const logger = require('../utils/logger');
const { onQueueEmpty, isAutoplayRunning } = require('../utils/autoplay');

module.exports = function setupMusicEvents(client) {
    const player = client.player;

    player.events.on('playerStart', async (queue, track) => {
        const isAutoplay = queue.metadata?.isAutoplay;
        const channel = queue.metadata.channel;
        if (!channel && !isAutoplay) return;

        // ─── Force max audio quality ───
        const vc = queue.channel;
        try {
            if (vc && vc.manageable) {
                const guild = vc.guild;
                const maxBitrate = guild.maximumBitrate || 96000;
                if (vc.bitrate < maxBitrate) {
                    await vc.setBitrate(maxBitrate).catch(() => {});
                }
                logger.info(`[QUALITY] Voice channel bitrate: ${vc.bitrate}bps (max: ${maxBitrate}bps)`);
            }
        } catch (_) {}

        // Apply Opus encoder quality settings (may need a short delay for encoder init)
        const applyOpusQuality = () => {
            try {
                const enc = queue.dispatcher?.audioResource?.encoder;
                const raw = enc?.encoder;
                if (!raw) return false;

                const ctl = raw.applyEncoderCTL || raw.encoderCTL || raw.applyEncoderCtl;
                if (typeof ctl !== 'function') return false;

                const targetBitrate = vc?.bitrate || 256000;
                ctl.call(raw, 4000, 2049);   // APPLICATION = AUDIO (not VOIP — fixes muffled bass)
                ctl.call(raw, 4024, 3002);   // SIGNAL = MUSIC
                ctl.call(raw, 4010, 10);     // COMPLEXITY = 10 (max quality)
                ctl.call(raw, 4008, 1105);   // BANDWIDTH = FULLBAND (20kHz)
                ctl.call(raw, 4002, targetBitrate); // BITRATE = match channel
                ctl.call(raw, 4012, 0);      // FEC = off
                ctl.call(raw, 4014, 0);      // PLP = 0%
                logger.info(`[QUALITY] Opus: AUDIO, MUSIC, complexity=10, FULLBAND, ${targetBitrate}bps`);
                return true;
            } catch (e) {
                logger.warn('[QUALITY] Error applying Opus settings:', e.message);
                return false;
            }
        };

        // Try immediately, retry after short delays if encoder isn't ready yet
        if (!applyOpusQuality()) {
            setTimeout(() => { if (!applyOpusQuality()) setTimeout(applyOpusQuality, 1000); }, 500);
        }

        // Skip announcements for autoplay tracks — only announce user-requested songs
        if (!isAutoplay && channel) {
            const embed = createEmbed({
                title: `${theme.emojis.music} Now channeling...`,
                thumbnail: theme.gifs.playing,
                description: `**[${track.title}](${track.url})**`,
                color: theme.colors.music,
                fields: [
                    { name: `${theme.emojis.candle} Duration`, value: track.duration, inline: true },
                    { name: `${theme.emojis.skull} Summoned by`, value: `${track.requestedBy}`, inline: true },
                ],
            });
            if (track.thumbnail) embed.setThumbnail(track.thumbnail);
            channel.send({ embeds: [embed] }).catch(() => {});
        }

        // Set voice channel status to current song
        const voiceChannel = queue.channel;
        if (voiceChannel) {
            const statusText = `${theme.emojis.music} ${track.title}`.slice(0, 500);
            try {
                await client.rest.put(`/channels/${voiceChannel.id}/voice-status`, {
                    body: { status: statusText },
                });
            } catch (err) {
                logger.error(`Failed to set VC status: ${err.message}`);
            }
        }
    });

    player.events.on('audioTrackAdd', (queue, track) => {
        const channel = queue.metadata.channel;
        if (!channel) return;

        // Don't show messages for autoplay tracks
        if (queue.metadata?.isAutoplay) return;

        // Don't show "Added" for the first track — playerStart handles that
        if (queue.tracks.size === 0) return;

        const embed = createEmbed({
            title: `${theme.emojis.rose} Added to the procession`,
            thumbnail: theme.gifs.queued,
            description: `**[${track.title}](${track.url})** [${track.duration}]`,
            color: theme.colors.music,
        });
        channel.send({ embeds: [embed] }).catch(() => {});
    });

    player.events.on('emptyQueue', async (queue) => {
        // If autoplay is running, queue the next HARDKNOCK track
        if (isAutoplayRunning()) {
            logger.info('[Autoplay] emptyQueue fired — queuing next track');
            onQueueEmpty();
            return;
        }

        const channel = queue.metadata.channel;
        if (!channel) return;

        const embed = createEmbed({
            title: `${theme.emojis.moon} The silence returns...`,
            description: 'The queue is empty. The ritual has ended.',
            color: theme.colors.primary,
        });
        channel.send({ embeds: [embed] }).catch(() => {});

        // Clear voice channel status
        const voiceChannel = queue.channel;
        if (voiceChannel) {
            client.rest.put(`/channels/${voiceChannel.id}/voice-status`, {
                body: { status: '' },
            }).catch(err => logger.error(`Failed to clear VC status: ${err.message}`));
        }
    });

    // Bot stays in VC forever — no emptyChannel handler needed

    player.events.on('playerError', (queue, error) => {
        logger.error('Player error:', error);
        const channel = queue.metadata.channel;
        if (channel) {
            const embed = createEmbed({
                title: `${theme.emojis.skull} The dark melody shattered...`,
                description: `\`${error.message}\``,
                color: theme.colors.danger,
            });
            channel.send({ embeds: [embed] }).catch(() => {});
        }
    });

    player.events.on('error', (queue, error) => {
        logger.error('Queue error:', error);
    });

    player.events.on('playerFinish', (queue, track) => {
        logger.info(`Finished track: ${track.title}`);
        // Fallback: if queue is empty and autoplay is active, trigger next track
        // (in case emptyQueue doesn't fire)
        if (isAutoplayRunning() && queue.tracks.size === 0) {
            logger.info('[Autoplay] playerFinish — queue empty, triggering next');
            setTimeout(() => onQueueEmpty(), 2000);
        }
    });

    // Debug logging to trace playback pipeline
    player.events.on('debug', (queue, message) => {
        logger.info(`[DEBUG] ${message}`);
    });

    player.events.on('willPlayTrack', (queue, track, config, done) => {
        logger.info(`[willPlayTrack] ${track.title}`);
        done();
    });

    logger.info('Music events registered');
};

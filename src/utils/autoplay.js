const { useMainPlayer } = require('discord-player');
const logger = require('./logger');

// ─── 24/7 HARDKNOCK Radio ───
const MUSIC_VC_ID = '1471599231121887373';
const RESUME_DELAY = 60_000; // 1 minute silence before resuming

// HARDKNOCK tracks — specific search queries to match the correct artist
// Using "HARDKNOCK Official" to avoid matching random type beats
const HARDKNOCK_TRACKS = [
    'HARDKNOCK HERE COMES THE LORD Official Lyric Visualizer',
    'HARDKNOCK PRAISE THE LORD Official Lyric Visualizer',
    'HARDKNOCK AVE MARIA Official Lyric Visualizer',
    'HARDKNOCK GOLGOTHA Official Lyric Visualizer',
    'HARDKNOCK BYZANTINE Slowed Official Visualizer',
    'HARDKNOCK LORDS PRAYER Slowed Official Visualizer',
    'HARDKNOCK JERUSALEM Slowed Official Visualizer',
    'HARDKNOCK BRAVEHEART Slowed Official Visualizer',
    'HARDKNOCK MEDIA VITA',
    'HARDKNOCK DEUS VULT',
    'HARDKNOCK HERE COMES THE LORD Slowed',
    'HARDKNOCK PRAISE THE LORD Ultra Slowed',
];

let isAutoplayActive = false;
let resumeTimer = null;
let userRequestedTrack = false;
let autoplayClient = null;
let lastPlayedIndex = -1;

function getRandomTrack() {
    // Avoid playing the same track twice in a row
    let index;
    do {
        index = Math.floor(Math.random() * HARDKNOCK_TRACKS.length);
    } while (index === lastPlayedIndex && HARDKNOCK_TRACKS.length > 1);
    lastPlayedIndex = index;
    return HARDKNOCK_TRACKS[index];
}

async function startAutoplay(client) {
    autoplayClient = client;
    isAutoplayActive = true;
    await playNextHardknock();
}

async function playNextHardknock() {
    if (!isAutoplayActive || !autoplayClient) return;

    try {
        const player = useMainPlayer();
        const guild = autoplayClient.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return;

        const voiceChannel = await guild.channels.fetch(MUSIC_VC_ID).catch(() => null);
        if (!voiceChannel) {
            logger.error('[Autoplay] Music VC not found');
            return;
        }

        logger.info(`[Autoplay] VC: ${voiceChannel.name}, type: ${voiceChannel.type}`);

        // No text channel needed — autoplay tracks don't post announcements

        const query = getRandomTrack();
        logger.info(`[Autoplay] Playing: ${query}`);

        userRequestedTrack = false;

        await player.play(voiceChannel, query, {
            nodeOptions: {
                metadata: {
                    channel: null,
                    requestedBy: autoplayClient.user,
                    isAutoplay: true,
                },
                leaveOnEmpty: false,
                leaveOnEmptyCooldown: 0,
                leaveOnEnd: false,
                selfDeaf: true,
                volume: 100,
                disableEqualizer: true,
                disableBiquad: true,
                disableVolume: true,
                disableResampler: true,
                disableFilters: true,
                disableCompressor: true,
                disableReverb: true,
                disableSeeker: true,
            },
            connectionOptions: { deaf: true },
            requestedBy: autoplayClient.user,
        });
    } catch (err) {
        logger.error(`[Autoplay] Failed to play: ${err.message}`);
        // Retry after 10 seconds
        setTimeout(() => playNextHardknock(), 10_000);
    }
}

// Called when a user uses -play — marks the current session as user-requested
function markUserTrack() {
    userRequestedTrack = true;
    // Cancel any pending resume timer
    if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
    }
}

// Called when the queue becomes empty — schedule autoplay resume after delay
function onQueueEmpty() {
    if (!isAutoplayActive) return;

    // If a user track just ended, wait 1 minute then resume HARDKNOCK
    if (userRequestedTrack) {
        logger.info(`[Autoplay] User track ended — resuming HARDKNOCK in ${RESUME_DELAY / 1000}s`);
        resumeTimer = setTimeout(() => {
            resumeTimer = null;
            userRequestedTrack = false;
            playNextHardknock();
        }, RESUME_DELAY);
    } else {
        // Autoplay track ended — play next immediately
        playNextHardknock();
    }
}

function stopAutoplay() {
    isAutoplayActive = false;
    if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
    }
}

function isAutoplayRunning() {
    return isAutoplayActive;
}

module.exports = {
    startAutoplay,
    stopAutoplay,
    playNextHardknock,
    markUserTrack,
    onQueueEmpty,
    isAutoplayRunning,
    MUSIC_VC_ID,
};

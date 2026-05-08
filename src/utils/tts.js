// ─── Text-to-Speech Engine ───
// Manages voice connections, TTS audio queue, and per-user voice profiles.
// Uses Google TTS (free, no API key) with multiple language voices.

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection,
    NoSubscriberBehavior,
} = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const https = require('https');
const { Readable } = require('stream');
const logger = require('./logger');

// ─── Voice Profiles ───
// Each voice has a Google TTS language code + display info
const VOICES = {
    ghostly:   { lang: 'en-US',  label: 'Ghostly',      emoji: '👻', desc: 'Default haunting English voice' },
    deep:      { lang: 'en-AU',  label: 'Deep',          emoji: '🦇', desc: 'Deep Australian tone' },
    whisper:   { lang: 'en-UK',  label: 'Whisper',       emoji: '🌙', desc: 'Soft British whisper' },
    demonic:   { lang: 'de',     label: 'Demonic',       emoji: '😈', desc: 'German demonic growl' },
    cursed:    { lang: 'ja',     label: 'Cursed',        emoji: '☠️', desc: 'Japanese cursed tongue' },
    phantom:   { lang: 'fr',     label: 'Phantom',       emoji: '🎭', desc: 'French phantom voice' },
    shadow:    { lang: 'ru',     label: 'Shadow',        emoji: '🕷️', desc: 'Russian shadow voice' },
    void:      { lang: 'ko',     label: 'Void',          emoji: '🕳️', desc: 'Korean void speaker' },
    crypt:     { lang: 'pt',     label: 'Crypt',         emoji: '⚰️', desc: 'Portuguese crypt keeper' },
    wraith:    { lang: 'es',     label: 'Wraith',        emoji: '💀', desc: 'Spanish wraith voice' },
    banshee:   { lang: 'it',     label: 'Banshee',       emoji: '👁️', desc: 'Italian banshee wail' },
    nightcall: { lang: 'nl',     label: 'Nightcall',     emoji: '🌑', desc: 'Dutch nightcall voice' },
    blood:     { lang: 'pl',     label: 'Blood',         emoji: '🩸', desc: 'Polish blood voice' },
    reaper:    { lang: 'tr',     label: 'Reaper',        emoji: '⚔️', desc: 'Turkish reaper voice' },
    hex:       { lang: 'hi',     label: 'Hex',           emoji: '🔮', desc: 'Hindi hex caster' },
    grave:     { lang: 'sv',     label: 'Grave',         emoji: '🪦', desc: 'Swedish gravedigger' },
    ritual:    { lang: 'ar',     label: 'Ritual',        emoji: '🕯️', desc: 'Arabic ritual chant' },
    specter:   { lang: 'zh-CN',  label: 'Specter',       emoji: '👹', desc: 'Chinese specter voice' },
    dusk:      { lang: 'vi',     label: 'Dusk',          emoji: '🌘', desc: 'Vietnamese dusk voice' },
    frostbite: { lang: 'fi',     label: 'Frostbite',     emoji: '🥶', desc: 'Finnish frostbite voice' },
};

// ─── Per-guild TTS state ───
// Map<guildId, { connection, player, queue[], activeChannels: Set<channelId>, userVoices: Map<userId, voiceKey> }>
const ttsState = new Map();

// ─── Get or create TTS state for a guild ───
function getState(guildId) {
    if (!ttsState.has(guildId)) {
        ttsState.set(guildId, {
            connection: null,
            player: null,
            queue: [],
            playing: false,
            activeChannels: new Set(), // text channels being auto-read
            userVoices: new Map(),     // userId → voice key
            vcId: null,                // voice channel the bot is in for TTS
        });
    }
    return ttsState.get(guildId);
}

// ─── Join a voice channel for TTS ───
async function joinForTTS(voiceChannel) {
    const guildId = voiceChannel.guild.id;
    const state = getState(guildId);

    // If already connected to this channel, reuse
    const existing = getVoiceConnection(guildId);
    if (existing && state.vcId === voiceChannel.id) {
        return state;
    }

    // Destroy old connection if switching channels
    if (existing) {
        existing.destroy();
    }

    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false, // TTS bot shouldn't deafen
        selfMute: false,
    });

    // Wait for ready
    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
    } catch (err) {
        connection.destroy();
        throw new Error('Failed to join voice channel');
    }

    // Create audio player
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play, // keep playing even if no one listening
        },
    });

    connection.subscribe(player);

    // When a track finishes, play next in queue
    player.on(AudioPlayerStatus.Idle, () => {
        state.playing = false;
        processQueue(guildId);
    });

    player.on('error', (err) => {
        logger.error(`[TTS] Player error: ${err.message}`);
        state.playing = false;
        processQueue(guildId);
    });

    // Handle disconnection
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
        } catch {
            // Actually disconnected — clean up
            cleanup(guildId);
        }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
        cleanup(guildId);
    });

    state.connection = connection;
    state.player = player;
    state.vcId = voiceChannel.id;

    logger.info(`[TTS] Joined voice channel: ${voiceChannel.name} (${guildId})`);
    return state;
}

// ─── Leave and clean up ───
function leaveTTS(guildId) {
    const connection = getVoiceConnection(guildId);
    if (connection) connection.destroy();
    cleanup(guildId);
}

function cleanup(guildId) {
    const state = ttsState.get(guildId);
    if (state) {
        state.connection = null;
        state.player = null;
        state.queue = [];
        state.playing = false;
        state.activeChannels.clear();
        state.vcId = null;
    }
}

// ─── Get TTS audio URL from Google ───
function getTTSUrl(text, lang = 'en-US') {
    // Google TTS has a 200 char limit, truncate if needed
    const clean = text.slice(0, 200);
    return googleTTS.getAudioUrl(clean, {
        lang: lang,
        slow: false,
        host: 'https://translate.google.com',
    });
}

// ─── Download audio from URL to a readable stream ───
function downloadAudio(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(Readable.from(buffer));
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

// ─── Add text to the TTS queue ───
function queueTTS(guildId, text, voiceKey = 'ghostly') {
    const state = getState(guildId);
    if (!state.connection || !state.player) return;

    const voice = VOICES[voiceKey] || VOICES.ghostly;
    state.queue.push({ text, lang: voice.lang });
    processQueue(guildId);
}

// ─── Process the queue — play next item ───
async function processQueue(guildId) {
    const state = getState(guildId);
    if (!state || state.playing || state.queue.length === 0) return;
    if (!state.player || !state.connection) return;

    state.playing = true;
    const item = state.queue.shift();

    try {
        const url = getTTSUrl(item.text, item.lang);
        const stream = await downloadAudio(url);
        const resource = createAudioResource(stream, {
            inlineVolume: true,
        });
        resource.volume?.setVolume(1.5); // slightly louder for TTS clarity

        state.player.play(resource);
    } catch (err) {
        logger.error(`[TTS] Failed to play: ${err.message}`);
        state.playing = false;
        processQueue(guildId); // skip and try next
    }
}

// ─── Toggle auto-read for a text channel ───
function toggleChannel(guildId, channelId) {
    const state = getState(guildId);
    if (state.activeChannels.has(channelId)) {
        state.activeChannels.delete(channelId);
        return false; // disabled
    } else {
        state.activeChannels.add(channelId);
        return true; // enabled
    }
}

// ─── Check if a text channel has auto-read enabled ───
function isChannelActive(guildId, channelId) {
    const state = getState(guildId);
    return state.activeChannels.has(channelId);
}

// ─── Check if TTS is connected in a guild ───
function isConnected(guildId) {
    const state = ttsState.get(guildId);
    return !!(state && state.connection && state.vcId);
}

// ─── Get / Set user voice ───
function getUserVoice(guildId, userId) {
    const state = getState(guildId);
    return state.userVoices.get(userId) || 'ghostly';
}

function setUserVoice(guildId, userId, voiceKey) {
    if (!VOICES[voiceKey]) return false;
    const state = getState(guildId);
    state.userVoices.set(userId, voiceKey);
    return true;
}

module.exports = {
    VOICES,
    joinForTTS,
    leaveTTS,
    queueTTS,
    toggleChannel,
    isChannelActive,
    isConnected,
    getUserVoice,
    setUserVoice,
    getState,
};

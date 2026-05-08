require('dotenv').config();
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpegPath;
process.env.PATH = path.dirname(ffmpegPath) + ':' + process.env.PATH;
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { Readable } = require('stream');
const execFileAsync = promisify(execFile);
const config = require('./config');
const loadCommands = require('./src/handlers/commandHandler');
const loadEvents = require('./src/handlers/eventHandler');
const logger = require('./src/utils/logger');
const setupMusicEvents = require('./src/events/musicEvents');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
    ],
});

client.commands = new Collection();

// Initialize discord-player — skipFFmpeg allows Opus passthrough (zero re-encoding)
const player = new Player(client, {
    skipFFmpeg: true,
    connectionTimeout: 20000,
    lagMonitor: 0,
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
    },
});
client.player = player;

loadCommands(client);
loadEvents(client);
setupMusicEvents(client);

// ─── Voice connection cleanup + diagnostics ───
const { getVoiceConnection, getVoiceConnections } = require('discord-voip');

// On ready, resolve dynamic emoji IDs + destroy stale voice connections
const { initCurrencyEmoji } = require('./src/utils/economy');
const { initEmojis } = require('./src/utils/theme');
client.once('ready', () => {
    const emojiCount = initEmojis(client);
    logger.info(`[Theme] Resolved ${emojiCount} animated emojis`);
    initCurrencyEmoji(client);
    const connections = getVoiceConnections();
    if (connections?.size > 0) {
        logger.info(`[VOICE] Cleaning up ${connections.size} stale voice connection(s)`);
        for (const [, conn] of connections) {
            conn.destroy();
        }
    }
});

process.on('unhandledRejection', (err) => logger.error('Unhandled rejection:', err));
process.on('uncaughtException', (err) => logger.error('Uncaught exception:', err));

// Load extractors, then login once they're ready
async function start() {
    await player.extractors.loadMulti(DefaultExtractors);
    await player.extractors.register(YoutubeiExtractor, {
        disablePlayer: true,     // Skip broken youtubei.js decipher entirely
        logLevel: 'NONE',
        streamOptions: {
            highWaterMark: 1 << 25, // 32MB buffer
        },
        // Stream YouTube Opus directly — zero re-encoding for best quality
        createStream: async (track) => {
            const videoId = track.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
            const url = videoId ? `https://youtu.be/${videoId}` : track.url;
            logger.info(`yt-dlp extracting stream for: ${url}`);

            // Try Opus-only first (direct passthrough, no FFmpeg re-encoding)
            try {
                const { stdout } = await execFileAsync('yt-dlp', [
                    '-f', 'bestaudio[acodec=opus]',
                    '-g', '--no-warnings', url,
                ], { timeout: 15000 });
                const streamUrl = stdout.trim();
                logger.info(`yt-dlp Opus stream → direct passthrough (${streamUrl.length} chars)`);
                const response = await fetch(streamUrl);
                return { stream: Readable.fromWeb(response.body), $fmt: 'webm/opus' };
            } catch (_) {
                logger.info('Opus not available, falling back to FFmpeg path');
            }

            // Fallback: any format (FFmpeg will decode + re-encode)
            const { stdout } = await execFileAsync('yt-dlp', [
                '-f', 'bestaudio/best',
                '-g', '--no-warnings', url,
            ], { timeout: 30000 });
            const streamUrl = stdout.trim();
            logger.info(`yt-dlp fallback stream URL (${streamUrl.length} chars)`);
            return streamUrl;
        },
    });
    logger.info('Music extractors loaded');

    await client.login(config.token);
}

start().catch(err => {
    logger.error('Failed to start bot:', err);
    process.exit(1);
});

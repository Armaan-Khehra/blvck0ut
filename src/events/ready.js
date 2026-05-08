const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const db = require('../data/database');
const { createEmbed } = require('../utils/embeds');
const theme = require('../utils/theme');
const { setupMonsterEmojis } = require('../utils/monsterEmojis');
const { getDueGiveaways, endGiveaway } = require('../utils/giveaways');
const { syncSupporterRole, SUPPORTER_ROLE_ID } = require('./guildMemberUpdate');
const { startAutoplay } = require('../utils/autoplay');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        logger.info(`${client.user.tag} has risen from the shadows.`);
        logger.info(`Serving ${client.guilds.cache.size} guild(s)`);

        client.user.setActivity('the void', { type: ActivityType.Watching });

        // ─── 24/7 HARDKNOCK Radio: Start after a short delay (let extractors load) ───
        setTimeout(() => {
            startAutoplay(client).catch(err => {
                logger.error(`[Autoplay] Failed to start: ${err.message}`);
            });
        }, 5000);

        // Upload monster emojis to the first guild (one-time setup)
        const guild = client.guilds.cache.first();
        if (guild) {
            setupMonsterEmojis(guild).catch(err => {
                logger.error('Monster emoji setup failed:', err.message);
            });
        }

        // Reminder polling - check every 30 seconds
        setInterval(() => {
            const now = new Date().toISOString();
            const due = db.prepare('SELECT * FROM reminders WHERE remind_at <= ?').all(now);

            for (const reminder of due) {
                const channel = client.channels.cache.get(reminder.channel_id);
                if (channel) {
                    const embed = createEmbed({
                        title: `${theme.emojis.candle} The shadows remind you...`,
                    thumbnail: theme.gifs.reminder,
                        description: `<@${reminder.user_id}>, you asked to be reminded:\n\n**${reminder.message}**`,
                        color: theme.colors.accent,
                    });
                    channel.send({ embeds: [embed] }).catch(() => {});
                }
                db.prepare('DELETE FROM reminders WHERE id = ?').run(reminder.id);
            }
        }, 30_000);

        // ─── Supporter Role: Full guild scan on startup ───
        // Fetches each user individually since bulk fetch doesn't include clan tag data
        const mainGuild = client.guilds.cache.get(process.env.GUILD_ID);
        logger.info(`[Supporter] Guild lookup: ${mainGuild ? mainGuild.name : 'NOT FOUND'} (ID: ${process.env.GUILD_ID})`);
        if (mainGuild) {
            // Helper: fetch with a timeout so rate-limited requests don't hang forever
            const fetchWithTimeout = (user, ms = 5000) => Promise.race([
                user.fetch(true),
                new Promise((_, reject) => setTimeout(() => reject(new Error('fetch timeout')), ms)),
            ]);

            mainGuild.members.fetch().then(async (members) => {
                const nonBots = members.filter(m => !m.user.bot).toJSON();
                logger.info(`[Supporter] Starting scan of ${nonBots.length} members...`);
                let added = 0, removed = 0, errors = 0, scanned = 0;

                for (const member of nonBots) {
                    try {
                        await fetchWithTimeout(member.user);
                        const pg = member.user.primaryGuild;
                        const hasTag = pg?.identityGuildId === process.env.GUILD_ID && pg?.identityEnabled !== false;
                        const hasRole = member.roles.cache.has(SUPPORTER_ROLE_ID);

                        if (hasTag && !hasRole) {
                            await member.roles.add(SUPPORTER_ROLE_ID, 'Clan tag detected — startup scan');
                            added++;
                            logger.info(`[Supporter] + ${member.user.tag}`);
                        } else if (!hasTag && hasRole) {
                            await member.roles.remove(SUPPORTER_ROLE_ID, 'Clan tag removed — startup scan');
                            removed++;
                            logger.info(`[Supporter] - ${member.user.tag}`);
                        }
                    } catch (err) {
                        errors++;
                    }
                    scanned++;
                    // Progress log every 100 members
                    if (scanned % 100 === 0) {
                        logger.info(`[Supporter] Progress: ${scanned}/${nonBots.length} scanned...`);
                    }
                    await new Promise(r => setTimeout(r, 500));
                }
                logger.info(`[Supporter] Scan done — ${added} added, ${removed} removed, ${errors} errors`);
            }).catch(err => {
                logger.error(`[Supporter] Startup scan failed: ${err.message}`);
            });
        } else {
            logger.error(`[Supporter] Could not find guild with ID ${process.env.GUILD_ID} — scan skipped`);
        }

        // ─── Giveaway polling — ends due giveaways every 15 seconds ───
        setInterval(async () => {
            try {
                const now = new Date().toISOString();
                const due = getDueGiveaways.all(now);
                for (const gw of due) {
                    await endGiveaway(client, gw.id).catch(err => {
                        logger.error(`Failed to end giveaway #${gw.id}: ${err.message}`);
                    });
                }
            } catch (err) {
                logger.error(`Giveaway poller error: ${err.message}`);
            }
        }, 15_000);

        // ─── Bump Reminder polling — checks every 30s if it's time to send bump reminder ───
        const BUMP_CHANNEL_ID = '1471604405055782965';
        const BUMP_PING_USER = '1202269716731662376';
        const BUMP_PING_ROLE = '1500116182890450984';

        setInterval(async () => {
            try {
                const row = db.prepare('SELECT remind_at FROM bump_reminder WHERE id = 1').get();
                if (!row || row.remind_at === 0) return;
                if (Date.now() < row.remind_at) return;

                // Time's up — send the reminder and reset
                db.prepare('UPDATE bump_reminder SET remind_at = 0 WHERE id = 1').run();

                const channel = await client.channels.fetch(BUMP_CHANNEL_ID).catch(() => null);
                if (!channel) return;

                const reminderEmbed = createEmbed({
                    title: `${theme.emojis.skull} Time to Bump!`,
                    description: [
                        `${theme.emojis.fire} The server is ready to be bumped again!`,
                        ``,
                        `${theme.emojis.dagger} Use </bump:947088344167366698> to bump us.`,
                        `${theme.emojis.rose} Help us rise from the shadows.`,
                    ].join('\n'),
                    color: theme.colors.accent,
                    image: 'https://www.image2url.com/r2/default/gifs/1777727189537-df57d103-75c8-4845-b900-8037611248b0.gif',
                });

                await channel.send({
                    content: `<@${BUMP_PING_USER}> <@&${BUMP_PING_ROLE}> ${theme.emojis.skull} **It's bump time!**`,
                    embeds: [reminderEmbed],
                    allowedMentions: { users: [BUMP_PING_USER], roles: [BUMP_PING_ROLE] },
                });
                logger.info('[Bump] Reminder sent!');
            } catch (err) {
                logger.error(`[Bump] Reminder poll error: ${err.message}`);
            }
        }, 30_000);
    },
};

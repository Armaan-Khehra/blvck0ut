require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');
const db = require('./src/data/database');
const leveling = require('./src/utils/leveling');

const GUILD_ID = process.env.GUILD_ID;

// Arcane leaderboard data from screenshot
const MIGRATIONS = [
    { username: 'wadermellon', level: 19 },
    { username: 'edolllover', level: 12 },
    { username: 'kkkiyomie', level: 11 },
    { username: 'chunkyplunky2', level: 8 },
    { username: 'itsaimeemarioo', level: 8 },
    { username: 'ethere4lemily', level: 8 },
    { username: '.peredozirovkaaa', level: 6 },
    { username: 'uyeoao', level: 5 },
    { username: 'fabulous_evelyn', level: 5 },
    { username: '9walnut.', level: 4 },
];

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        // Fetch ALL members to search by username
        console.log('Fetching all guild members...');
        await guild.members.fetch();
        console.log(`Fetched ${guild.members.cache.size} members\n`);

        let migrated = 0;
        let failed = 0;

        for (const m of MIGRATIONS) {
            // Search by username (case-insensitive)
            const member = guild.members.cache.find(mem =>
                mem.user.username.toLowerCase() === m.username.toLowerCase(),
            );

            if (!member) {
                console.log(`  SKIP: "${m.username}" not found in server`);
                failed++;
                continue;
            }

            const userId = member.user.id;
            const result = leveling.setLevel(GUILD_ID, userId, m.level);
            console.log(`  SET: ${member.user.username} (${userId}) → Level ${m.level} (${result.total_xp.toLocaleString()} XP)`);

            // Also assign any reward roles they should have
            const rolesToAdd = leveling.getRolesForLevel(GUILD_ID, m.level);
            for (const reward of rolesToAdd) {
                if (!member.roles.cache.has(reward.role_id)) {
                    try {
                        await member.roles.add(reward.role_id);
                        const role = guild.roles.cache.get(reward.role_id);
                        console.log(`    +ROLE: ${role?.name || reward.role_id} (level ${reward.level})`);
                    } catch (err) {
                        console.log(`    !ROLE ERROR: ${reward.role_id} — ${err.message}`);
                    }
                }
            }

            migrated++;
        }

        console.log(`\nMigration complete: ${migrated} migrated, ${failed} skipped`);

        // Show final leaderboard
        const lb = leveling.getLeaderboard.all(GUILD_ID);
        console.log('\nNew leaderboard:');
        for (let i = 0; i < lb.length; i++) {
            const mem = guild.members.cache.get(lb[i].user_id);
            console.log(`  #${i + 1} ${mem?.user.username || lb[i].user_id} — Level ${lb[i].level} (${lb[i].total_xp.toLocaleString()} XP)`);
        }
    } catch (err) {
        console.error('Migration error:', err);
    }

    client.destroy();
    process.exit(0);
});

client.login(config.token);

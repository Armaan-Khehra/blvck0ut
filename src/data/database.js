const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

const db = new Database(path.join(__dirname, '../../data/blvck0ut.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        moderator_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS guild_config (
        guild_id TEXT PRIMARY KEY,
        welcome_channel_id TEXT,
        goodbye_channel_id TEXT,
        autorole_id TEXT
    );

    CREATE TABLE IF NOT EXISTS word_filter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        word TEXT NOT NULL,
        added_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guild_id, word)
    );

    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        remind_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS color_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        label TEXT NOT NULL,
        button_style TEXT DEFAULT 'Secondary',
        UNIQUE(guild_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS color_panels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS afk_users (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        reason TEXT DEFAULT 'AFK',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS uwu_locked (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        locked_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(guild_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings(guild_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(remind_at);
    CREATE INDEX IF NOT EXISTS idx_color_roles_guild ON color_roles(guild_id);

    -- ─── Economy System ───
    CREATE TABLE IF NOT EXISTS economy_users (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        balance INTEGER DEFAULT 500,
        bank INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        total_spent INTEGER DEFAULT 0,
        last_daily TEXT,
        last_work TEXT,
        last_crime TEXT,
        last_rob TEXT,
        last_chat_earn TEXT,
        PRIMARY KEY(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS economy_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS economy_shop (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        type TEXT DEFAULT 'role',
        role_id TEXT,
        stock INTEGER DEFAULT -1,
        is_active INTEGER DEFAULT 1,
        UNIQUE(guild_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS economy_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_economy_users_guild ON economy_users(guild_id);
    CREATE INDEX IF NOT EXISTS idx_economy_inventory_user ON economy_inventory(guild_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_economy_shop_guild ON economy_shop(guild_id);
    CREATE INDEX IF NOT EXISTS idx_economy_transactions_user ON economy_transactions(guild_id, user_id);

    -- ─── Leveling System ───
    CREATE TABLE IF NOT EXISTS leveling_users (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        total_xp INTEGER DEFAULT 0,
        messages INTEGER DEFAULT 0,
        last_xp_earn TEXT,
        PRIMARY KEY(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS leveling_roles (
        guild_id TEXT NOT NULL,
        level INTEGER NOT NULL,
        role_id TEXT NOT NULL,
        PRIMARY KEY(guild_id, level)
    );

    CREATE INDEX IF NOT EXISTS idx_leveling_users_guild ON leveling_users(guild_id);
    CREATE INDEX IF NOT EXISTS idx_leveling_roles_guild ON leveling_roles(guild_id);

    -- ─── Monster Hunting System ───
    CREATE TABLE IF NOT EXISTS hunt_collection (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        monster_id TEXT NOT NULL,
        nickname TEXT,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        hp INTEGER DEFAULT 0,
        attack INTEGER DEFAULT 0,
        defense INTEGER DEFAULT 0,
        caught_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS hunt_profile (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        total_caught INTEGER DEFAULT 0,
        total_sold INTEGER DEFAULT 0,
        total_sacrificed INTEGER DEFAULT 0,
        essence INTEGER DEFAULT 0,
        last_hunt TEXT,
        PRIMARY KEY(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS hunt_teams (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        slot INTEGER NOT NULL,
        monster_collection_id INTEGER,
        PRIMARY KEY(guild_id, user_id, slot),
        FOREIGN KEY(monster_collection_id) REFERENCES hunt_collection(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_hunt_collection_user ON hunt_collection(guild_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_hunt_collection_monster ON hunt_collection(guild_id, user_id, monster_id);
    CREATE INDEX IF NOT EXISTS idx_hunt_profile_guild ON hunt_profile(guild_id);

    -- ─── Hunt Items (weapons, rings, gems from hunting) ───
    CREATE TABLE IF NOT EXISTS hunt_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        found_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_hunt_items_user ON hunt_items(guild_id, user_id);

    -- ─── Giveaways ───
    CREATE TABLE IF NOT EXISTS giveaways (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT,
        host_id TEXT NOT NULL,
        prize TEXT NOT NULL,
        winner_count INTEGER DEFAULT 1,
        is_fake INTEGER DEFAULT 0,
        ends_at DATETIME NOT NULL,
        ended INTEGER DEFAULT 0,
        cancelled INTEGER DEFAULT 0,
        winners TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS giveaway_entries (
        giveaway_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(giveaway_id, user_id),
        FOREIGN KEY(giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_giveaways_guild ON giveaways(guild_id);
    CREATE INDEX IF NOT EXISTS idx_giveaways_active ON giveaways(ended, cancelled, ends_at);
    CREATE INDEX IF NOT EXISTS idx_giveaway_entries_gw ON giveaway_entries(giveaway_id);
`);

// ─── Safe column migrations (for hunt overhaul) ───
function safeAddColumn(table, column, type) {
    try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch (e) {
        // Column already exists — ignore
    }
}

// ─── Economy: Roleplay cooldown column ───
safeAddColumn('economy_users', 'last_rp', 'TEXT');

safeAddColumn('hunt_profile', 'blood_shards', 'INTEGER DEFAULT 0');
safeAddColumn('hunt_profile', 'bone_fragments', 'INTEGER DEFAULT 0');
safeAddColumn('hunt_profile', 'hunt_xp', 'INTEGER DEFAULT 0');
safeAddColumn('hunt_profile', 'hunt_level', 'INTEGER DEFAULT 0');
safeAddColumn('hunt_profile', 'lootboxes', 'INTEGER DEFAULT 0');
safeAddColumn('hunt_profile', 'lootboxes_today', 'INTEGER DEFAULT 0');
safeAddColumn('hunt_profile', 'lootbox_reset', 'TEXT');

// ─── Team & Battle system columns ───
safeAddColumn('hunt_teams', 'equipped_item_id', 'INTEGER');
safeAddColumn('hunt_profile', 'battles_won', 'INTEGER DEFAULT 0');
safeAddColumn('hunt_profile', 'battles_lost', 'INTEGER DEFAULT 0');
safeAddColumn('hunt_profile', 'battle_streak', 'INTEGER DEFAULT 0');
safeAddColumn('hunt_profile', 'last_battle', 'TEXT');

// ─── Giveaway rig column (JSON array of user IDs) ───
safeAddColumn('giveaways', 'forced_winners', 'TEXT');

// ─── Booster custom colors ───
db.exec(`
    CREATE TABLE IF NOT EXISTS boost_colors (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        hex TEXT NOT NULL,
        PRIMARY KEY(guild_id, user_id)
    );
`);

// ─── Giveaway requirement column (none, rep, invites) ───
safeAddColumn('giveaways', 'requirement', "TEXT DEFAULT 'none'");

// ─── Bump Reminder ───
db.exec(`
    CREATE TABLE IF NOT EXISTS bump_reminder (
        id INTEGER PRIMARY KEY DEFAULT 1,
        remind_at INTEGER NOT NULL DEFAULT 0
    );
`);
// Ensure row exists
db.exec(`INSERT OR IGNORE INTO bump_reminder (id, remind_at) VALUES (1, 0)`);

logger.info('Database initialized');

module.exports = db;

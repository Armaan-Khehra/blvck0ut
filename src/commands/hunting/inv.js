const { SlashCommandBuilder } = require('discord.js');
const { getRarityEmoji } = require('../../utils/monsterEmojis');
const {
    ensureHuntProfile,
    getTotalCount,
    getUniqueCount,
    getXpForLevel,
    getUserItems,
    getTotalItemCount,
    HUNT_ITEMS,
    ITEM_RARITY_ORDER,
    ITEM_RARITY_CONFIG,
    BLOOD_SHARD_MAX,
    BONE_FRAGMENT_MAX,
    LOOTBOX_DAILY_LIMIT,
} = require('../../utils/hunting');
const { getAllMonsterIds } = require('../../data/monsters');
const { ensureUser, formatSouls } = require('../../utils/economy');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inv')
        .setDescription('🎒 View your hunting inventory and stats')
        .addUserOption(opt => opt.setName('user').setDescription('View someone else\'s inventory')),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;
        const userId = target.id;

        const profile = ensureHuntProfile(guildId, userId);
        const ecoUser = ensureUser(guildId, userId);
        const total = getTotalCount(guildId, userId);
        const unique = getUniqueCount(guildId, userId);
        const totalMonsters = getAllMonsterIds().length;

        const level = profile.hunt_level || 0;
        const xp = profile.hunt_xp || 0;
        const xpNeeded = getXpForLevel(level);

        const bloodShards = profile.blood_shards || 0;
        const boneFragments = profile.bone_fragments || 0;
        const lootboxes = profile.lootboxes || 0;
        const lootboxesToday = profile.lootboxes_today || 0;
        const caught = profile.total_caught || 0;
        const sold = profile.total_sold || 0;

        // Build compact XP bar
        const xpBar = buildXpBar(xp, xpNeeded, 15);

        // ─── Build OwO-style compact output ───
        const lines = [
            `🎒 | **${target.username}**'s Inventory`,
            ``,
            `⚔️ \`Lv.${level}\` ${xpBar} \`${xp}/${xpNeeded} xp\``,
            `🩸 \`${bloodShards}/${BLOOD_SHARD_MAX}\` 💀 \`${boneFragments}/${BONE_FRAGMENT_MAX}\` 📦 \`${lootboxes}\` \`[${lootboxesToday}/${LOOTBOX_DAILY_LIMIT} today]\``,
            ``,
            `🏷️ caught: \`${caught}\` | sold: \`${sold}\` | owned: \`${total}\` | species: \`${unique}/${totalMonsters}\``,
            `💰 ${formatSouls(ecoUser.balance)}`,
        ];

        // Items section (compact)
        const items = getUserItems(guildId, userId);
        const totalItems = getTotalItemCount(guildId, userId);

        if (items.length > 0) {
            lines.push(``, `🗡️ **Items** \`${totalItems}\``);

            const byRarity = {};
            for (const rarity of ITEM_RARITY_ORDER) byRarity[rarity] = [];
            for (const row of items) {
                const item = HUNT_ITEMS[row.item_id];
                if (!item) continue;
                byRarity[item.rarity].push({ item, count: row.count });
            }

            for (const rarity of [...ITEM_RARITY_ORDER].reverse()) {
                const rarityItems = byRarity[rarity];
                if (rarityItems.length === 0) continue;
                const dot = getRarityEmoji(rarity, ITEM_RARITY_CONFIG[rarity]?.label || '');
                const parts = rarityItems.map(({ item, count }) => `${item.emoji}\`${item.name} x${count}\``);
                lines.push(`${dot} ${parts.join(' ')}`);
            }
        }

        return interaction.reply({ content: lines.join('\n') });
    },
};

function buildXpBar(current, needed, length = 15) {
    const ratio = Math.min(current / needed, 1);
    const filled = Math.round(ratio * length);
    const empty = length - filled;
    return `\`[${'▰'.repeat(filled)}${'▱'.repeat(empty)}]\``;
}

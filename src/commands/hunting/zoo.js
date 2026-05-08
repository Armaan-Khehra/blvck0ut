const { SlashCommandBuilder } = require('discord.js');
const { getMonsterEmoji } = require('../../utils/monsterEmojis');
const {
    MONSTERS,
    RARITY_ORDER,
    RARITY_CONFIG,
    ensureHuntProfile,
    getCollection,
    getTotalCount,
    getUniqueCount,
} = require('../../utils/hunting');
const { getAllMonsterIds, getMonstersByRarity } = require('../../data/monsters');
const { getCurrencyEmoji } = require('../../utils/economy');

// ─── Zoo Points multiplier per rarity ───
const ZOO_POINTS = {
    common: 1,
    uncommon: 5,
    rare: 25,
    epic: 100,
    legendary: 500,
};

// ─── Compact rarity prefix — single line with monsters ───
const RARITY_PREFIX = {
    legendary: '\u2727\u30FB\uFF9F',
    epic:      '\u25B8',
    rare:      '\u25B8',
    uncommon:  '\u25B8',
    common:    '\u25B8',
};

// ─── Styled rarity letters ───
const RARITY_TAG = {
    legendary: '**L**',
    epic:      '**E**',
    rare:      '**R**',
    uncommon:  '**U**',
    common:    '**C**',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('zoo')
        .setDescription('\u{1F987} View your monster collection')
        .addUserOption(opt => opt.setName('user').setDescription('View someone else\'s zoo')),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;
        const userId = target.id;

        ensureHuntProfile(guildId, userId);

        const collection = getCollection(guildId, userId);
        const total = getTotalCount(guildId, userId);
        const unique = getUniqueCount(guildId, userId);
        const totalMonsters = getAllMonsterIds().length;

        // Build count map: monster_id → count
        const countMap = new Map();
        for (const row of collection) {
            countMap.set(row.monster_id, row.count);
        }

        // ─── Header ───
        const lines = [
            `\u2620 **${target.username}**'s zoo`,
            ``,
        ];

        // ─── Grid rows (legendary → common) — only show owned monsters ───
        let zooPoints = 0;
        const rarityCounts = {};

        for (const rarity of [...RARITY_ORDER].reverse()) {
            const monsters = getMonstersByRarity(rarity);
            let tierCount = 0;

            // Calculate totals for all monsters (including unowned) for points
            for (const monster of monsters) {
                const count = countMap.get(monster.id) || 0;
                tierCount += count;
                zooPoints += count * ZOO_POINTS[rarity];
            }

            rarityCounts[rarity] = tierCount;

            // Only show monsters the user actually owns
            const owned = monsters.filter(m => (countMap.get(m.id) || 0) > 0);
            if (owned.length === 0) continue; // skip entire tier if nothing owned

            const parts = owned.map(monster => {
                const count = countMap.get(monster.id) || 0;
                const emoji = getMonsterEmoji(monster.id, monster.fallbackEmoji);
                const pad = String(count).padStart(2, '0');
                return `${emoji}\`${pad}\``;
            });

            // Single compact line: prefix + letter + monsters
            if (rarity === 'legendary') {
                lines.push(`${RARITY_PREFIX[rarity]} ${RARITY_TAG[rarity]}  ${parts.join(' ')}  \uFF9F\u30FB\u2727`);
            } else {
                lines.push(`${RARITY_PREFIX[rarity]} ${RARITY_TAG[rarity]}  ${parts.join(' ')}`);
            }
        }

        // ─── Footer ───
        lines.push(``);
        lines.push(`${getCurrencyEmoji()} Zoo Points: **${zooPoints.toLocaleString()}**`);

        const summaryParts = [...RARITY_ORDER].reverse().map(r =>
            `**${RARITY_TAG[r]}**\`${rarityCounts[r]}\``
        );
        lines.push(summaryParts.join(' '));
        lines.push(`**${total}** total \u00b7 **${unique}/${totalMonsters}** unique`);

        return interaction.reply({ content: lines.join('\n') });
    },
};

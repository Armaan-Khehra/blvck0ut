const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
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
const { getAllMonsterIds } = require('../../data/monsters');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crypt')
        .setDescription(`${theme.emojis.coffin} View your captured monsters`)
        .addUserOption(opt => opt.setName('user').setDescription('View someone else\'s crypt')),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;
        const userId = target.id;

        const profile = ensureHuntProfile(guildId, userId);

        const collection = getCollection(guildId, userId);
        const total = getTotalCount(guildId, userId);
        const unique = getUniqueCount(guildId, userId);
        const totalMonsters = getAllMonsterIds().length;

        // If empty
        if (collection.length === 0) {
            const embed = createEmbed({
                description: `${theme.emojis.coffin} **${target.username}'s Crypt**\n\n*The crypt is empty... the darkness awaits.*\n*Use \`-hunt\` to begin capturing creatures.*`,
                color: theme.colors.void,
            });
            return interaction.reply({ embeds: [embed] });
        }

        // Group by rarity
        const byRarity = {};
        for (const rarity of RARITY_ORDER) {
            byRarity[rarity] = [];
        }
        for (const row of collection) {
            const monster = MONSTERS[row.monster_id];
            if (!monster) continue;
            byRarity[monster.rarity].push({ monster, count: row.count });
        }

        // Build display (legendary first → common last)
        const sections = [];
        for (const rarity of [...RARITY_ORDER].reverse()) {
            const monsters = byRarity[rarity];
            if (monsters.length === 0) continue;

            const cfg = RARITY_CONFIG[rarity];
            const lines = monsters.map(({ monster, count }) => {
                const emoji = getMonsterEmoji(monster.id, monster.fallbackEmoji);
                return `${emoji} ${monster.name} ×${count}`;
            });

            sections.push(`${cfg.emoji} ── **${cfg.label.toUpperCase()}** ──\n${lines.join('  |  ')}`);
        }

        const embed = createEmbed({
            title: `${theme.emojis.coffin} ${target.username}'s Crypt`,
            description: [
                `**${total}** creatures captured | **${unique}** unique species`,
                `⚔️ Hunt Lvl **${profile.hunt_level || 0}** | 🩸 ${profile.blood_shards || 0} | 💀 ${profile.bone_fragments || 0} | 📦 ${profile.lootboxes || 0}`,
                '',
                ...sections,
                theme.divider,
                `${unique}/${totalMonsters} species discovered`,
            ].join('\n'),
            color: theme.colors.primary,
        });

        return interaction.reply({ embeds: [embed] });
    },
};

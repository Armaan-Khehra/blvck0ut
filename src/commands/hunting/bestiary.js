const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { getMonsterEmoji } = require('../../utils/monsterEmojis');
const {
    MONSTERS,
    RARITY_ORDER,
    RARITY_CONFIG,
    getDiscoveredMonsters,
    ensureHuntProfile,
} = require('../../utils/hunting');
const { getMonstersByRarity, getAllMonsterIds } = require('../../data/monsters');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bestiary')
        .setDescription(`${theme.emojis.skull} View all discoverable monsters`),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        ensureHuntProfile(guildId, userId);

        const discovered = new Set(getDiscoveredMonsters(guildId, userId));
        const totalMonsters = getAllMonsterIds().length;
        const discoveredCount = discovered.size;

        const sections = [];

        for (const rarity of [...RARITY_ORDER].reverse()) {
            const cfg = RARITY_CONFIG[rarity];
            const monsters = getMonstersByRarity(rarity);

            const lines = monsters.map(m => {
                const found = discovered.has(m.id);
                const emoji = found ? getMonsterEmoji(m.id, m.fallbackEmoji) : '❓';
                const name = found ? m.name : '???';
                const mark = found ? '✅' : '❌';
                return `${emoji} ${name} ${mark}`;
            });

            sections.push(`${cfg.emoji} ── **${cfg.label.toUpperCase()}** ──\n${lines.join('\n')}`);
        }

        const percentage = Math.floor((discoveredCount / totalMonsters) * 100);

        const embed = createEmbed({
            title: `${theme.emojis.skull} Bestiary`,
            description: [
                `**${discoveredCount}/${totalMonsters}** species discovered (${percentage}%)`,
                '',
                ...sections,
            ].join('\n'),
            color: theme.colors.accent,
        });

        return interaction.reply({ embeds: [embed] });
    },
};

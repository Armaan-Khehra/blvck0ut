const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { addSouls, formatSouls } = require('../../utils/economy');
const { getMonsterEmoji } = require('../../utils/monsterEmojis');
const {
    ensureHuntProfile,
    openLootbox,
} = require('../../utils/hunting');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lootbox')
        .setDescription('📦 Open a lootbox from hunting')
        .addStringOption(opt =>
            opt.setName('count')
                .setDescription('Number of lootboxes to open (or "all")')
                .setRequired(false)),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const username = interaction.user.username;

        const profile = ensureHuntProfile(guildId, userId);
        const available = profile.lootboxes || 0;

        if (available <= 0) {
            return interaction.reply({
                embeds: [errorEmbed('You have no lootboxes. Keep hunting with `-hunt` to find some!')],
            });
        }

        // Parse count: supports a number or "all"
        const countArg = interaction.options.getString('count');
        let count = 1;
        if (countArg) {
            if (countArg.toLowerCase() === 'all') {
                count = available;
            } else {
                const parsed = parseInt(countArg, 10);
                if (isNaN(parsed) || parsed < 1) {
                    return interaction.reply({
                        embeds: [errorEmbed('Invalid count. Use a number or `all`.')],
                    });
                }
                count = Math.min(parsed, available);
            }
        }

        // Open multiple lootboxes and aggregate results
        const allMonsters = [];
        let totalBlood = 0;
        let totalBone = 0;
        let totalSouls = 0;

        for (let i = 0; i < count; i++) {
            const contents = openLootbox(guildId, userId);
            if (!contents) break;

            allMonsters.push(...contents.monsters);
            totalBlood += contents.bloodShards;
            totalBone += contents.boneFragments;
            totalSouls += contents.souls;
        }

        if (allMonsters.length === 0) {
            return interaction.reply({
                embeds: [errorEmbed('Failed to open lootbox... the void consumed it.')],
            });
        }

        // Add total souls to economy
        addSouls(guildId, userId, totalSouls, 'lootbox', `Opened ${count} lootbox${count !== 1 ? 'es' : ''}`);

        // Build display
        const monsterLine = allMonsters
            .map(m => getMonsterEmoji(m.monster.id, m.monster.fallbackEmoji))
            .join('');

        const remaining = available - count;
        const boxWord = count !== 1 ? 'lootboxes' : 'lootbox';

        const lines = [
            `📦 | **${username}** opened **${count} ${boxWord}!**`,
            `| Monsters: ${monsterLine}`,
            `| 🩸 **+${totalBlood}** Blood Shards  |  💀 **+${totalBone}** Bone Fragments`,
            `| ${formatSouls(totalSouls)}`,
            `| You have **${remaining}** lootbox${remaining !== 1 ? 'es' : ''} remaining.`,
        ];

        return interaction.reply({ content: lines.join('\n') });
    },
};

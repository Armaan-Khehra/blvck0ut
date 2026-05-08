const { SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { formatCooldown } = require('../../utils/economy');
const { getMonsterEmoji, getRarityEmoji } = require('../../utils/monsterEmojis');
const {
    ensureHuntProfile,
    checkHuntCooldown,
    setHuntCooldown,
    rollMultiEncounter,
    bulkAddToCollection,
    calculateHuntXp,
    addHuntXp,
    rollResourceDrops,
    addResources,
    checkLootboxDrop,
    rollItemDrop,
    addItemToInventory,
    ITEM_RARITY_CONFIG,
    formatTimeRemaining,
    BLOOD_SHARD_MAX,
    BONE_FRAGMENT_MAX,
} = require('../../utils/hunting');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hunt')
        .setDescription(`${theme.emojis.dagger} Venture into the darkness to hunt creatures`),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const username = interaction.user.username;

        // Ensure profile exists
        const profile = ensureHuntProfile(guildId, userId);

        // Check cooldown
        const remaining = checkHuntCooldown(guildId, userId);
        if (remaining > 0) {
            return interaction.reply({
                embeds: [errorEmbed(`The shadows haven't settled yet. Wait **${formatCooldown(remaining)}**.`)],
            });
        }

        // Set cooldown immediately
        setHuntCooldown(guildId, userId);

        // Roll multi-catch
        const catches = rollMultiEncounter(profile);

        // Only add caught monsters to collection
        const caughtOnly = catches.filter(c => c.caught);
        if (caughtOnly.length > 0) {
            bulkAddToCollection(guildId, userId, caughtOnly);
        }

        // Calculate XP (only for caught monsters)
        const xpGained = calculateHuntXp(caughtOnly);
        const xpResult = addHuntXp(guildId, userId, xpGained);

        // Roll resource drops
        const resourceDrops = rollResourceDrops();
        let resources = { bloodShards: profile.blood_shards || 0, boneFragments: profile.bone_fragments || 0 };
        if (resourceDrops.bloodShards > 0 || resourceDrops.boneFragments > 0) {
            resources = addResources(guildId, userId, resourceDrops.bloodShards, resourceDrops.boneFragments);
        }

        // Check lootbox
        const lootbox = checkLootboxDrop(guildId, userId);

        // Roll item drop
        const itemDrop = rollItemDrop();
        if (itemDrop) {
            addItemToInventory(guildId, userId, itemDrop.id);
        }

        // ─── Build Output Lines (plain text, OwO style) ───
        const lines = [];

        // Line 1: Empowerment header
        lines.push(
            `🗡️ | **${username}**, hunt is empowered by 🩸 [${resources.bloodShards}/${BLOOD_SHARD_MAX}] 💀 [${resources.boneFragments}/${BONE_FRAGMENT_MAX}] !`,
        );

        // Line 2: Emoji row — caught monsters show normally, escaped ones are crossed out
        const emojiRow = catches.map(c => {
            const emoji = getMonsterEmoji(c.monster.id, c.monster.fallbackEmoji);
            return c.caught ? emoji : `~~${emoji}~~`;
        }).join('');
        lines.push(`| You found: ${emojiRow}`);

        // Line 2.5 (optional): If any escaped, show count
        const escaped = catches.filter(c => !c.caught);
        if (escaped.length > 0) {
            lines.push(`| ${escaped.length} escaped...`);
        }

        // Line 3: XP gained (show up to 3 unique CAUGHT monster emojis)
        const seen = new Set();
        const uniqueEmojis = [];
        for (const c of caughtOnly) {
            if (!seen.has(c.monster.id) && uniqueEmojis.length < 3) {
                seen.add(c.monster.id);
                uniqueEmojis.push(getMonsterEmoji(c.monster.id, c.monster.fallbackEmoji));
            }
        }

        let xpLine = `| ${uniqueEmojis.join('')} gained **${xpGained}xp!**`;
        if (xpResult.leveledUp) {
            xpLine += ` 🆙 **LEVEL UP!** You are now Hunt Level **${xpResult.newLevel}**!`;
        }
        lines.push(xpLine);

        // Line 4 (optional): Resource drops
        if (resourceDrops.bloodShards > 0 || resourceDrops.boneFragments > 0) {
            const parts = [];
            if (resourceDrops.bloodShards > 0) parts.push(`🩸 **${resourceDrops.bloodShards}** Blood Shards`);
            if (resourceDrops.boneFragments > 0) parts.push(`💀 **${resourceDrops.boneFragments}** Bone Fragments`);
            lines.push(`| You also found: ${parts.join(' and ')}`);
        }

        // Line 5 (optional): Lootbox drop
        if (lootbox) {
            const timeStr = formatTimeRemaining(lootbox.resetRemaining);
            lines.push(`📦 | You found a **lootbox!** \`[${lootbox.count}/${lootbox.limit}]\` RESETS IN: \`${timeStr}\``);
        }

        // Line 6 (optional): Item drop
        if (itemDrop) {
            const rarityDot = getRarityEmoji(itemDrop.rarity, ITEM_RARITY_CONFIG[itemDrop.rarity]?.label || '');
            lines.push(`${itemDrop.emoji} | You found a ${rarityDot} **${itemDrop.name}**! *${itemDrop.description}*`);
        }

        // Send as plain text content (NOT an embed)
        return interaction.reply({ content: lines.join('\n') });
    },
};

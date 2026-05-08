const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { addSouls, formatSouls } = require('../../utils/economy');
const { getMonsterEmoji } = require('../../utils/monsterEmojis');
const {
    MONSTERS,
    RARITY_ORDER,
    RARITY_CONFIG,
    ensureHuntProfile,
    getCollection,
    getMonsterCount,
    rollSellValue,
    sellMonster,
    bulkSellByRarity,
    findMonsterByName,
} = require('../../utils/hunting');

// ─── Rarity aliases (shortcut → full rarity name) ───
const RARITY_ALIASES = {
    c: 'common', common: 'common',
    u: 'uncommon', uncommon: 'uncommon', uc: 'uncommon',
    r: 'rare', rare: 'rare',
    e: 'epic', epic: 'epic',
    l: 'legendary', legendary: 'legendary', leg: 'legendary',
    all: 'all',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sell')
        .setDescription(`${theme.emojis.dagger} Sell monsters for souls`)
        .addStringOption(opt => opt.setName('monster').setDescription('Monster name, rarity (C/U/R/E/L), or "all"'))
        .addIntegerOption(opt => opt.setName('amount').setDescription('How many to sell (0 = sell all of that monster)').setMinValue(0)),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        ensureHuntProfile(guildId, userId);

        const input = interaction.options.getString('monster');
        const amount = interaction.options.getInteger('amount');

        // No argument → show select menu
        if (!input) {
            return showSellMenu(interaction, guildId, userId);
        }

        const normalized = input.trim().toLowerCase();

        // ─── Check for rarity shortcut or "all" ───
        if (RARITY_ALIASES[normalized]) {
            const alias = RARITY_ALIASES[normalized];

            let targetRarities;
            if (alias === 'all') {
                targetRarities = [...RARITY_ORDER]; // all rarities
            } else {
                targetRarities = [alias];
            }

            return executeRaritySell(interaction, guildId, userId, targetRarities);
        }

        // ─── Otherwise, treat as monster name ───
        const monster = findMonsterByName(normalized);
        if (!monster) {
            return interaction.reply({
                embeds: [errorEmbed(`Unknown creature or rarity: **${input}**\n\nUse a name, rarity shortcut (\`C\` \`U\` \`R\` \`E\` \`L\`), or \`all\`.`)],
            });
        }

        // Bulk sell by amount: amount 0 = sell all, amount > 1 = sell that many
        if (amount !== null && amount !== 1) {
            return executeBulkSell(interaction, guildId, userId, monster, amount);
        }

        return executeSell(interaction, guildId, userId, monster);
    },

    // Handle select menu choice
    async handleSelect(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const monsterId = interaction.values[0];

        const monster = MONSTERS[monsterId];
        if (!monster) {
            return interaction.reply({
                embeds: [errorEmbed('That creature no longer exists in the records.')],
                ephemeral: true,
            });
        }

        return executeSell(interaction, guildId, userId, monster);
    },
};

// ─── Sell one monster ───
async function executeSell(interaction, guildId, userId, monster) {
    const count = getMonsterCount(guildId, userId, monster.id);
    if (count === 0) {
        return interaction.reply({
            embeds: [errorEmbed(`You don't have any **${monster.name}** to sell.`)],
        });
    }

    const sellValue = rollSellValue(monster.id);
    const sold = sellMonster(guildId, userId, monster.id);
    if (!sold) {
        return interaction.reply({
            embeds: [errorEmbed('Failed to sell... the creature escaped the deal.')],
        });
    }

    const newBalance = addSouls(guildId, userId, sellValue, 'sell', `Sold ${monster.name}`);
    const remaining = count - 1;
    const emoji = getMonsterEmoji(monster.id, monster.fallbackEmoji);
    const rarityInfo = RARITY_CONFIG[monster.rarity];

    const embed = createEmbed({
        title: `${theme.emojis.dagger} Monster Sold`,
        description: [
            `You sold a **${monster.name}** for ${formatSouls(sellValue)}`,
            '',
            `${emoji} ${monster.name} (${rarityInfo.emoji} ${rarityInfo.label}) — **${remaining}** remaining`,
            `Wallet: ${formatSouls(newBalance)}`,
        ].join('\n'),
        color: rarityInfo.color,
    });

    return interaction.reply({ embeds: [embed] });
}

// ─── Sell N of a specific monster ───
async function executeBulkSell(interaction, guildId, userId, monster, amount) {
    const count = getMonsterCount(guildId, userId, monster.id);
    if (count === 0) {
        return interaction.reply({
            embeds: [errorEmbed(`You don't have any **${monster.name}** to sell.`)],
        });
    }

    const toSell = amount === 0 ? count : Math.min(amount, count);
    let totalValue = 0;

    for (let i = 0; i < toSell; i++) {
        const sellValue = rollSellValue(monster.id);
        const sold = sellMonster(guildId, userId, monster.id);
        if (!sold) break;
        totalValue += sellValue;
    }

    const newBalance = addSouls(guildId, userId, totalValue, 'sell', `Bulk sold ${toSell}x ${monster.name}`);
    const remaining = count - toSell;
    const emoji = getMonsterEmoji(monster.id, monster.fallbackEmoji);
    const rarityInfo = RARITY_CONFIG[monster.rarity];

    const embed = createEmbed({
        title: `${theme.emojis.dagger} Bulk Sale`,
        description: [
            `You sold **${toSell}x ${monster.name}** for ${formatSouls(totalValue)}`,
            '',
            `${emoji} ${monster.name} (${rarityInfo.emoji} ${rarityInfo.label}) — **${remaining}** remaining`,
            `Wallet: ${formatSouls(newBalance)}`,
        ].join('\n'),
        color: rarityInfo.color,
    });

    return interaction.reply({ embeds: [embed] });
}

// ─── Sell all monsters of specific rarities ───
async function executeRaritySell(interaction, guildId, userId, targetRarities) {
    const result = bulkSellByRarity(guildId, userId, targetRarities);

    if (result.totalSold === 0) {
        const label = targetRarities.length === RARITY_ORDER.length
            ? 'any monsters'
            : `any **${targetRarities.map(r => RARITY_CONFIG[r]?.label || r).join(', ')}** monsters`;
        return interaction.reply({
            embeds: [errorEmbed(`You don't have ${label} to sell.${result.skippedTeam ? '\n*(Team monsters are protected)*' : ''}`)],
        });
    }

    // Credit souls
    const newBalance = addSouls(guildId, userId, result.totalValue, 'sell',
        `Rarity sell: ${targetRarities.join(',')} (${result.totalSold} monsters)`);

    // Build breakdown lines
    const breakdownLines = [];
    for (const rarity of RARITY_ORDER) {
        if (result.breakdown[rarity]) {
            const { count, value } = result.breakdown[rarity];
            const cfg = RARITY_CONFIG[rarity];
            breakdownLines.push(`${cfg.emoji} **${cfg.label}** — ${count} sold for ${formatSouls(value)}`);
        }
    }

    const isAll = targetRarities.length === RARITY_ORDER.length;
    const titleLabel = isAll ? 'Sold Everything' : `Sold All ${targetRarities.map(r => RARITY_CONFIG[r]?.label).join(' + ')}`;

    const embed = createEmbed({
        title: `${theme.emojis.dagger} ${titleLabel}`,
        description: [
            `Sold **${result.totalSold}** monsters for ${formatSouls(result.totalValue)}`,
            '',
            ...breakdownLines,
            '',
            result.skippedTeam ? `*Team monsters were protected*` : '',
            `Wallet: ${formatSouls(newBalance)}`,
        ].filter(Boolean).join('\n'),
        color: theme.colors.accent,
    });

    return interaction.reply({ embeds: [embed] });
}

// ─── Select menu (no args) ───
async function showSellMenu(interaction, guildId, userId) {
    const collection = getCollection(guildId, userId);

    if (collection.length === 0) {
        return interaction.reply({
            embeds: [errorEmbed('Your crypt is empty. Hunt some creatures first with `-hunt`.')],
        });
    }

    // Sort by rarity (legendary first)
    const sorted = collection
        .filter(row => MONSTERS[row.monster_id])
        .sort((a, b) => {
            const ra = RARITY_ORDER.indexOf(MONSTERS[a.monster_id].rarity);
            const rb = RARITY_ORDER.indexOf(MONSTERS[b.monster_id].rarity);
            return rb - ra;
        });

    const options = sorted.slice(0, 25).map(row => {
        const monster = MONSTERS[row.monster_id];
        const rarityInfo = RARITY_CONFIG[monster.rarity];
        return {
            label: `${monster.name} ×${row.count}`,
            description: `${rarityInfo.label} | Sells for ${monster.sellMin}–${monster.sellMax} souls`,
            value: monster.id,
            emoji: monster.fallbackEmoji,
        };
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('sell_select')
        .setPlaceholder('Choose a creature to sell...')
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return interaction.reply({
        content: `${theme.emojis.dagger} **Which creature will you part with?**\n-# \`-sell C/U/R/E/L\` to sell by rarity · \`-sell all\` to sell everything`,
        components: [row],
    });
}

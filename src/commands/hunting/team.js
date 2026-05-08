const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { getMonsterEmoji, getRarityEmoji, getMonsterImageUrl } = require('../../utils/monsterEmojis');
const {
    MONSTERS,
    RARITY_ORDER,
    RARITY_CONFIG,
    ensureHuntProfile,
    findMonsterByName,
    getTeam,
    getCollection,
    setTeamSlot,
    clearTeamSlot,
    equipItem,
    unequipItem,
    getEffectiveStats,
    HUNT_ITEMS,
    ITEM_RARITY_CONFIG,
    ITEM_RARITY_ORDER,
    findItemByName,
    getUserItems,
} = require('../../utils/hunting');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('team')
        .setDescription('⚔️ Manage your battle team')
        .addSubcommand(sub =>
            sub.setName('view').setDescription('View your current battle team')
                .addUserOption(opt => opt.setName('user').setDescription('View another player\'s team')))
        .addSubcommand(sub =>
            sub.setName('set').setDescription('Assign a monster to a team slot')
                .addIntegerOption(opt => opt.setName('slot').setDescription('Slot number (1-3)').setRequired(true).setMinValue(1).setMaxValue(3))
                .addStringOption(opt => opt.setName('monster').setDescription('Monster name')))
        .addSubcommand(sub =>
            sub.setName('remove').setDescription('Remove a monster from a team slot')
                .addIntegerOption(opt => opt.setName('slot').setDescription('Slot number (1-3)').setRequired(true).setMinValue(1).setMaxValue(3)))
        .addSubcommand(sub =>
            sub.setName('equip').setDescription('Equip an item to a team monster')
                .addIntegerOption(opt => opt.setName('slot').setDescription('Slot number (1-3)').setRequired(true).setMinValue(1).setMaxValue(3))
                .addStringOption(opt => opt.setName('item').setDescription('Item name')))
        .addSubcommand(sub =>
            sub.setName('unequip').setDescription('Unequip (destroy) the item on a team slot')
                .addIntegerOption(opt => opt.setName('slot').setDescription('Slot number (1-3)').setRequired(true).setMinValue(1).setMaxValue(3))),

    async execute(interaction) {
        let sub = null;
        try { sub = interaction.options.getSubcommand(); } catch { sub = null; }

        if (!sub || sub === 'view') return showTeam(interaction);
        if (sub === 'set') return handleSet(interaction);
        if (sub === 'remove') return handleRemove(interaction);
        if (sub === 'equip') return handleEquip(interaction);
        if (sub === 'unequip') return handleUnequip(interaction);

        return interaction.reply({ embeds: [errorEmbed('Unknown action. Use `-team`, `-team set`, `-team remove`, `-team equip`, or `-team unequip`.')] });
    },

    // ─── Select Menu Handler (routed from interactionCreate.js) ───
    async handleSelect(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        if (interaction.customId.startsWith('team_set_')) {
            // customId: team_set_{slot}
            const slot = parseInt(interaction.customId.split('_')[2], 10);
            const monsterId = interaction.values[0];

            ensureHuntProfile(guildId, userId);
            const result = setTeamSlot(guildId, userId, slot, monsterId);

            if (!result.success) {
                return interaction.update({ embeds: [errorEmbed(result.error)], components: [] });
            }

            const monster = MONSTERS[monsterId];
            const emoji = getMonsterEmoji(monsterId, monster?.fallbackEmoji || '?');
            return interaction.update({
                content: null,
                embeds: [successEmbed(
                    `${theme.emojis.dagger} Team Updated`,
                    `${emoji} **${monster.name}** assigned to **Slot ${slot}**!\n` +
                    `❤️ \`${result.monster.hp}\` HP  ⚔️ \`${result.monster.attack}\` ATK  🛡️ \`${result.monster.defense}\` DEF`,
                )],
                components: [],
            });
        }

        if (interaction.customId.startsWith('team_equip_')) {
            // customId: team_equip_{slot}
            const slot = parseInt(interaction.customId.split('_')[2], 10);
            const itemId = interaction.values[0];

            ensureHuntProfile(guildId, userId);
            const result = equipItem(guildId, userId, slot, itemId);

            if (!result.success) {
                return interaction.update({ embeds: [errorEmbed(result.error)], components: [] });
            }

            const item = HUNT_ITEMS[itemId];
            const bonusParts = [];
            if (item.atk_bonus) bonusParts.push(`⚔️ +${item.atk_bonus} ATK`);
            if (item.def_bonus) bonusParts.push(`🛡️ +${item.def_bonus} DEF`);
            if (item.hp_bonus) bonusParts.push(`❤️ +${item.hp_bonus} HP`);

            return interaction.update({
                content: null,
                embeds: [successEmbed(
                    `${item.emoji} Item Equipped`,
                    `**${item.name}** equipped to **Slot ${slot}**!\n${bonusParts.join('  ')}`,
                )],
                components: [],
            });
        }
    },
};

// ─── View Team ───
async function showTeam(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;
    const userId = target.id;

    ensureHuntProfile(guildId, userId);
    const team = getTeam(guildId, userId);

    const lines = [];

    for (const slot of team) {
        if (!slot.monster_collection_id || !slot.monster_id) {
            lines.push(`**⬛ Slot ${slot.slot}** — *Empty*`);
            lines.push('');
            continue;
        }

        const monster = MONSTERS[slot.monster_id];
        if (!monster) {
            lines.push(`**⬛ Slot ${slot.slot}** — *Unknown*`);
            lines.push('');
            continue;
        }

        const emoji = getMonsterEmoji(slot.monster_id, monster.fallbackEmoji);
        const rarityDot = getRarityEmoji(monster.rarity, RARITY_CONFIG[monster.rarity]?.emoji || '');
        const stats = getEffectiveStats(slot, slot.eq_item_id);
        const nickname = slot.nickname ? `"${slot.nickname}"` : '';

        const hpStr = stats.hpBonus > 0 ? `${slot.hp}(+${stats.hpBonus})` : `${slot.hp}`;
        const atkStr = stats.atkBonus > 0 ? `${slot.attack}(+${stats.atkBonus})` : `${slot.attack}`;
        const defStr = stats.defBonus > 0 ? `${slot.defense}(+${stats.defBonus})` : `${slot.defense}`;

        lines.push(`**${theme.emojis.fire} Slot ${slot.slot}** — ${emoji} ${rarityDot} **${monster.name}** ${nickname} \`Lv.${slot.level || 1}\``);
        lines.push(`  ❤️ \`${hpStr}\` HP  ⚔️ \`${atkStr}\` ATK  🛡️ \`${defStr}\` DEF`);

        if (slot.eq_item_id) {
            const item = HUNT_ITEMS[slot.eq_item_id];
            if (item) {
                const itemRarityDot = getRarityEmoji(item.rarity, ITEM_RARITY_CONFIG[item.rarity]?.label || '');
                lines.push(`  ${item.emoji} ${itemRarityDot} **${item.name}**`);
            }
        }

        lines.push('');
    }

    const embed = createEmbed({
        title: `⚔️ ${target.username}'s Battle Team`,
        description: lines.join('\n'),
        color: theme.colors.accent,
    });

    return interaction.reply({ embeds: [embed] });
}

// ─── Set Monster ───
async function handleSet(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const slot = interaction.options.getInteger('slot');
    const monsterName = interaction.options.getString('monster');

    if (!slot) {
        return interaction.reply({ embeds: [errorEmbed('Usage: `-team set <slot 1-3> [monster name]`')] });
    }

    ensureHuntProfile(guildId, userId);

    // If monster name provided, assign directly
    if (monsterName) {
        const monster = findMonsterByName(monsterName);
        if (!monster) {
            return interaction.reply({ embeds: [errorEmbed(`No monster found named **${monsterName}**.`)] });
        }

        const result = setTeamSlot(guildId, userId, slot, monster.id);
        if (!result.success) {
            return interaction.reply({ embeds: [errorEmbed(result.error)] });
        }

        const emoji = getMonsterEmoji(monster.id, monster.fallbackEmoji);
        return interaction.reply({
            embeds: [successEmbed(
                `${theme.emojis.dagger} Team Updated`,
                `${emoji} **${monster.name}** assigned to **Slot ${slot}**!\n` +
                `❤️ \`${result.monster.hp}\` HP  ⚔️ \`${result.monster.attack}\` ATK  🛡️ \`${result.monster.defense}\` DEF`,
            )],
        });
    }

    // No monster name — show dropdown of owned monsters
    const collection = getCollection(guildId, userId);
    if (collection.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('Your collection is empty! Hunt some creatures first with `-hunt`.')] });
    }

    // Sort by rarity (legendary first), then by count
    const sorted = collection
        .filter(row => MONSTERS[row.monster_id])
        .sort((a, b) => {
            const ra = RARITY_ORDER.indexOf(MONSTERS[a.monster_id].rarity);
            const rb = RARITY_ORDER.indexOf(MONSTERS[b.monster_id].rarity);
            if (rb !== ra) return rb - ra;
            return b.count - a.count;
        });

    const options = sorted.slice(0, 25).map(row => {
        const monster = MONSTERS[row.monster_id];
        const rarityLabel = RARITY_CONFIG[monster.rarity]?.label || monster.rarity;
        return {
            label: `${monster.name} ×${row.count}`,
            description: `${rarityLabel} | ❤️${monster.hp} ⚔️${monster.attack} 🛡️${monster.defense}`,
            value: monster.id,
            emoji: monster.fallbackEmoji,
        };
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`team_set_${slot}`)
        .setPlaceholder(`Choose a creature for Slot ${slot}...`)
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return interaction.reply({
        content: `${theme.emojis.dagger} **Select a creature for Slot ${slot}:**`,
        components: [row],
    });
}

// ─── Remove Monster ───
async function handleRemove(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const slot = interaction.options.getInteger('slot');

    if (!slot) {
        return interaction.reply({ embeds: [errorEmbed('Usage: `-team remove <slot 1-3>`')] });
    }

    ensureHuntProfile(guildId, userId);

    const result = clearTeamSlot(guildId, userId, slot);
    if (!result.success) {
        return interaction.reply({ embeds: [errorEmbed(result.error)] });
    }

    return interaction.reply({
        embeds: [successEmbed(`${theme.emojis.skull} Slot Cleared`, `**Slot ${slot}** has been emptied.`)],
    });
}

// ─── Equip Item ───
async function handleEquip(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const slot = interaction.options.getInteger('slot');
    const itemName = interaction.options.getString('item');

    if (!slot) {
        return interaction.reply({ embeds: [errorEmbed('Usage: `-team equip <slot 1-3> [item name]`')] });
    }

    ensureHuntProfile(guildId, userId);

    // Check slot has a monster
    const team = getTeam(guildId, userId);
    const slotData = team.find(t => t.slot === slot);
    if (!slotData || !slotData.monster_collection_id) {
        return interaction.reply({ embeds: [errorEmbed(`Slot **${slot}** is empty. Assign a monster first.`)] });
    }

    // If item name provided, equip directly
    if (itemName) {
        const item = findItemByName(itemName);
        if (!item) {
            return interaction.reply({ embeds: [errorEmbed(`No item found named **${itemName}**.`)] });
        }

        const result = equipItem(guildId, userId, slot, item.id);
        if (!result.success) {
            return interaction.reply({ embeds: [errorEmbed(result.error)] });
        }

        const bonusParts = [];
        if (item.atk_bonus) bonusParts.push(`⚔️ +${item.atk_bonus} ATK`);
        if (item.def_bonus) bonusParts.push(`🛡️ +${item.def_bonus} DEF`);
        if (item.hp_bonus) bonusParts.push(`❤️ +${item.hp_bonus} HP`);

        return interaction.reply({
            embeds: [successEmbed(
                `${item.emoji} Item Equipped`,
                `**${item.name}** equipped to **Slot ${slot}**!\n${bonusParts.join('  ')}`,
            )],
        });
    }

    // No item name — show dropdown of owned items
    const items = getUserItems(guildId, userId);
    if (items.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('You don\'t have any items! Keep hunting to find some.')] });
    }

    // Sort by rarity (legendary first)
    const sorted = items
        .filter(row => HUNT_ITEMS[row.item_id])
        .sort((a, b) => {
            const ra = ITEM_RARITY_ORDER.indexOf(HUNT_ITEMS[a.item_id].rarity);
            const rb = ITEM_RARITY_ORDER.indexOf(HUNT_ITEMS[b.item_id].rarity);
            if (rb !== ra) return rb - ra;
            return b.count - a.count;
        });

    const options = sorted.slice(0, 25).map(row => {
        const item = HUNT_ITEMS[row.item_id];
        const rarityLabel = ITEM_RARITY_CONFIG[item.rarity]?.label || item.rarity;
        const bonusParts = [];
        if (item.atk_bonus) bonusParts.push(`+${item.atk_bonus} ATK`);
        if (item.def_bonus) bonusParts.push(`+${item.def_bonus} DEF`);
        if (item.hp_bonus) bonusParts.push(`+${item.hp_bonus} HP`);
        return {
            label: `${item.name} ×${row.count}`,
            description: `${rarityLabel} | ${bonusParts.join(' ')}`,
            value: item.id,
            emoji: item.emoji,
        };
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`team_equip_${slot}`)
        .setPlaceholder(`Choose an item for Slot ${slot}...`)
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const monsterName = MONSTERS[slotData.monster_id]?.name || 'your monster';

    return interaction.reply({
        content: `${theme.emojis.dagger} **Select an item to equip on ${monsterName} (Slot ${slot}):**`,
        components: [row],
    });
}

// ─── Unequip Item ───
async function handleUnequip(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const slot = interaction.options.getInteger('slot');

    if (!slot) {
        return interaction.reply({ embeds: [errorEmbed('Usage: `-team unequip <slot 1-3>`')] });
    }

    ensureHuntProfile(guildId, userId);

    const result = unequipItem(guildId, userId, slot);
    if (!result.success) {
        return interaction.reply({ embeds: [errorEmbed(result.error)] });
    }

    return interaction.reply({
        embeds: [successEmbed(`${theme.emojis.skull} Item Destroyed`, `The item on **Slot ${slot}** has been removed and destroyed.`)],
    });
}

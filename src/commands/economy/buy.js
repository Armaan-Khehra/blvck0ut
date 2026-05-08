const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');
const { ensureUser, removeSouls, formatSouls, getCurrencyEmoji } = require('../../utils/economy');
const logger = require('../../utils/logger');

const findItem = db.prepare(`
    SELECT * FROM economy_shop WHERE guild_id = ? AND is_active = 1 AND LOWER(name) = LOWER(?)
`);
const findItemById = db.prepare(`
    SELECT * FROM economy_shop WHERE guild_id = ? AND is_active = 1 AND item_id = ?
`);
const decrementStock = db.prepare(`
    UPDATE economy_shop SET stock = stock - 1 WHERE id = ?
`);
const addToInventory = db.prepare(`
    INSERT INTO economy_inventory (guild_id, user_id, item_id) VALUES (?, ?, ?)
`);
const checkOwnership = db.prepare(`
    SELECT * FROM economy_inventory WHERE guild_id = ? AND user_id = ? AND item_id = ?
`);
const getAllShopItems = db.prepare(`
    SELECT * FROM economy_shop WHERE guild_id = ? AND is_active = 1 ORDER BY price ASC
`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription(`${theme.emojis.dagger} Purchase an item from the soul shop`)
        .addStringOption(opt => opt.setName('item').setDescription('Name of the item to buy').setRequired(true).setAutocomplete(true)),

    // ─── Autocomplete handler for /buy ───
    async autocomplete(interaction) {
        const guildId = interaction.guild.id;
        const focused = interaction.options.getFocused().toLowerCase();
        const items = getAllShopItems.all(guildId);

        const filtered = items.filter(i =>
            i.name.toLowerCase().includes(focused) || i.item_id.toLowerCase().includes(focused),
        );

        await interaction.respond(
            filtered.slice(0, 25).map(i => ({
                name: `${i.name} — ${i.price.toLocaleString()} souls`,
                value: i.item_id,
            })),
        );
    },

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const itemName = interaction.options.getString('item');

        // No item provided (prefix command) — show dropdown
        if (!itemName) {
            return showDropdown(interaction, guildId);
        }

        return processPurchase(interaction, guildId, userId, itemName);
    },

    // Handle dropdown selection
    async handleSelect(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const itemId = interaction.values[0];

        return processPurchase(interaction, guildId, userId, itemId);
    },
};

// ─── Show dropdown menu when no item specified ───
async function showDropdown(interaction, guildId) {
    const items = getAllShopItems.all(guildId);

    if (items.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('The shop is empty... nothing stirs in the void.')], ephemeral: true });
    }

    // Discord select menus max 25 options
    const options = items.slice(0, 25).map((item, idx) => ({
        label: item.name,
        description: `${item.price.toLocaleString()} souls`,
        value: item.item_id,
        emoji: idx === 0 ? '1\u20E3' : undefined,
    }));

    // Remove emoji, keep it clean
    options.forEach(o => delete o.emoji);

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('buy_select')
            .setPlaceholder('choose an item to purchase...')
            .addOptions(options),
    );

    const embed = createEmbed({
        title: `${theme.emojis.dagger} Soul Shop`,
        description: `Select an item from the menu below to purchase it.`,
        color: theme.colors.primary,
    });

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

// ─── Core purchase logic ───
async function processPurchase(interaction, guildId, userId, itemName) {
    // Find item by item_id first (from autocomplete/dropdown), then by name
    let item = findItemById.get(guildId, itemName.trim().toLowerCase());
    if (!item) item = findItem.get(guildId, itemName.trim());

    if (!item) {
        return interaction.reply({
            embeds: [errorEmbed(`No item called "**${itemName}**" exists in the shop.`)],
            ephemeral: true,
        });
    }

    // Check if user already owns this (for role items, only allow one)
    if (item.type === 'role') {
        const owned = checkOwnership.get(guildId, userId, item.item_id);
        if (owned) {
            return interaction.reply({
                embeds: [errorEmbed('You already possess this dark artifact.')],
                ephemeral: true,
            });
        }
    }

    // Check if user owns the previous tier (role gating)
    if (item.type === 'role') {
        const allItems = getAllShopItems.all(guildId);
        const itemIndex = allItems.findIndex(i => i.item_id === item.item_id);
        if (itemIndex > 0) {
            const prevItem = allItems[itemIndex - 1];
            const ownsPrev = checkOwnership.get(guildId, userId, prevItem.item_id);
            if (!ownsPrev) {
                return interaction.reply({
                    embeds: [errorEmbed(`You must own **${prevItem.name}** before ascending to this tier.`)],
                    ephemeral: true,
                });
            }
        }
    }

    // Check stock
    if (item.stock !== -1 && item.stock <= 0) {
        return interaction.reply({
            embeds: [errorEmbed('This item is out of stock... the void has claimed them all.')],
            ephemeral: true,
        });
    }

    // Check balance
    const user = ensureUser(guildId, userId);
    if (user.balance < item.price) {
        return interaction.reply({
            embeds: [errorEmbed(`You need ${formatSouls(item.price)} but only have ${formatSouls(user.balance)}.`)],
            ephemeral: true,
        });
    }

    // Process purchase
    const newBalance = removeSouls(guildId, userId, item.price, 'buy', item.name);

    // Decrement stock if not unlimited
    if (item.stock !== -1) {
        decrementStock.run(item.id);
    }

    // Add to inventory
    addToInventory.run(guildId, userId, item.item_id);

    // If it's a role, assign it
    if (item.type === 'role' && item.role_id) {
        try {
            const member = interaction.member;
            await member.roles.add(item.role_id);
        } catch (err) {
            logger.error(`[Economy] Failed to assign role ${item.role_id}: ${err.message}`);
        }
    }

    const embed = createEmbed({
        title: `${theme.emojis.dagger} Purchase Complete`,
        description: [
            `You acquired **${item.name}**!`,
            `Paid ${formatSouls(item.price)}`,
            theme.divider,
            `Your wallet: ${formatSouls(newBalance)}`,
        ].join('\n'),
        color: theme.colors.accent,
        thumbnail: theme.gifs.buy,
    });

    const reply = await interaction.reply({ embeds: [embed], fetchReply: true });

    // Auto-delete purchase confirmation in shop channel after 8s
    const SHOP_CHANNEL_ID = '1473715246962184304';
    if (interaction.channel?.id === SHOP_CHANNEL_ID || interaction.channelId === SHOP_CHANNEL_ID) {
        setTimeout(() => {
            if (reply?.delete) reply.delete().catch(() => {});
            else if (interaction.deleteReply) interaction.deleteReply().catch(() => {});
        }, 8000);
    }
}

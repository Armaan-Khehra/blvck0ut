const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');
const { ensureUser, addSouls, removeSouls, formatSouls, getCurrencyEmoji } = require('../../utils/economy');
const { sendLog } = require('../../utils/channelLog');

// Shop management prepared statements
const insertShopItem = db.prepare(`
    INSERT OR REPLACE INTO economy_shop (guild_id, item_id, name, description, price, type, role_id, stock, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
`);
const removeShopItem = db.prepare(`UPDATE economy_shop SET is_active = 0 WHERE guild_id = ? AND item_id = ?`);
const resetUser = db.prepare(`DELETE FROM economy_users WHERE guild_id = ? AND user_id = ?`);
const resetInventory = db.prepare(`DELETE FROM economy_inventory WHERE guild_id = ? AND user_id = ?`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription(`${theme.emojis.crystal} Economy admin commands`)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub
            .setName('give')
            .setDescription('Grant souls to a user')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of souls').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub
            .setName('take')
            .setDescription('Remove souls from a user')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of souls').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub
            .setName('reset')
            .setDescription('Reset a user\'s economy completely')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('addshop')
            .setDescription('Add an item to the shop')
            .addStringOption(opt => opt.setName('name').setDescription('Item display name').setRequired(true))
            .addIntegerOption(opt => opt.setName('price').setDescription('Price in souls').setRequired(true).setMinValue(1))
            .addRoleOption(opt => opt.setName('role').setDescription('Role to grant on purchase (for role items)'))
            .addStringOption(opt => opt.setName('description').setDescription('Item description'))
            .addIntegerOption(opt => opt.setName('stock').setDescription('Stock amount (-1 for unlimited)').setMinValue(-1)))
        .addSubcommand(sub => sub
            .setName('removeshop')
            .setDescription('Remove an item from the shop')
            .addStringOption(opt => opt.setName('name').setDescription('Item name to remove').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'give') {
            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            if (!target || !amount) return interaction.reply({ embeds: [errorEmbed('Missing user or amount.')], ephemeral: true });

            const newBalance = addSouls(guildId, target.id, amount, 'admin_give', `By ${interaction.user.tag}`);

            sendLog(interaction.client, {
                title: `${theme.emojis.crystal} Admin: Souls Granted`,
                description: `**${interaction.user.tag}** gave ${formatSouls(amount)} to **${target.tag}**`,
                color: theme.colors.success,
                fields: [
                    { name: 'Admin', value: `${interaction.user}`, inline: true },
                    { name: 'Target', value: `${target}`, inline: true },
                    { name: 'Amount', value: formatSouls(amount), inline: true },
                ],
            });

            await interaction.reply({
                embeds: [successEmbed(
                    `${theme.emojis.crystal} Souls Granted`,
                    `Gave ${formatSouls(amount)} to **${target.username}**\nTheir wallet: ${formatSouls(newBalance)}`,
                )],
            });

        } else if (sub === 'take') {
            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            if (!target || !amount) return interaction.reply({ embeds: [errorEmbed('Missing user or amount.')], ephemeral: true });

            const user = ensureUser(guildId, target.id);
            const actualTake = Math.min(amount, user.balance);
            const newBalance = removeSouls(guildId, target.id, actualTake, 'admin_take', `By ${interaction.user.tag}`);

            sendLog(interaction.client, {
                title: `${theme.emojis.skull} Admin: Souls Taken`,
                description: `**${interaction.user.tag}** took ${formatSouls(actualTake)} from **${target.tag}**`,
                color: theme.colors.danger,
                fields: [
                    { name: 'Admin', value: `${interaction.user}`, inline: true },
                    { name: 'Target', value: `${target}`, inline: true },
                    { name: 'Amount', value: formatSouls(actualTake), inline: true },
                ],
            });

            await interaction.reply({
                embeds: [successEmbed(
                    `${theme.emojis.skull} Souls Taken`,
                    `Took ${formatSouls(actualTake)} from **${target.username}**\nTheir wallet: ${formatSouls(newBalance ?? 0)}`,
                )],
            });

        } else if (sub === 'reset') {
            const target = interaction.options.getUser('user');
            if (!target) return interaction.reply({ embeds: [errorEmbed('Missing user.')], ephemeral: true });

            resetUser.run(guildId, target.id);
            resetInventory.run(guildId, target.id);

            sendLog(interaction.client, {
                title: `${theme.emojis.fire} Admin: Economy Reset`,
                description: `**${interaction.user.tag}** reset **${target.tag}**'s economy`,
                color: theme.colors.danger,
            });

            await interaction.reply({
                embeds: [successEmbed(
                    `${theme.emojis.fire} Economy Reset`,
                    `**${target.username}**'s economy has been wiped. They'll start fresh with 5,000 souls.`,
                )],
            });

        } else if (sub === 'addshop') {
            const name = interaction.options.getString('name');
            const price = interaction.options.getInteger('price');
            const role = interaction.options.getRole('role');
            const description = interaction.options.getString('description') || '';
            const stock = interaction.options.getInteger('stock') ?? -1;

            if (!name || !price) return interaction.reply({ embeds: [errorEmbed('Missing name or price.')], ephemeral: true });

            // Generate item_id from name
            const itemId = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            const type = role ? 'role' : 'item';
            const roleId = role ? role.id : null;

            insertShopItem.run(guildId, itemId, name, description, price, type, roleId, stock);

            sendLog(interaction.client, {
                title: `${theme.emojis.candle} Shop Item Added`,
                description: `**${interaction.user.tag}** added **${name}** to the shop for ${formatSouls(price)}`,
                color: theme.colors.success,
            });

            await interaction.reply({
                embeds: [successEmbed(
                    `${theme.emojis.candle} Item Added to Shop`,
                    [
                        `**${name}** (${type})`,
                        `Price: ${formatSouls(price)}`,
                        role ? `Role: ${role}` : '',
                        `Stock: ${stock === -1 ? 'Unlimited' : stock}`,
                        `ID: \`${itemId}\``,
                    ].filter(Boolean).join('\n'),
                )],
            });

        } else if (sub === 'removeshop') {
            const name = interaction.options.getString('name');
            if (!name) return interaction.reply({ embeds: [errorEmbed('Specify the item name.')], ephemeral: true });

            const itemId = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            removeShopItem.run(guildId, itemId);

            sendLog(interaction.client, {
                title: `${theme.emojis.skull} Shop Item Removed`,
                description: `**${interaction.user.tag}** removed **${name}** from the shop`,
                color: theme.colors.danger,
            });

            await interaction.reply({
                embeds: [successEmbed(`${theme.emojis.skull} Item Removed`, `**${name}** has been banished from the shop.`)],
            });
        }
    },
};

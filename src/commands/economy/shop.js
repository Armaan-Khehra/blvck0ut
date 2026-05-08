const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');
const { formatSouls, getCurrencyEmoji, ensureUser } = require('../../utils/economy');

const getShopItems = db.prepare(`
    SELECT * FROM economy_shop WHERE guild_id = ? AND is_active = 1 ORDER BY price ASC
`);
const checkOwnership = db.prepare(`
    SELECT * FROM economy_inventory WHERE guild_id = ? AND user_id = ? AND item_id = ?
`);

const ITEMS_PER_PAGE = 5;

function formatPrice(price) {
    if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 1)}M`;
    if (price >= 1_000) return `${(price / 1_000).toFixed(price % 1_000 === 0 ? 0 : 1)}K`;
    return price.toLocaleString();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription(`${theme.emojis.candle} Browse the soul shop`)
        .addIntegerOption(opt => opt.setName('page').setDescription('Page number').setMinValue(1)),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const page = interaction.options.getInteger('page') || 1;

        const items = getShopItems.all(guildId);

        if (items.length === 0) {
            return interaction.reply({
                embeds: [errorEmbed('The shop is empty... nothing stirs in the void.')],
                ephemeral: true,
            });
        }

        const user = ensureUser(guildId, userId);
        const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
        const currentPage = Math.min(page, totalPages);
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageItems = items.slice(start, start + ITEMS_PER_PAGE);

        const lines = pageItems.map((item, i) => {
            const num = start + i + 1;
            const globalIdx = start + i;
            const roleTag = item.role_id ? `<@&${item.role_id}>` : '';
            const owned = checkOwnership.get(guildId, userId, item.item_id);
            const status = owned ? '`owned`' : (user.balance >= item.price ? '`affordable`' : '`locked`');

            // Requirement
            let req = '';
            if (globalIdx > 0) {
                const prevItem = items[globalIdx - 1];
                const ownsPrev = checkOwnership.get(guildId, userId, prevItem.item_id);
                req = ownsPrev ? '' : ` ・ needs **${prevItem.name}**`;
            }

            return [
                `**${num}.** ${item.name} ${roleTag}`,
                `⠀⠀${getCurrencyEmoji()} **${formatPrice(item.price)}** ・ ${status}${req}`,
            ].join('\n');
        });

        const embed = new EmbedBuilder()
            .setColor(0x2b2b2b)
            .setAuthor({ name: '♱  SOUL SHOP  ♱' })
            .setDescription([
                '',
                ...lines,
                '',
                `\`· · ─────────── ♱ ─────────── · ·\``,
                `⠀${getCurrencyEmoji()} your balance: **${user.balance.toLocaleString()}**`,
            ].join('\n'))
            .setFooter({ text: `page ${currentPage}/${totalPages} ・ /buy <name> to purchase ・ blvck0ut` });

        await interaction.reply({ embeds: [embed] });
    },
};

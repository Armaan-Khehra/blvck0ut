const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');

const getUserInventory = db.prepare(`
    SELECT ei.item_id, ei.acquired_at, es.name, es.type, es.role_id
    FROM economy_inventory ei
    JOIN economy_shop es ON ei.guild_id = es.guild_id AND ei.item_id = es.item_id
    WHERE ei.guild_id = ? AND ei.user_id = ?
    ORDER BY ei.acquired_at DESC
`);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription(`${theme.emojis.coffin} View your collected artifacts`)
        .addUserOption(opt => opt.setName('user').setDescription('Check another mortal\'s inventory')),

    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;

        const items = getUserInventory.all(guildId, target.id);

        if (items.length === 0) {
            const msg = target.id === interaction.user.id
                ? 'Your inventory is barren... nothing but dust and shadows.'
                : `**${target.username}** owns nothing from the shop.`;
            return interaction.reply({ embeds: [errorEmbed(msg)], ephemeral: true });
        }

        const itemLines = items.map((item, i) => {
            const roleTag = item.role_id ? ` → <@&${item.role_id}>` : '';
            const date = new Date(item.acquired_at);
            const ts = Math.floor(date.getTime() / 1000);
            return `**${i + 1}.** ${item.name}${roleTag} — <t:${ts}:R>`;
        });

        const embed = createEmbed({
            title: `${theme.emojis.coffin} ${target.username}'s Vault`,
            description: [
                `*${items.length} artifact${items.length === 1 ? '' : 's'} collected*`,
                theme.divider,
                '',
                ...itemLines,
            ].join('\n'),
            color: theme.colors.primary,
            thumbnail: theme.gifs.inventory,
        });

        await interaction.reply({ embeds: [embed] });
    },
};

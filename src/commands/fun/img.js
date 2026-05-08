const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

// Dynamic ESM import for googlethis
let google;
async function getGoogle() {
    if (!google) {
        google = require('googlethis');
    }
    return google;
}

// Track active image sessions per user
const activeSessions = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('img')
        .setDescription('🖼️ Search for images')
        .addStringOption(opt => opt.setName('query').setDescription('What to search for').setRequired(true)),

    async execute(interaction) {
        const query = interaction.options.getString('query');
        if (!query || query.trim().length === 0) {
            return interaction.reply({ embeds: [errorEmbed('Provide a search query.\n\n`-img <query>`')] });
        }

        // Limit query length
        const searchQuery = query.substring(0, 150).trim();

        await interaction.deferReply?.() || null;

        try {
            const g = await getGoogle();
            const images = await g.image(searchQuery, { safe: false });

            if (!images || images.length === 0) {
                const reply = { embeds: [errorEmbed(`No images found for **${searchQuery}**.`)] };
                return interaction.deferred ? interaction.editReply(reply) : interaction.reply(reply);
            }

            // Filter out broken/invalid URLs
            const valid = images.filter(img => img.url && img.url.startsWith('http') && img.origin?.title);

            if (valid.length === 0) {
                const reply = { embeds: [errorEmbed(`No valid images found for **${searchQuery}**.`)] };
                return interaction.deferred ? interaction.editReply(reply) : interaction.reply(reply);
            }

            const page = 0;
            const embed = buildImageEmbed(valid, page, searchQuery, interaction.user);
            const row = buildButtons(page, valid.length, interaction.user.id);

            const reply = { embeds: [embed], components: [row] };
            const sent = interaction.deferred ? await interaction.editReply(reply) : await interaction.reply({ ...reply, fetchReply: true });

            // Store session
            const sessionKey = `${interaction.user.id}_${sent.id}`;
            activeSessions.set(sessionKey, { images: valid, page, query: searchQuery });

            // Collector for buttons
            const collector = sent.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id && i.customId.startsWith('img_'),
                time: 120_000, // 2 minute timeout
            });

            collector.on('collect', async (btn) => {
                const session = activeSessions.get(sessionKey);
                if (!session) return btn.reply({ content: 'Session expired.', flags: 64 });

                if (btn.customId === `img_prev_${interaction.user.id}`) {
                    session.page = Math.max(0, session.page - 1);
                } else if (btn.customId === `img_next_${interaction.user.id}`) {
                    session.page = Math.min(session.images.length - 1, session.page + 1);
                } else if (btn.customId === `img_close_${interaction.user.id}`) {
                    activeSessions.delete(sessionKey);
                    collector.stop();
                    return btn.update({ components: [] });
                }

                const newEmbed = buildImageEmbed(session.images, session.page, session.query, interaction.user);
                const newRow = buildButtons(session.page, session.images.length, interaction.user.id);
                await btn.update({ embeds: [newEmbed], components: [newRow] });
            });

            collector.on('end', () => {
                activeSessions.delete(sessionKey);
                sent.edit({ components: [] }).catch(() => {});
            });

        } catch (err) {
            console.error('[img]', err);
            const reply = { embeds: [errorEmbed('Image search failed. Try again later.')] };
            if (interaction.deferred) return interaction.editReply(reply);
            return interaction.reply(reply);
        }
    },
};

// ─── Build image embed ───
function buildImageEmbed(images, page, query, user) {
    const img = images[page];
    const sourceName = img.origin?.website?.name || img.origin?.website?.domain || 'Unknown';
    const sourceUrl = img.origin?.website?.url || img.url;

    return createEmbed({
        title: `🖼️ ${query}`,
        description: [
            `**${img.origin?.title || 'Image'}**`,
            `*${sourceName}*`,
            '',
            `[View Source](${sourceUrl})`,
        ].join('\n'),
        image: img.url,
        color: theme.colors.primary,
    });
}

// ─── Build pagination buttons ───
function buildButtons(page, total, userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`img_prev_${userId}`)
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`img_page_${userId}`)
            .setLabel(`${page + 1} / ${total}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`img_next_${userId}`)
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= total - 1),
        new ButtonBuilder()
            .setCustomId(`img_close_${userId}`)
            .setEmoji('✖️')
            .setStyle(ButtonStyle.Danger),
    );
}

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const https = require('https');

// ─── DuckDuckGo Lite scraper ───
function ddgSearch(query) {
    return new Promise((resolve, reject) => {
        const postData = `q=${encodeURIComponent(query)}`;
        const options = {
            hostname: 'lite.duckduckgo.com',
            path: '/lite/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html',
                'Referer': 'https://lite.duckduckgo.com/',
            },
        };

        const req = https.request(options, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const results = [];
                const seen = new Set();

                // Extract external links (result titles + URLs)
                const linkRegex = /<a[^>]+href="(https?:\/\/(?!duckduckgo|improving|lite\.duckduckgo)[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
                let match;
                while ((match = linkRegex.exec(data)) !== null) {
                    const title = decodeEntities(match[2].replace(/<[^>]+>/g, '').trim());
                    const url = match[1];
                    if (title.length > 3 && !seen.has(url)) {
                        seen.add(url);
                        results.push({ title, url, snippet: '', position: match.index });
                    }
                }

                // Extract snippets from <td> blocks near each result
                const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
                let tmatch;
                const allTds = [];
                while ((tmatch = tdRegex.exec(data)) !== null) {
                    const text = decodeEntities(tmatch[1].replace(/<[^>]+>/g, '').trim());
                    if (text.length > 30 && !text.includes('duckduckgo') && !text.startsWith('http')) {
                        allTds.push({ text, position: tmatch.index });
                    }
                }

                // Match snippets to results by proximity in HTML
                for (const result of results) {
                    const closest = allTds.find(td => td.position > result.position && td.position - result.position < 2000);
                    if (closest) {
                        result.snippet = closest.text.substring(0, 200);
                    }
                }

                // Deduplicate by URL (DDG sometimes repeats Wikipedia etc.)
                const deduped = [];
                const urlSet = new Set();
                for (const r of results) {
                    if (!urlSet.has(r.url)) {
                        urlSet.add(r.url);
                        deduped.push(r);
                    }
                }

                resolve(deduped);
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Search timed out')); });
        req.write(postData);
        req.end();
    });
}

function decodeEntities(str) {
    return str
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

// Track active sessions
const activeSessions = new Map();

// Results per page
const PER_PAGE = 5;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('🔍 Search the web')
        .addStringOption(opt => opt.setName('query').setDescription('What to search for').setRequired(true)),

    async execute(interaction) {
        const query = interaction.options.getString('query');
        if (!query || query.trim().length === 0) {
            return interaction.reply({ embeds: [errorEmbed('Provide a search query.\n\n`-search <query>`')] });
        }

        const searchQuery = query.substring(0, 200).trim();

        await interaction.deferReply?.() || null;

        try {
            const results = await ddgSearch(searchQuery);

            if (!results || results.length === 0) {
                const reply = { embeds: [errorEmbed(`No results found for **${searchQuery}**.`)] };
                return interaction.deferred ? interaction.editReply(reply) : interaction.reply(reply);
            }

            const page = 0;
            const totalPages = Math.ceil(results.length / PER_PAGE);
            const embed = buildSearchEmbed(results, page, searchQuery, interaction.user);
            const row = buildButtons(page, totalPages, interaction.user.id);

            const reply = { embeds: [embed], components: totalPages > 1 ? [row] : [] };
            const sent = interaction.deferred ? await interaction.editReply(reply) : await interaction.reply({ ...reply, fetchReply: true });

            if (totalPages <= 1) return;

            // Store session
            const sessionKey = `${interaction.user.id}_${sent.id}`;
            activeSessions.set(sessionKey, { results, page, query: searchQuery });

            const collector = sent.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id && i.customId.startsWith('search_'),
                time: 120_000,
            });

            collector.on('collect', async (btn) => {
                const session = activeSessions.get(sessionKey);
                if (!session) return btn.reply({ content: 'Session expired.', flags: 64 });

                const tp = Math.ceil(session.results.length / PER_PAGE);

                if (btn.customId === `search_prev_${interaction.user.id}`) {
                    session.page = Math.max(0, session.page - 1);
                } else if (btn.customId === `search_next_${interaction.user.id}`) {
                    session.page = Math.min(tp - 1, session.page + 1);
                } else if (btn.customId === `search_close_${interaction.user.id}`) {
                    activeSessions.delete(sessionKey);
                    collector.stop();
                    return btn.update({ components: [] });
                }

                const newEmbed = buildSearchEmbed(session.results, session.page, session.query, interaction.user);
                const newRow = buildButtons(session.page, tp, interaction.user.id);
                await btn.update({ embeds: [newEmbed], components: [newRow] });
            });

            collector.on('end', () => {
                activeSessions.delete(sessionKey);
                sent.edit({ components: [] }).catch(() => {});
            });

        } catch (err) {
            console.error('[search]', err);
            const reply = { embeds: [errorEmbed('Search failed. Try again later.')] };
            if (interaction.deferred) return interaction.editReply(reply);
            return interaction.reply(reply);
        }
    },
};

// ─── Build search results embed ───
function buildSearchEmbed(results, page, query, user) {
    const start = page * PER_PAGE;
    const pageResults = results.slice(start, start + PER_PAGE);
    const totalPages = Math.ceil(results.length / PER_PAGE);

    const lines = pageResults.map((r, i) => {
        const num = start + i + 1;
        const snippet = r.snippet ? `\n> ${r.snippet.substring(0, 150)}${r.snippet.length > 150 ? '...' : ''}` : '';
        return `**${num}.** [${r.title}](${r.url})${snippet}`;
    });

    return createEmbed({
        title: `🔍 ${query}`,
        description: lines.join('\n\n'),
        color: theme.colors.primary,
    });
}

// ─── Build pagination buttons ───
function buildButtons(page, totalPages, userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`search_prev_${userId}`)
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`search_page_${userId}`)
            .setLabel(`${page + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`search_next_${userId}`)
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1),
        new ButtonBuilder()
            .setCustomId(`search_close_${userId}`)
            .setEmoji('✖️')
            .setStyle(ButtonStyle.Danger),
    );
}

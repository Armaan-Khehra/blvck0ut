const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');

const getShopItems = db.prepare(`
    SELECT * FROM economy_shop WHERE guild_id = ? AND is_active = 1 ORDER BY price ASC
`);

const EMBED_COLOR = 0x0d0d0d;

// Long footer forces all embeds to the same width
const FOOTER_TEXT = '♱ blvck0ut • embrace the void\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003';

// ─── Gifs for each section (left-side thumbnails) ───
const GIFS = {
    banner:    'https://media.tenor.com/CuSESkhuAbAAAAAM/skull-smoke.gif',
    info:      'https://media1.tenor.com/m/ITkrzVj240EAAAAC/dark-rose.gif',
    initiate:  'https://media1.tenor.com/m/xFhmcVVSbp8AAAAC/fire-purple.gif',
    blvck:     'https://media1.tenor.com/m/rSdLVVXVJ8cAAAAC/dark-gothic.gif',
    sovereign: 'https://media.tenor.com/CuSESkhuAbAAAAAM/skull-smoke.gif',
    earn:      'https://media1.tenor.com/m/xFhmcVVSbp8AAAAC/fire-purple.gif',
};

// ─── Tier config (built inside execute after emojis are resolved) ───
function buildTiers(E) {
    return [
        {
            label: 'INITIATE TIER',
            range: [0, 4],
            emoji: E.fire,
            desc: 'the first steps into darkness. prove your devotion.',
            gif: GIFS.initiate,
        },
        {
            label: 'BLVCK TIER',
            range: [5, 9],
            emoji: E.bat,
            desc: 'you\'ve earned your place among the anointed. ascend further.',
            gif: GIFS.blvck,
        },
        {
            label: 'SOVEREIGN TIER',
            range: [10, 14],
            emoji: E.skull,
            desc: 'the final ascension. only the most devoted reach this far.',
            gif: GIFS.sovereign,
        },
    ];
}

// ─── Perks per item ───
const PERK_DISPLAY = {
    damned:          ['colored name in chat'],
    nightshade:      ['colored name', 'higher role hierarchy'],
    bloodlust:       ['colored name', 'higher hierarchy', 'media permissions'],
    venomous:        ['colored name', 'higher hierarchy', 'media perms', 'change nickname'],
    sinful:          ['colored name', 'higher hierarchy', 'media perms', 'nickname', 'reactions'],
    blvck_vixen:     ['all previous perks', 'early access channels'],
    blvck_thorns:    ['all previous perks', 'early access', 'bypass slowmode'],
    blvck_phantom:   ['all previous perks', 'phantom lounge access'],
    blvck_souls:     ['all previous perks', 'request custom color'],
    blvck_blood:     ['all previous perks', 'custom color', 'event pings'],
    blvck_eternal:   ['all previous perks', 'custom role icon'],
    blvck_royalty:   ['all previous perks', 'custom icon', 'personal channel'],
    blvck_empire:    ['all previous perks', 'custom autoresponder', 'staff priority'],
    blvck_immortal:  ['all previous perks', 'fully custom role', 'giveaway priority'],
    blvck_nightlord: ['every single perk', 'custom role', 'custom channel', 'honorary staff'],
};

function formatPrice(price) {
    if (price >= 1_000_000) {
        const val = price / 1_000_000;
        return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
    }
    if (price >= 1_000) {
        const val = price / 1_000;
        return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}K`;
    }
    return price.toLocaleString();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shoppost')
        .setDescription(`${theme.emojis.candle} Post the permanent shop display`)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Resolve animated emojis dynamically from the bot's cache
        const E = theme.resolveAnimatedEmojis(interaction.client);
        const BORDER = E.border;

        const guildId = interaction.guild.id;
        const items = getShopItems.all(guildId);

        if (items.length === 0) {
            return interaction.editReply({ embeds: [errorEmbed('No items in the shop to display.')] });
        }

        // Post into the current channel (run this command inside the target thread)
        const channel = interaction.channel;

        // If it's a thread, make sure it's not archived
        if (channel.archived) {
            await channel.setArchived(false);
        }

        // ═══════════════════════════════════════════
        //  BANNER
        // ═══════════════════════════════════════════
        await channel.send({ embeds: [new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription([
                BORDER,
                '',
                `# ${E.skull} S O U L   S H O P ${E.skull}`,
                `### *trade your souls for power*`,
                '',
                BORDER,
            ].join('\n'))
            .setThumbnail(GIFS.banner)
            .setFooter({ text: FOOTER_TEXT }),
        ] });

        // ═══════════════════════════════════════════
        //  INFO
        // ═══════════════════════════════════════════
        await channel.send({ embeds: [new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription([
                `### ${E.rose}  how it works`,
                `> ${E.puff} each role grants **unique perks** that stack as you ascend`,
                `> ${E.crystal} you must **own the previous tier** to unlock the next`,
                `> ${E.fire} higher tiers = more power, more perks, more status`,
                '',
                `### ${E.skull}  how to buy`,
                `> ${E.ribbon} use \`/buy\` — type the name and **pick from autocomplete**`,
                `> ${E.cross} use \`-buy\` — a **dropdown menu** appears to select from`,
                `> ${E.bat} or type \`-buy <name>\` with the role name directly`,
                '',
                `### ${E.crystal}  useful commands`,
                `> ${E.heart} \`/balance\` \`/shop\` \`/inventory\` \`/daily\` \`/leaderboard\``,
                `> ${E.rose} *prefix:* \`-bal\` \`-shop\` \`-inventory\` \`-daily\` \`-lb\``,
                '',
                BORDER,
            ].join('\n'))
            .setThumbnail(GIFS.info)
            .setFooter({ text: FOOTER_TEXT }),
        ] });

        // ═══════════════════════════════════════════
        //  TIER EMBEDS
        // ═══════════════════════════════════════════
        const TIERS = buildTiers(E);
        for (const tier of TIERS) {
            const tierItems = items.slice(tier.range[0], tier.range[1] + 1);
            if (tierItems.length === 0) continue;

            const itemBlocks = [];

            for (let i = 0; i < tierItems.length; i++) {
                const item = tierItems[i];
                const globalIdx = tier.range[0] + i;
                const roleTag = item.role_id ? `<@&${item.role_id}>` : item.name;
                const perks = PERK_DISPLAY[item.item_id] || ['exclusive role'];
                const stock = item.stock === -1 ? '∞' : `${item.stock}`;

                let reqText = '**none** *— entry tier*';
                if (globalIdx > 0) {
                    const prevItem = items[globalIdx - 1];
                    reqText = `**${prevItem.name}**`;
                }

                const perkStr = perks.map(p => `\`${p}\``).join(' ・ ');

                itemBlocks.push([
                    `${E.heart} **${item.name}** — ${E.souls} **${formatPrice(item.price)}**`,
                    `> ${E.ribbon} ${roleTag}`,
                    `> ${E.rose} ${perkStr}`,
                    `> ${E.cross} requires ${reqText} ・ ${E.crystal} stock **${stock}**`,
                ].join('\n'));
            }

            await channel.send({ embeds: [new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setDescription([
                    `## ${tier.emoji}  ${tier.label}  ${tier.emoji}`,
                    `> *${tier.desc}*`,
                    '',
                    itemBlocks.join('\n\n'),
                    '',
                    BORDER,
                ].join('\n'))
                .setThumbnail(tier.gif)
                .setFooter({ text: FOOTER_TEXT }),
            ] });
        }

        // ═══════════════════════════════════════════
        //  HOW TO EARN
        // ═══════════════════════════════════════════
        await channel.send({ embeds: [new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription([
                BORDER,
                '',
                `## ${E.fire}  HOW TO EARN SOULS  ${E.fire}`,
                '',
                `> ${E.puff} \`/daily\` — daily soul offering *(250)*`,
                `> ${E.ribbon} \`/work\` — dark labor *(200-800)*`,
                `> ${E.skull} \`/crime\` — risky heist *(500-2000)*`,
                `> ${E.bat} \`/coinflip\` \`/slots\` \`/dice\` — gamble your fate`,
                `> ${E.rose} chatting — earn passively *(5-15 per msg)*`,
                `> ${E.crystal} \`/pick\` — catch wandering soul drops`,
                '',
                `*the void rewards the devoted ${E.heart} grind, gamble, ascend.*`,
                '',
                BORDER,
            ].join('\n'))
            .setThumbnail(GIFS.earn)
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp(),
        ] });

        await interaction.editReply({ embeds: [createEmbed({ description: 'Shop display posted.', color: theme.colors.success })] });
    },
};

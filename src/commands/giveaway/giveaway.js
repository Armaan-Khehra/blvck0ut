const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const logger = require('../../utils/logger');
const {
    isOwner,
    isStaff,
    parseDuration,
    formatDuration,
    buildGiveawayEmbed,
    buildJoinRow,
    insertGiveaway,
    setMessageId,
    getGiveaway,
    getGiveawayByGuild,
    getActiveGiveaways,
    markCancelled,
    updateWinners,
    setForcedWinners,
    countEntries,
    listEntries,
    rollWinners,
    endGiveaway,
} = require('../../utils/giveaways');

// ─── /giveaway — host, manage, and reroll giveaways ───
module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription(`Host or manage a giveaway`)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Host a real giveaway (staff only)')
                .addStringOption(o => o.setName('duration').setDescription('e.g. 30m, 2h, 1d, 1w').setRequired(true))
                .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
                .addIntegerOption(o => o.setName('winners').setDescription('Number of winners (1-10)').setMinValue(1).setMaxValue(10))
                .addStringOption(o => o.setName('requirement').setDescription('Entry requirement').addChoices(
                    { name: 'None', value: 'none' },
                    { name: 'Rep — /blvck0ut or .gg/blvck0ut in status', value: 'rep' },
                    { name: 'Invites — at least 1 invite', value: 'invites' },
                )),
        )
        .addSubcommand(sub =>
            sub.setName('fake')
                .setDescription('Host a fake giveaway — looks identical, only you know (owner only)')
                .addStringOption(o => o.setName('duration').setDescription('e.g. 30m, 2h, 1d, 1w').setRequired(true))
                .addStringOption(o => o.setName('prize').setDescription('What to pretend to give away?').setRequired(true))
                .addIntegerOption(o => o.setName('winners').setDescription('Number of winners (1-10)').setMinValue(1).setMaxValue(10))
                .addStringOption(o => o.setName('requirement').setDescription('Entry requirement').addChoices(
                    { name: 'None', value: 'none' },
                    { name: 'Rep — /blvck0ut or .gg/blvck0ut in status', value: 'rep' },
                    { name: 'Invites — at least 1 invite', value: 'invites' },
                ))
                .addUserOption(o => o.setName('winner').setDescription('Forced winner (your alt). Empty = random roll.'))
                .addUserOption(o => o.setName('winner2').setDescription('Second forced winner (optional)'))
                .addUserOption(o => o.setName('winner3').setDescription('Third forced winner (optional)')),
        )
        .addSubcommand(sub =>
            sub.setName('end')
                .setDescription('End a giveaway early and roll winners now')
                .addIntegerOption(o => o.setName('id').setDescription('Giveaway ID').setRequired(true)),
        )
        .addSubcommand(sub =>
            sub.setName('cancel')
                .setDescription('Cancel a giveaway — no winners')
                .addIntegerOption(o => o.setName('id').setDescription('Giveaway ID').setRequired(true)),
        )
        .addSubcommand(sub =>
            sub.setName('reroll')
                .setDescription('Reroll winner(s) for an ended giveaway')
                .addIntegerOption(o => o.setName('id').setDescription('Giveaway ID').setRequired(true))
                .addIntegerOption(o => o.setName('winners').setDescription('How many to reroll (default 1)').setMinValue(1).setMaxValue(10)),
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List every active giveaway'),
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'start':  return handleStart(interaction, false);
            case 'fake':   return handleStart(interaction, true);
            case 'end':    return handleEnd(interaction);
            case 'cancel': return handleCancel(interaction);
            case 'reroll': return handleReroll(interaction);
            case 'list':   return handleList(interaction);
        }
    },
};

// ─── Start (real or fake) ───
async function handleStart(interaction, fake) {
    // Permission gate (these stay as direct ephemeral replies — nothing posted yet)
    if (fake) {
        if (!isOwner(interaction.member)) {
            return interaction.reply({
                embeds: [errorEmbed('Only the **Owner** can use this.')],
                ephemeral: true,
            });
        }
    } else {
        if (!isStaff(interaction.member)) {
            return interaction.reply({
                embeds: [errorEmbed('Only **staff** can host giveaways.')],
                ephemeral: true,
            });
        }
    }

    // Defer ephemerally — this hides the "user used /giveaway X" attribution from the channel.
    // The public giveaway is then posted as a plain bot message via channel.send().
    await interaction.deferReply({ ephemeral: true });

    const durationStr = interaction.options.getString('duration');
    const prize = interaction.options.getString('prize');
    const winnerCount = interaction.options.getInteger('winners') || 1;
    const requirement = interaction.options.getString('requirement') || 'none';

    // Fake-only: collect forced winners (optional)
    let forcedWinnerIds = [];
    if (fake) {
        const w1 = interaction.options.getUser('winner');
        const w2 = interaction.options.getUser('winner2');
        const w3 = interaction.options.getUser('winner3');
        forcedWinnerIds = [...new Set([w1, w2, w3].filter(Boolean).map(u => u.id))];
    }

    const ms = parseDuration(durationStr);
    if (!ms || ms < 10_000 || ms > 30 * 86_400_000) {
        return interaction.editReply({
            embeds: [errorEmbed('Invalid duration. Use formats like `30s`, `5m`, `2h`, `1d`, `1w`. Min `10s`, max `30d`.')],
        });
    }
    if (prize.length > 200) {
        return interaction.editReply({
            embeds: [errorEmbed('Prize must be 200 characters or fewer.')],
        });
    }

    const endsAt = new Date(Date.now() + ms).toISOString();

    // Insert DB row first so we can use the ID in the button
    const result = insertGiveaway.run(
        interaction.guild.id,
        interaction.channel.id,
        interaction.user.id,
        prize,
        winnerCount,
        fake ? 1 : 0,
        endsAt,
        requirement,
    );
    const giveawayId = result.lastInsertRowid;

    // Persist forced winners for fake giveaways with a rigged target
    if (fake && forcedWinnerIds.length > 0) {
        setForcedWinners.run(JSON.stringify(forcedWinnerIds), giveawayId);
    }

    const gw = getGiveaway.get(giveawayId);
    const embed = buildGiveawayEmbed(gw);
    const row = buildJoinRow(giveawayId, false, 0);

    // Post publicly as a clean bot message — no "user used /giveaway X" header.
    // Real and fake look identical from the channel's perspective.
    const sent = await interaction.channel.send({
        embeds: [embed],
        components: [row],
    });
    setMessageId.run(sent.id, giveawayId);

    // Confirm to the host privately (ephemeral edit of the deferred reply)
    if (fake) {
        const riggedLine = forcedWinnerIds.length > 0
            ? `**Rigged winner${forcedWinnerIds.length > 1 ? 's' : ''}:** ${forcedWinnerIds.map(id => `<@${id}>`).join(', ')}`
            : `**Rigged:** none — will roll randomly from entries`;

        const fillNote = forcedWinnerIds.length > 0 && forcedWinnerIds.length < winnerCount
            ? `\n*Remaining ${winnerCount - forcedWinnerIds.length} slot(s) fill randomly from real entries.*`
            : '';

        await interaction.editReply({
            embeds: [createEmbed({
                title: `Fake giveaway created`,
                description: [
                    `Only you see this message — the channel can't tell it's fake.`,
                    ``,
                    `**Prize:** ${prize}`,
                    `**Winners:** ${winnerCount}`,
                    `**Duration:** ${formatDuration(ms)}`,
                    `**Giveaway ID:** \`${giveawayId}\``,
                    riggedLine,
                    fillNote,
                ].join('\n'),
                color: theme.colors.void,
            })],
        });
    } else {
        await interaction.editReply({
            embeds: [createEmbed({
                title: `Giveaway started`,
                description: [
                    `**Prize:** ${prize}`,
                    `**Winners:** ${winnerCount}`,
                    `**Duration:** ${formatDuration(ms)}`,
                    `**Giveaway ID:** \`${giveawayId}\``,
                ].join('\n'),
                color: theme.colors.void,
            })],
        });
    }

    logger.info(`Giveaway #${giveawayId} started (${fake ? 'FAKE' : 'real'}) by ${interaction.user.tag}: "${prize}" — ends in ${formatDuration(ms)}`);
}

// ─── End early ───
async function handleEnd(interaction) {
    const id = interaction.options.getInteger('id');
    const gw = getGiveawayByGuild.get(id, interaction.guild.id);

    if (!gw) {
        return interaction.reply({ embeds: [errorEmbed('No giveaway with that ID exists.')], ephemeral: true });
    }
    if (gw.ended || gw.cancelled) {
        return interaction.reply({ embeds: [errorEmbed('This giveaway has already ended.')], ephemeral: true });
    }

    // Host or staff can end
    if (gw.host_id !== interaction.user.id && !isStaff(interaction.member)) {
        return interaction.reply({ embeds: [errorEmbed('Only the host or staff can end this giveaway.')], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const res = await endGiveaway(interaction.client, id);

    if (!res) {
        return interaction.editReply({ embeds: [errorEmbed('Could not end the giveaway.')] });
    }

    return interaction.editReply({
        embeds: [createEmbed({
            title: `Giveaway ended`,
            description: res.winners.length
                ? `Winner(s) rolled: ${res.winners.map(i => `<@${i}>`).join(', ')}`
                : 'No entrants — no winners.',
            color: theme.colors.void,
        })],
    });
}

// ─── Cancel ───
async function handleCancel(interaction) {
    const id = interaction.options.getInteger('id');
    const gw = getGiveawayByGuild.get(id, interaction.guild.id);

    if (!gw) {
        return interaction.reply({ embeds: [errorEmbed('No giveaway with that ID exists.')], ephemeral: true });
    }
    if (gw.ended || gw.cancelled) {
        return interaction.reply({ embeds: [errorEmbed('This giveaway has already ended.')], ephemeral: true });
    }
    if (gw.host_id !== interaction.user.id && !isStaff(interaction.member)) {
        return interaction.reply({ embeds: [errorEmbed('Only the host or staff can cancel this giveaway.')], ephemeral: true });
    }

    markCancelled.run(id);

    // Edit the original message to show cancellation
    try {
        const channel = await interaction.client.channels.fetch(gw.channel_id);
        const message = gw.message_id ? await channel.messages.fetch(gw.message_id).catch(() => null) : null;
        if (message) {
            const cancelledEmbed = createEmbed({
                title: `Giveaway cancelled`,
                description: [
                    `~~**Prize:** ${gw.prize}~~`,
                    ``,
                    `*This giveaway has been cancelled by the host.*`,
                ].join('\n'),
                color: theme.colors.void,
            });
            await message.edit({ embeds: [cancelledEmbed], components: [] }).catch(() => {});
        }
    } catch (err) {
        logger.warn(`Could not update cancelled giveaway message: ${err.message}`);
    }

    return interaction.reply({
        embeds: [createEmbed({
            title: `Cancelled`,
            description: `Giveaway **#${id}** has been cancelled.`,
            color: theme.colors.void,
        })],
        ephemeral: true,
    });
}

// ─── Reroll ───
async function handleReroll(interaction) {
    const id = interaction.options.getInteger('id');
    const extra = interaction.options.getInteger('winners') || 1;
    const gw = getGiveawayByGuild.get(id, interaction.guild.id);

    if (!gw) {
        return interaction.reply({ embeds: [errorEmbed('No giveaway with that ID exists.')], ephemeral: true });
    }
    if (!gw.ended) {
        return interaction.reply({ embeds: [errorEmbed('That giveaway is not ended — use `/giveaway end` first.')], ephemeral: true });
    }
    if (gw.host_id !== interaction.user.id && !isStaff(interaction.member)) {
        return interaction.reply({ embeds: [errorEmbed('Only the host or staff can reroll.')], ephemeral: true });
    }

    const newWinners = rollWinners(id, extra);
    if (newWinners.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('Nobody entered — nothing to reroll.')], ephemeral: true });
    }

    // Merge into stored winners list for record-keeping
    let existing = [];
    try { existing = JSON.parse(gw.winners || '[]'); } catch {}
    updateWinners.run(JSON.stringify([...existing, ...newWinners]), id);

    const channel = await interaction.client.channels.fetch(gw.channel_id).catch(() => null);
    const announcement = {
        content: `🎉 ${newWinners.map(i => `<@${i}>`).join(' ')} — you won the reroll!`,
        embeds: [createEmbed({
            title: `Reroll`,
            description: [
                `**Prize:** ${gw.prize}`,
                `**New winner${newWinners.length > 1 ? 's' : ''}:** ${newWinners.map(i => `<@${i}>`).join(', ')}`,
            ].join('\n'),
            color: theme.colors.void,
        })],
        allowedMentions: { users: newWinners.concat([gw.host_id]) },
    };

    if (channel) await channel.send(announcement).catch(() => {});

    return interaction.reply({
        embeds: [createEmbed({
            title: `Rerolled`,
            description: `New winner${newWinners.length > 1 ? 's' : ''} chosen.`,
            color: theme.colors.void,
        })],
        ephemeral: true,
    });
}

// ─── List active ───
async function handleList(interaction) {
    const rows = getActiveGiveaways.all(interaction.guild.id);

    if (rows.length === 0) {
        return interaction.reply({
            embeds: [createEmbed({
                title: `No active giveaways`,
                description: 'Nothing currently running.',
                color: theme.colors.void,
            })],
            ephemeral: true,
        });
    }

    const staff = isStaff(interaction.member);
    const lines = rows.map(gw => {
        const entries = countEntries.get(gw.id)?.n ?? 0;
        const endTs = Math.floor(new Date(gw.ends_at).getTime() / 1000);
        // Only reveal "fake" label to the host themselves (owner) — not to other staff
        const fakeTag = (gw.is_fake && gw.host_id === interaction.user.id) ? ` *(fake)*` : '';
        return [
            `**#${gw.id}** — **${gw.prize}**${fakeTag}`,
            `Host: <@${gw.host_id}> · Winners: ${gw.winner_count} · Entries: \`${entries}\``,
            `Ends: <t:${endTs}:R>  ·  Channel: <#${gw.channel_id}>`,
        ].join('\n');
    });

    return interaction.reply({
        embeds: [createEmbed({
            title: `Active giveaways`,
            description: lines.join('\n\n'),
            color: theme.colors.void,
        })],
        ephemeral: !staff, // keep the list private for non-staff who manage to run it
    });
}


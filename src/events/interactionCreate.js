const { Events } = require('discord.js');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const theme = require('../utils/theme');
const db = require('../data/database');
const logger = require('../utils/logger');
const { PROFILE_SECTIONS } = require('../commands/welcome/profilepanel');
const {
    getGiveaway,
    hasEntry,
    insertEntry,
    removeEntry,
    countEntries,
    refreshGiveawayMessage,
} = require('../utils/giveaways');

const getColorRoles = db.prepare('SELECT role_id FROM color_roles WHERE guild_id = ?');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        // Handle autocomplete
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (command?.autocomplete) {
                try {
                    await command.autocomplete(interaction);
                } catch (error) {
                    logger.error(`Autocomplete error in /${interaction.commandName}:`, error);
                }
            }
            return;
        }

        // Handle select menu interactions
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'buy_select') {
                return handleBuySelect(interaction);
            }
            if (interaction.customId === 'sell_select') {
                return handleSellSelect(interaction);
            }
            if (interaction.customId.startsWith('team_set_') || interaction.customId.startsWith('team_equip_')) {
                return handleTeamSelect(interaction);
            }
        }

        // Handle button interactions
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('color_')) {
                return handleColorButton(interaction);
            }
            if (interaction.customId.startsWith('profile_')) {
                return handleProfileButton(interaction);
            }
            if (interaction.customId.startsWith('gw_join_')) {
                return handleGiveawayJoin(interaction);
            }

        }

        // Handle slash commands
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            logger.warn(`Unknown command: ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            logger.error(`Error in /${interaction.commandName}:`, error);

            const reply = { embeds: [errorEmbed('Something went wrong... the spirits are restless.')], ephemeral: true };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply).catch(() => {});
            } else {
                await interaction.reply(reply).catch(() => {});
            }
        }
    },
};

// ─── Color Panel Handler ───
async function handleColorButton(interaction) {
    const roleId = interaction.customId.replace('color_', '');
    const member = interaction.member;
    const guild = interaction.guild;

    try {
        await interaction.deferReply({ ephemeral: true });

        const colorRoles = getColorRoles.all(guild.id).map(r => r.role_id);

        if (colorRoles.length === 0) {
            return interaction.editReply({ embeds: [errorEmbed('No color roles found. An admin needs to run `/colorpanel` first.')] });
        }

        const currentColorRoles = member.roles.cache.filter(r => colorRoles.includes(r.id));

        if (currentColorRoles.has(roleId)) {
            await member.roles.remove(roleId);
            const role = guild.roles.cache.get(roleId);
            return interaction.editReply({
                embeds: [successEmbed(
                    `${theme.emojis.coffin} Color stripped`,
                    `**${role?.name || 'Unknown'}** has been removed.`,
                )],
            });
        }

        const rolesToRemove = currentColorRoles.map(r => r.id);
        if (rolesToRemove.length > 0) {
            await member.roles.remove(rolesToRemove);
        }

        await member.roles.add(roleId);
        const newRole = guild.roles.cache.get(roleId);

        return interaction.editReply({
            embeds: [successEmbed(
                `${theme.emojis.crystal} Color claimed`,
                `You are now marked with **${newRole?.name || 'Unknown'}**.`,
            )],
        });
    } catch (error) {
        logger.error(`Failed to assign color role: ${error.message}`);
        const reply = { embeds: [errorEmbed('Failed to change your color. The spirits resist.')] };
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply(reply).catch(() => {});
        }
        return interaction.reply({ ...reply, ephemeral: true }).catch(() => {});
    }
}

// ─── Profile Panel Handler ───
async function handleProfileButton(interaction) {
    // customId format: profile_{sectionId}_{roleId}
    const parts = interaction.customId.split('_');
    const sectionId = parts[1];
    const roleId = parts.slice(2).join('_');
    const member = interaction.member;

    try {
        await interaction.deferReply({ ephemeral: true });

        const section = PROFILE_SECTIONS.find(s => s.id === sectionId);
        if (!section) {
            return interaction.editReply({ embeds: [errorEmbed('Unknown profile section.')] });
        }

        const sectionRoleIds = section.roles.map(r => r.roleId);
        const role = interaction.guild.roles.cache.get(roleId);
        const roleName = role?.name || 'Unknown';

        // Toggle off if they already have it
        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            return interaction.editReply({
                embeds: [successEmbed(
                    `${theme.emojis.coffin} Removed`,
                    `**${roleName}** has been stripped away.`,
                )],
            });
        }

        // Exclusive mode: remove other roles in same section first
        if (section.mode === 'exclusive') {
            const currentSectionRoles = member.roles.cache.filter(r => sectionRoleIds.includes(r.id));
            const toRemove = currentSectionRoles.map(r => r.id);
            if (toRemove.length > 0) {
                await member.roles.remove(toRemove);
            }
        }

        await member.roles.add(roleId);

        return interaction.editReply({
            embeds: [successEmbed(
                `${theme.emojis.crystal} Marked`,
                `You are now **${roleName}**.`,
            )],
        });
    } catch (error) {
        logger.error(`Failed to assign profile role: ${error.message}`);
        const reply = { embeds: [errorEmbed('Failed to update your profile. The spirits resist.')] };
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply(reply).catch(() => {});
        }
        return interaction.reply({ ...reply, ephemeral: true }).catch(() => {});
    }
}

// ─── Sell Select Menu Handler ───
async function handleSellSelect(interaction) {
    const sellCommand = interaction.client.commands.get('sell');
    if (!sellCommand?.handleSelect) return;

    try {
        await sellCommand.handleSelect(interaction);
    } catch (error) {
        logger.error(`Sell select error: ${error.message}`);
        const reply = { embeds: [errorEmbed('Something went wrong... the spirits are restless.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply).catch(() => {});
        } else {
            await interaction.reply(reply).catch(() => {});
        }
    }
}

// ─── Team Select Menu Handler ───
async function handleTeamSelect(interaction) {
    const teamCommand = interaction.client.commands.get('team');
    if (!teamCommand?.handleSelect) return;

    try {
        await teamCommand.handleSelect(interaction);
    } catch (error) {
        logger.error(`Team select error: ${error.message}`);
        const reply = { embeds: [errorEmbed('Something went wrong... the spirits are restless.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply).catch(() => {});
        } else {
            await interaction.reply(reply).catch(() => {});
        }
    }
}

// ─── Giveaway Join Button Handler ───
async function handleGiveawayJoin(interaction) {
    const giveawayId = parseInt(interaction.customId.replace('gw_join_', ''), 10);
    if (!giveawayId || Number.isNaN(giveawayId)) return;

    try {
        await interaction.deferReply({ ephemeral: true });

        const gw = getGiveaway.get(giveawayId);
        if (!gw) {
            return interaction.editReply({ embeds: [errorEmbed('That ritual has dissolved into the void.')] });
        }
        if (gw.ended || gw.cancelled) {
            return interaction.editReply({ embeds: [errorEmbed('This giveaway is already over.')] });
        }

        // Host cannot enter their own giveaway
        if (gw.host_id === interaction.user.id) {
            return interaction.editReply({ embeds: [errorEmbed('Hosts cannot enter their own rituals.')] });
        }

        // ─── Requirement checks (only on join, not on withdraw) ───
        const already = hasEntry.get(giveawayId, interaction.user.id);
        if (!already && gw.requirement === 'rep') {
            // Check if user has /blvck0ut or .gg/blvck0ut in their custom status
            const member = interaction.member || await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
            const presence = member?.presence;
            const customStatus = presence?.activities?.find(a => a.type === 4); // Type 4 = Custom Status
            const statusText = (customStatus?.state || '').toLowerCase();
            const hasRep = statusText.includes('/blvck0ut') || statusText.includes('.gg/blvck0ut') || statusText.includes('blvck0ut');
            if (!hasRep) {
                return interaction.editReply({ embeds: [errorEmbed('You need `/blvck0ut` or `.gg/blvck0ut` in your status to enter this giveaway.')] });
            }
        }

        if (!already && gw.requirement === 'invites') {
            // Check if user has at least 1 invite
            try {
                const invites = await interaction.guild.invites.fetch();
                const userInvites = invites.filter(i => i.inviterId === interaction.user.id);
                const totalUses = userInvites.reduce((sum, inv) => sum + (inv.uses || 0), 0);
                if (totalUses < 1) {
                    return interaction.editReply({ embeds: [errorEmbed('You need at least **1** server invite to enter this giveaway.')] });
                }
            } catch {
                return interaction.editReply({ embeds: [errorEmbed('Could not verify your invites. Try again later.')] });
            }
        }

        // Toggle entry
        let message;
        if (already) {
            removeEntry.run(giveawayId, interaction.user.id);
            message = successEmbed(
                `${theme.emojis.coffin} Entry withdrawn`,
                `You have stepped away from the ritual for **${gw.prize}**.`,
            );
        } else {
            insertEntry.run(giveawayId, interaction.user.id);
            const total = countEntries.get(giveawayId)?.n ?? 0;
            message = successEmbed(
                `${theme.emojis.crystal} Entry sealed`,
                `You have joined the ritual for **${gw.prize}**.\n\n*You are entrant #${total}.*`,
            );
        }

        await interaction.editReply({ embeds: [message] });

        // Refresh the public message's entry count (don't block on it)
        refreshGiveawayMessage(interaction.client, giveawayId).catch(() => {});
    } catch (error) {
        logger.error(`Giveaway join error: ${error.message}`);
        const reply = { embeds: [errorEmbed('The ritual rejected your entry. Try again.')] };
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply(reply).catch(() => {});
        }
        return interaction.reply({ ...reply, ephemeral: true }).catch(() => {});
    }
}

// ─── Buy Select Menu Handler ───
async function handleBuySelect(interaction) {
    const buyCommand = interaction.client.commands.get('buy');
    if (!buyCommand?.handleSelect) return;

    try {
        await buyCommand.handleSelect(interaction);
    } catch (error) {
        logger.error(`Buy select error: ${error.message}`);
        const reply = { embeds: [errorEmbed('Something went wrong... the spirits are restless.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply).catch(() => {});
        } else {
            await interaction.reply(reply).catch(() => {});
        }
    }
}

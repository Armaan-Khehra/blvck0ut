const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const { snipeCache } = require('../../events/messageDelete');
const { editSnipeCache } = require('../../events/messageUpdate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription(`${theme.emojis.dagger} Resurrect the last deleted or edited message`)
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('What to snipe')
                .addChoices(
                    { name: 'deleted', value: 'delete' },
                    { name: 'edited', value: 'edit' },
                )
        ),

    async execute(interaction) {
        const type = interaction.options.getString('type');

        // If a specific type is chosen, only check that cache
        if (type === 'edit') {
            return replyEdit(interaction);
        }
        if (type === 'delete') {
            return replyDelete(interaction);
        }

        // No type specified — show whichever is more recent
        const deleted = snipeCache.get(interaction.channel.id);
        const edited = editSnipeCache.get(interaction.channel.id);

        if (!deleted && !edited) {
            return interaction.reply({
                embeds: [errorEmbed('Nothing to snipe... the void is empty.')],
                ephemeral: true,
            });
        }

        if (!deleted) return replyEdit(interaction);
        if (!edited) return replyDelete(interaction);

        // Both exist — show the more recent one
        if (edited.timestamp > deleted.timestamp) {
            return replyEdit(interaction);
        }
        return replyDelete(interaction);
    },
};

function replyDelete(interaction) {
    const data = snipeCache.get(interaction.channel.id);

    if (!data) {
        return interaction.reply({
            embeds: [errorEmbed('No deleted messages to snipe... the void is empty.')],
            ephemeral: true,
        });
    }

    const embed = createEmbed({
        title: `${theme.emojis.dagger} Sniped`,
        thumbnail: theme.gifs.snipe,
        description: data.content || '*No text content*',
        color: theme.colors.primary,
    });

    embed.setAuthor({
        name: data.author.tag,
        iconURL: data.author.displayAvatarURL,
    });

    embed.setFooter({
        text: `${theme.footer} • deleted`,
    });

    if (data.attachments.length > 0) {
        embed.setImage(data.attachments[0]);
    }

    return interaction.reply({ embeds: [embed] });
}

function replyEdit(interaction) {
    const data = editSnipeCache.get(interaction.channel.id);

    if (!data) {
        return interaction.reply({
            embeds: [errorEmbed('No edited messages to snipe... the void is empty.')],
            ephemeral: true,
        });
    }

    const embed = createEmbed({
        title: `${theme.emojis.dagger} Sniped Edit`,
        thumbnail: theme.gifs.snipe,
        description: [
            `**Before:**\n${data.content || '*No text content*'}`,
            `**After:**\n${data.newContent || '*No text content*'}`,
        ].join('\n\n'),
        color: theme.colors.primary,
    });

    embed.setAuthor({
        name: data.author.tag,
        iconURL: data.author.displayAvatarURL,
    });

    embed.setFooter({
        text: `${theme.footer} • edited`,
    });

    if (data.attachments.length > 0) {
        embed.setImage(data.attachments[0]);
    }

    return interaction.reply({ embeds: [embed] });
}

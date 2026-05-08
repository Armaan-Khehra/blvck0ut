const { SlashCommandBuilder, PermissionFlagsBits, AutoModerationRuleTriggerType, AutoModerationRuleEventType, AutoModerationActionType } = require('discord.js');
const { createEmbed, successEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');
const db = require('../../data/database');
const { sendLog } = require('../../utils/channelLog');

const addWord = db.prepare('INSERT OR IGNORE INTO word_filter (guild_id, word, added_by) VALUES (?, ?, ?)');
const removeWord = db.prepare('DELETE FROM word_filter WHERE guild_id = ? AND word = ?');
const getWords = db.prepare('SELECT word FROM word_filter WHERE guild_id = ?');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription(`${theme.emojis.spider} Govern the dark ward's forbidden words`)
        .addSubcommand(sub =>
            sub.setName('add').setDescription('Add a forbidden word')
                .addStringOption(opt => opt.setName('word').setDescription('The forbidden word').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('remove').setDescription('Remove a forbidden word')
                .addStringOption(opt => opt.setName('word').setDescription('The word to unban').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('list').setDescription('View all forbidden words'))
        .addSubcommand(sub =>
            sub.setName('sync').setDescription('Push word filter to Discord AutoMod'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'add') {
            const word = interaction.options.getString('word').toLowerCase();
            addWord.run(interaction.guild.id, word, interaction.user.id);

            sendLog(interaction.client, {
                title: `${theme.emojis.spider} Automod Word Added`,
                description: `A word was added to the dark ward.`,
                color: theme.colors.success,
                fields: [
                    { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: `${theme.emojis.chain} Word`, value: `\`${word}\``, inline: true },
                ],
            });

            await interaction.reply({
                embeds: [successEmbed(`${theme.emojis.spider} Word forbidden`, `**${word}** has been added to the dark ward.`, theme.gifs.automod)],
                ephemeral: true,
            });
        } else if (sub === 'remove') {
            const word = interaction.options.getString('word').toLowerCase();
            const result = removeWord.run(interaction.guild.id, word);
            if (result.changes === 0) {
                return interaction.reply({ embeds: [errorEmbed('That word was never forbidden.')], ephemeral: true });
            }

            sendLog(interaction.client, {
                title: `${theme.emojis.moon} Automod Word Removed`,
                description: `A word was freed from the dark ward.`,
                color: theme.colors.success,
                fields: [
                    { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: `${theme.emojis.chain} Word`, value: `\`${word}\``, inline: true },
                ],
            });

            await interaction.reply({
                embeds: [successEmbed(`${theme.emojis.moon} Word released`, `**${word}** has been freed from the dark ward.`, theme.gifs.automod)],
                ephemeral: true,
            });
        } else if (sub === 'list') {
            const words = getWords.all(interaction.guild.id);
            if (words.length === 0) {
                return interaction.reply({ embeds: [createEmbed({ title: `${theme.emojis.spider} Dark Ward`, description: 'No words are forbidden... yet.' })], ephemeral: true });
            }
            const list = words.map(w => `\`${w.word}\``).join(', ');
            await interaction.reply({
                embeds: [createEmbed({ title: `${theme.emojis.spider} Forbidden Words`, description: list, thumbnail: theme.gifs.automod })],
                ephemeral: true,
            });
        } else if (sub === 'sync') {
            await interaction.deferReply({ ephemeral: true });
            const words = getWords.all(interaction.guild.id).map(w => w.word);

            if (words.length === 0) {
                return interaction.editReply({ embeds: [errorEmbed('No words to sync. Add some first.')] });
            }

            // Remove existing blvck0ut automod rule if it exists
            const existingRules = await interaction.guild.autoModerationRules.fetch();
            const existing = existingRules.find(r => r.name === 'blvck0ut word filter');
            if (existing) await existing.delete();

            await interaction.guild.autoModerationRules.create({
                name: 'blvck0ut word filter',
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.Keyword,
                triggerMetadata: { keywordFilter: words },
                actions: [{ type: AutoModerationActionType.BlockMessage, metadata: { customMessage: 'The dark ward has blocked your message.' } }],
                enabled: true,
            });

            sendLog(interaction.client, {
                title: `${theme.emojis.spider} Automod Synced`,
                description: `Word filter synced to Discord AutoMod.`,
                color: theme.colors.success,
                fields: [
                    { name: `${theme.emojis.dagger} Moderator`, value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: `${theme.emojis.fire} Words Synced`, value: `${words.length}`, inline: true },
                ],
            });

            await interaction.editReply({
                embeds: [successEmbed(`${theme.emojis.spider} Ward synced`, `**${words.length}** forbidden words pushed to Discord AutoMod.`, theme.gifs.automod)],
            });
        }
    },
};

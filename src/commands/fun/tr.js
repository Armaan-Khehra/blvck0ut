const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const theme = require('../../utils/theme');

// Dynamic import for ESM module
let translate;
async function getTranslate() {
    if (!translate) {
        const mod = await import('google-translate-api-x');
        translate = mod.default || mod;
    }
    return translate;
}

// ─── Common language shortcuts ───
const LANG_ALIASES = {
    en: 'en', eng: 'en', english: 'en',
    es: 'es', esp: 'es', spanish: 'es',
    fr: 'fr', french: 'fr',
    de: 'de', german: 'de',
    it: 'it', italian: 'it',
    pt: 'pt', portuguese: 'pt',
    ru: 'ru', russian: 'ru',
    ja: 'ja', jp: 'ja', japanese: 'ja',
    ko: 'ko', kr: 'ko', korean: 'ko',
    zh: 'zh-CN', cn: 'zh-CN', chinese: 'zh-CN',
    ar: 'ar', arabic: 'ar',
    hi: 'hi', hindi: 'hi',
    tr: 'tr', turkish: 'tr',
    pl: 'pl', polish: 'pl',
    nl: 'nl', dutch: 'nl',
    sv: 'sv', swedish: 'sv',
    da: 'da', danish: 'da',
    fi: 'fi', finnish: 'fi',
    no: 'no', norwegian: 'no',
    uk: 'uk', ukrainian: 'uk',
    th: 'th', thai: 'th',
    vi: 'vi', vietnamese: 'vi',
    id: 'id', indonesian: 'id',
    ms: 'ms', malay: 'ms',
    tl: 'tl', fil: 'tl', filipino: 'tl', tagalog: 'tl',
    ro: 'ro', romanian: 'ro',
    hu: 'hu', hungarian: 'hu',
    cs: 'cs', czech: 'cs',
    el: 'el', greek: 'el',
    he: 'he', hebrew: 'he',
    bn: 'bn', bengali: 'bn',
    ur: 'ur', urdu: 'ur',
    pa: 'pa', punjabi: 'pa',
    ta: 'ta', tamil: 'ta',
    te: 'te', telugu: 'te',
    mr: 'mr', marathi: 'mr',
    gu: 'gu', gujarati: 'gu',
    fa: 'fa', persian: 'fa', farsi: 'fa',
    sw: 'sw', swahili: 'sw',
    af: 'af', afrikaans: 'af',
};

// ─── Language display names ───
const LANG_NAMES = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
    pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', 'zh-CN': 'Chinese',
    ar: 'Arabic', hi: 'Hindi', tr: 'Turkish', pl: 'Polish', nl: 'Dutch',
    sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', uk: 'Ukrainian',
    th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay', tl: 'Filipino',
    ro: 'Romanian', hu: 'Hungarian', cs: 'Czech', el: 'Greek', he: 'Hebrew',
    bn: 'Bengali', ur: 'Urdu', pa: 'Punjabi', ta: 'Tamil', te: 'Telugu',
    mr: 'Marathi', gu: 'Gujarati', fa: 'Persian', sw: 'Swahili', af: 'Afrikaans',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tr')
        .setDescription('🌐 Translate a message')
        .addStringOption(opt => opt.setName('language').setDescription('Target language (default: english)')),

    async execute(interaction) {
        // Get text from replied message
        let text = null;
        if (interaction._prefixReplyData) {
            text = interaction._prefixReplyData.text;
        }

        if (!text) {
            return interaction.reply({
                embeds: [errorEmbed('Reply to a message with `-tr` to translate it.\n\n`-tr` — translate to English\n`-tr spanish` — translate to Spanish\n`-tr ja` — translate to Japanese')],
            });
        }

        // Language: default to English if not specified
        const langInput = interaction.options.getString('language')?.toLowerCase().trim() || 'en';
        const langCode = LANG_ALIASES[langInput] || langInput;
        const langName = LANG_NAMES[langCode] || langCode;

        // Limit text length
        if (text.length > 1000) {
            text = text.substring(0, 1000) + '...';
        }

        try {
            const tr = await getTranslate();
            const result = await tr(text, { to: langCode });

            const fromLang = LANG_NAMES[result.from.language.iso] || result.from.language.iso;

            // If source and target are the same, let the user know
            if (result.from.language.iso === langCode && result.text === text) {
                return interaction.reply({ content: `🌐 That message is already in **${langName}**!` });
            }

            return interaction.reply({ content: result.text });
        } catch (err) {
            if (err.message?.includes('not supported')) {
                return interaction.reply({
                    embeds: [errorEmbed(`\`${langInput}\` is not a supported language.\n\nTry: \`en\`, \`es\`, \`fr\`, \`de\`, \`ja\`, \`ko\`, \`ar\`, \`hi\`, \`ru\`, \`zh\``)],
                });
            }
            return interaction.reply({
                embeds: [errorEmbed('Translation failed. Try again later.')],
            });
        }
    },
};

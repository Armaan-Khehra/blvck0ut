// ─── Hunt Item Definitions ───
// Random items that drop during hunts. Gothic themed weapons, rings, gems, etc.
// Each item has a rarity, sell value, emoji, and stat bonuses for battle equipment.

const ITEM_RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const ITEM_RARITY_CONFIG = {
    common:    { label: 'Common',    color: 0x808080 },
    uncommon:  { label: 'Uncommon',  color: 0x2e7d32 },
    rare:      { label: 'Rare',      color: 0x1565c0 },
    epic:      { label: 'Epic',      color: 0x6a0dad },
    legendary: { label: 'Legendary', color: 0xd4af37 },
};

// Drop chance per hunt (overall chance to get ANY item)
const ITEM_DROP_CHANCE = 0.12; // 12% per hunt

// If an item drops, which rarity?
const ITEM_RARITY_WEIGHTS = {
    common:    0.45,
    uncommon:  0.30,
    rare:      0.15,
    epic:      0.08,
    legendary: 0.02,
};

const HUNT_ITEMS = {
    // ─── COMMON ───
    rusty_dagger: {
        id: 'rusty_dagger',
        name: 'Rusty Dagger',
        emoji: '🗡️',
        type: 'weapon',
        rarity: 'common',
        sellMin: 15, sellMax: 40,
        atk_bonus: 4, def_bonus: 0, hp_bonus: 0,
        description: 'A corroded blade found in a shallow grave.',
    },
    bone_club: {
        id: 'bone_club',
        name: 'Bone Club',
        emoji: '🦴',
        type: 'weapon',
        rarity: 'common',
        sellMin: 15, sellMax: 40,
        atk_bonus: 3, def_bonus: 0, hp_bonus: 0,
        description: 'A femur repurposed as a blunt weapon.',
    },
    tattered_cloak: {
        id: 'tattered_cloak',
        name: 'Tattered Cloak',
        emoji: '🧥',
        type: 'armor',
        rarity: 'common',
        sellMin: 10, sellMax: 30,
        atk_bonus: 0, def_bonus: 3, hp_bonus: 2,
        description: 'Moth-eaten fabric that still reeks of the crypt.',
    },
    cracked_ring: {
        id: 'cracked_ring',
        name: 'Cracked Ring',
        emoji: '💍',
        type: 'ring',
        rarity: 'common',
        sellMin: 20, sellMax: 50,
        atk_bonus: 2, def_bonus: 2, hp_bonus: 0,
        description: 'A tarnished ring with a barely visible inscription.',
    },

    // ─── UNCOMMON ───
    silver_crossbow: {
        id: 'silver_crossbow',
        name: 'Silver Crossbow',
        emoji: '🏹',
        type: 'weapon',
        rarity: 'uncommon',
        sellMin: 60, sellMax: 120,
        atk_bonus: 8, def_bonus: 0, hp_bonus: 0,
        description: 'Fires blessed bolts that burn the undead.',
    },
    shadow_amulet: {
        id: 'shadow_amulet',
        name: 'Shadow Amulet',
        emoji: '📿',
        type: 'ring',
        rarity: 'uncommon',
        sellMin: 80, sellMax: 150,
        atk_bonus: 4, def_bonus: 4, hp_bonus: 0,
        description: 'Whispers dark secrets when worn at midnight.',
    },
    venom_vial: {
        id: 'venom_vial',
        name: 'Venom Vial',
        emoji: '🧪',
        type: 'gem',
        rarity: 'uncommon',
        sellMin: 50, sellMax: 100,
        atk_bonus: 0, def_bonus: 0, hp_bonus: 8,
        description: 'Extracted from a Plaguebearer\'s veins.',
    },
    iron_gauntlet: {
        id: 'iron_gauntlet',
        name: 'Iron Gauntlet',
        emoji: '🧤',
        type: 'armor',
        rarity: 'uncommon',
        sellMin: 70, sellMax: 130,
        atk_bonus: 0, def_bonus: 7, hp_bonus: 4,
        description: 'Heavy plate that still has dried blood on the knuckles.',
    },

    // ─── RARE ───
    cursed_blade: {
        id: 'cursed_blade',
        name: 'Cursed Blade',
        emoji: '⚔️',
        type: 'weapon',
        rarity: 'rare',
        sellMin: 200, sellMax: 400,
        atk_bonus: 15, def_bonus: 0, hp_bonus: 0,
        description: 'The edge hums with dark energy. It hungers.',
    },
    bloodstone: {
        id: 'bloodstone',
        name: 'Bloodstone',
        emoji: '🔴',
        type: 'gem',
        rarity: 'rare',
        sellMin: 250, sellMax: 500,
        atk_bonus: 0, def_bonus: 0, hp_bonus: 15,
        description: 'A crimson gem that pulses like a heartbeat.',
    },
    wraith_ring: {
        id: 'wraith_ring',
        name: 'Wraith Ring',
        emoji: '💎',
        type: 'ring',
        rarity: 'rare',
        sellMin: 300, sellMax: 550,
        atk_bonus: 7, def_bonus: 7, hp_bonus: 0,
        description: 'Phase through walls... but only once.',
    },

    // ─── EPIC ───
    soulreaver: {
        id: 'soulreaver',
        name: 'Soulreaver',
        emoji: '🔮',
        type: 'weapon',
        rarity: 'epic',
        sellMin: 800, sellMax: 1500,
        atk_bonus: 25, def_bonus: 0, hp_bonus: 0,
        description: 'A scythe that harvests the essence of the fallen.',
    },
    nightfall_gem: {
        id: 'nightfall_gem',
        name: 'Nightfall Gem',
        emoji: '🌑',
        type: 'gem',
        rarity: 'epic',
        sellMin: 1000, sellMax: 2000,
        atk_bonus: 0, def_bonus: 0, hp_bonus: 25,
        description: 'Contains a fragment of eternal darkness.',
    },
    vampiric_signet: {
        id: 'vampiric_signet',
        name: 'Vampiric Signet',
        emoji: '🩸',
        type: 'ring',
        rarity: 'epic',
        sellMin: 900, sellMax: 1800,
        atk_bonus: 12, def_bonus: 12, hp_bonus: 0,
        description: 'Bearing the crest of the Blood Queen herself.',
    },

    // ─── LEGENDARY ───
    voidedge: {
        id: 'voidedge',
        name: 'Voidedge',
        emoji: '⚡',
        type: 'weapon',
        rarity: 'legendary',
        sellMin: 3000, sellMax: 6000,
        atk_bonus: 45, def_bonus: 0, hp_bonus: 0,
        description: 'Forged in the space between dimensions. Reality bends around it.',
    },
    crown_of_the_damned: {
        id: 'crown_of_the_damned',
        name: 'Crown of the Damned',
        emoji: '👑',
        type: 'armor',
        rarity: 'legendary',
        sellMin: 4000, sellMax: 8000,
        atk_bonus: 0, def_bonus: 35, hp_bonus: 20,
        description: 'Worn by the last king before the darkness consumed everything.',
    },
};

function getItemsByRarity(rarity) {
    return Object.values(HUNT_ITEMS).filter(i => i.rarity === rarity);
}

function findItemByName(name) {
    const lower = name.toLowerCase().trim();
    if (HUNT_ITEMS[lower]) return HUNT_ITEMS[lower];
    return Object.values(HUNT_ITEMS).find(i => i.name.toLowerCase() === lower) || null;
}

module.exports = {
    HUNT_ITEMS,
    ITEM_RARITY_ORDER,
    ITEM_RARITY_CONFIG,
    ITEM_DROP_CHANCE,
    ITEM_RARITY_WEIGHTS,
    getItemsByRarity,
    findItemByName,
};

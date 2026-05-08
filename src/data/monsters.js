// ─── Monster Definitions & Rarity Configuration ───
// Each monster is a mutated human / dark creature for the gothic hunting game.
// Emojis are loaded dynamically from monster-emojis.json (uploaded to server by bot).

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const RARITY_CONFIG = {
    common:    { label: 'Common',    emoji: '⚪', color: 0x808080, stars: '⭐' },
    uncommon:  { label: 'Uncommon',  emoji: '🟢', color: 0x2e7d32, stars: '⭐⭐' },
    rare:      { label: 'Rare',      emoji: '🔵', color: 0x1565c0, stars: '⭐⭐⭐' },
    epic:      { label: 'Epic',      emoji: '🟣', color: 0x6a0dad, stars: '⭐⭐⭐⭐' },
    legendary: { label: 'Legendary', emoji: '🟡', color: 0xd4af37, stars: '⭐⭐⭐⭐⭐' },
};

const SPAWN_WEIGHTS = {
    common:    0.50,
    uncommon:  0.30,
    rare:      0.13,
    epic:      0.055,
    legendary: 0.015,
};

const CATCH_RATES = {
    common:    1.0,
    uncommon:  0.85,
    rare:      0.50,
    epic:      0.25,
    legendary: 0.10,
};

// ─── Monster Roster ───
// emoji field will be replaced at runtime by monsterEmojis.js
// fallback is a unicode emoji if custom isn't loaded yet

const MONSTERS = {
    // ─── COMMON (50% spawn, 100% catch) ─── 10 species
    ghoul: {
        id: 'ghoul',
        name: 'Ghoul',
        fallbackEmoji: '🧟',
        rarity: 'common',
        description: 'A shambling corpse that feeds on the recently dead.',
        hp: 30, attack: 8, defense: 5,
        sellMin: 10, sellMax: 30,
        flavorText: [
            'A rotting figure crawls from a shallow grave...',
            'You hear gnawing sounds from behind a tombstone...',
            'Something with hollow eyes stumbles toward you...',
        ],
    },
    plaguebearer: {
        id: 'plaguebearer',
        name: 'Plaguebearer',
        fallbackEmoji: '🦠',
        rarity: 'common',
        description: 'A walking pestilence wrapped in tattered rags.',
        hp: 25, attack: 6, defense: 8,
        sellMin: 10, sellMax: 30,
        flavorText: [
            'The air turns foul as a cloaked figure approaches...',
            'Flies swarm around a figure draped in boils and rot...',
            'A wheezing shape emerges from the fog, dripping with disease...',
        ],
    },
    husk: {
        id: 'husk',
        name: 'Husk',
        fallbackEmoji: '💀',
        rarity: 'common',
        description: 'An empty shell of a person, animated by residual dark energy.',
        hp: 20, attack: 5, defense: 10,
        sellMin: 10, sellMax: 30,
        flavorText: [
            'A hollow figure with no eyes stares blankly at you...',
            'Dry bones rattle as something rises from the dirt...',
            'A withered form drags itself across the cobblestones...',
        ],
    },
    thrall: {
        id: 'thrall',
        name: 'Thrall',
        fallbackEmoji: '🚶',
        rarity: 'common',
        description: 'A mind-broken servant of a greater vampire, barely human.',
        hp: 28, attack: 7, defense: 6,
        sellMin: 10, sellMax: 30,
        flavorText: [
            'A blank-eyed figure shuffles toward you, muttering its master\'s name...',
            'Someone with bite marks covering their neck lurches from the shadows...',
            'A pale servant wanders aimlessly, strings of drool hanging from its mouth...',
        ],
    },
    corpsefly: {
        id: 'corpsefly',
        name: 'Corpsefly',
        fallbackEmoji: '🪰',
        rarity: 'common',
        description: 'A bloated insect that nests inside the dead and bursts from their mouths.',
        hp: 18, attack: 9, defense: 3,
        sellMin: 10, sellMax: 30,
        flavorText: [
            'A buzzing swarm erupts from a pile of old bones...',
            'Something fat and glistening crawls out of a corpse\'s ear...',
            'The air hums with the sound of a thousand tiny wings...',
        ],
    },
    rotling: {
        id: 'rotling',
        name: 'Rotling',
        fallbackEmoji: '🍄',
        rarity: 'common',
        description: 'A fungal growth that sprouted legs and a hunger for flesh.',
        hp: 22, attack: 4, defense: 12,
        sellMin: 10, sellMax: 30,
        flavorText: [
            'Mushrooms burst from the wall and begin crawling toward you...',
            'A wet, squelching sound grows louder behind you...',
            'Spores cloud the air as something fungal lurches from a crack in the stone...',
        ],
    },
    ashwalker: {
        id: 'ashwalker',
        name: 'Ashwalker',
        fallbackEmoji: '🌫️',
        rarity: 'common',
        description: 'The burnt remnant of a witch, still smoldering centuries later.',
        hp: 24, attack: 10, defense: 4,
        sellMin: 10, sellMax: 30,
        flavorText: [
            'Embers float in the air as a charred figure stumbles forward...',
            'The smell of burnt hair fills the corridor...',
            'A trail of ash leads to something still glowing in the dark...',
        ],
    },
    bonerat: {
        id: 'bonerat',
        name: 'Bone Rat',
        fallbackEmoji: '🐀',
        rarity: 'common',
        description: 'A skeletal rodent the size of a dog. It hunts in packs.',
        hp: 15, attack: 7, defense: 6,
        sellMin: 10, sellMax: 30,
        flavorText: [
            'Tiny claws scrape across stone as dozens of red eyes appear...',
            'A rat made of nothing but bone and malice scurries toward you...',
            'You feel something gnawing at your boot...',
        ],
    },
    cryptmaw: {
        id: 'cryptmaw',
        name: 'Cryptmaw',
        fallbackEmoji: '🕳️',
        rarity: 'common',
        description: 'A mouth in the ground that swallows the unwary whole.',
        hp: 35, attack: 3, defense: 8,
        sellMin: 10, sellMax: 30,
        flavorText: [
            'The floor opens like a wound, revealing rows of teeth...',
            'You almost stepped into it... the ground itself is hungry...',
            'A low gurgling rises from a pit lined with jagged bone...',
        ],
    },
    hollowborn: {
        id: 'hollowborn',
        name: 'Hollowborn',
        fallbackEmoji: '👤',
        rarity: 'common',
        description: 'A child that was never alive, wandering the crypts in search of a soul.',
        hp: 20, attack: 6, defense: 9,
        sellMin: 10, sellMax: 30,
        flavorText: [
            'A small figure stands in the corner, humming a lullaby backwards...',
            'Tiny footprints in the dust lead to a shadow that shouldn\'t be there...',
            'It reaches for your hand with fingers cold as the grave...',
        ],
    },

    // ─── UNCOMMON (30% spawn, 85% catch) ─── 10 species
    wraith: {
        id: 'wraith',
        name: 'Wraith',
        fallbackEmoji: '👻',
        rarity: 'uncommon',
        description: 'A tormented spirit bound between worlds, seething with hatred.',
        hp: 40, attack: 14, defense: 8,
        sellMin: 40, sellMax: 80,
        flavorText: [
            'The temperature plummets as a translucent figure phases through a wall...',
            'A wailing scream echoes through the crypt as a spirit materializes...',
            'Cold fingers brush your neck... something is right behind you...',
        ],
    },
    gravecrawler: {
        id: 'gravecrawler',
        name: 'Gravecrawler',
        fallbackEmoji: '🕷️',
        rarity: 'uncommon',
        description: 'A human fused with arachnid flesh, skittering through the crypts.',
        hp: 35, attack: 12, defense: 12,
        sellMin: 40, sellMax: 80,
        flavorText: [
            'Eight legs scrape against stone as something descends from the ceiling...',
            'Webs thick as rope span the corridor... something is watching...',
            'A chitinous shape with a human face scuttles from the darkness...',
        ],
    },
    nightstalker: {
        id: 'nightstalker',
        name: 'Nightstalker',
        fallbackEmoji: '🦇',
        rarity: 'uncommon',
        description: 'A half-bat creature that hunts by echolocation in total darkness.',
        hp: 32, attack: 16, defense: 6,
        sellMin: 40, sellMax: 80,
        flavorText: [
            'Leathery wings beat in the darkness above you...',
            'A piercing shriek bounces off the walls as something dives...',
            'Two glowing red eyes blink open in the rafters...',
        ],
    },
    bonewitch: {
        id: 'bonewitch',
        name: 'Bone Witch',
        fallbackEmoji: '🧙',
        rarity: 'uncommon',
        description: 'A cursed sorceress who commands an army of skeletal minions.',
        hp: 30, attack: 18, defense: 5,
        sellMin: 40, sellMax: 80,
        flavorText: [
            'The ground cracks open as skeletal hands claw upward at her command...',
            'A cackling voice echoes from a circle of burning candles...',
            'Bones rearrange themselves mid-air, orbiting a floating woman...',
        ],
    },
    skinwearer: {
        id: 'skinwearer',
        name: 'Skinwearer',
        fallbackEmoji: '🎭',
        rarity: 'uncommon',
        description: 'It wears the faces of its victims. You might recognize the latest one.',
        hp: 38, attack: 15, defense: 9,
        sellMin: 40, sellMax: 80,
        flavorText: [
            'A figure waves at you... wearing your friend\'s face...',
            'Something peels back its own skin, revealing another face beneath...',
            'It smiles with a mouth that doesn\'t fit its skull...',
        ],
    },
    marrowfiend: {
        id: 'marrowfiend',
        name: 'Marrowfiend',
        fallbackEmoji: '🦴',
        rarity: 'uncommon',
        description: 'A skeletal predator that cracks bones to drink the marrow within.',
        hp: 42, attack: 13, defense: 10,
        sellMin: 40, sellMax: 80,
        flavorText: [
            'A cracking sound echoes as it snaps a femur between its jaws...',
            'Bones crunch beneath something heavy in the corridor ahead...',
            'A skeleton with too many arms drags itself from a pile of remains...',
        ],
    },
    soulleech: {
        id: 'soulleech',
        name: 'Soul Leech',
        fallbackEmoji: '🫧',
        rarity: 'uncommon',
        description: 'A translucent parasite that feeds on life energy and willpower.',
        hp: 28, attack: 19, defense: 5,
        sellMin: 40, sellMax: 80,
        flavorText: [
            'Something invisible latches onto your arm... you feel your strength draining...',
            'A faint shimmer in the air wraps itself around a rat, which instantly drops dead...',
            'Your vision blurs as something feeds on the edges of your consciousness...',
        ],
    },
    tombguard: {
        id: 'tombguard',
        name: 'Tomb Guard',
        fallbackEmoji: '🛡️',
        rarity: 'uncommon',
        description: 'An animated suit of armor, forever protecting a tomb that holds nothing.',
        hp: 50, attack: 8, defense: 18,
        sellMin: 40, sellMax: 80,
        flavorText: [
            'A rusted suit of armor turns its empty helmet toward you...',
            'Metal scrapes against stone as a headless guardian blocks the path...',
            'It has been standing here for centuries. It will not let you pass...',
        ],
    },
    duskwolf: {
        id: 'duskwolf',
        name: 'Duskwolf',
        fallbackEmoji: '🐺',
        rarity: 'uncommon',
        description: 'A spectral wolf that hunts between twilight and total darkness.',
        hp: 36, attack: 17, defense: 7,
        sellMin: 40, sellMax: 80,
        flavorText: [
            'A howl tears through the silence... but there is no moon tonight...',
            'Glowing paw prints appear in the dust, leading directly toward you...',
            'Two pale eyes track your every movement from the treeline...',
        ],
    },
    mirefang: {
        id: 'mirefang',
        name: 'Mirefang',
        fallbackEmoji: '🐍',
        rarity: 'uncommon',
        description: 'A venomous serpent that nests in mass graves and feeds on rot.',
        hp: 30, attack: 20, defense: 4,
        sellMin: 40, sellMax: 80,
        flavorText: [
            'Something slithers through the bones at your feet...',
            'A forked tongue flicks from a skull, tasting the air...',
            'Venom drips from fangs that glow a sickly green in the dark...',
        ],
    },

    // ─── RARE (13% spawn, 50% catch) ─── 8 species
    banshee: {
        id: 'banshee',
        name: 'Banshee',
        fallbackEmoji: '😱',
        rarity: 'rare',
        description: 'Her scream can shatter glass and stop hearts.',
        hp: 50, attack: 22, defense: 10,
        sellMin: 100, sellMax: 200,
        flavorText: [
            'A piercing wail shatters the silence... your ears begin to bleed...',
            'A pale woman in a tattered gown opens her mouth impossibly wide...',
            'Glass explodes around you as an unearthly shriek fills the air...',
        ],
    },
    fleshweaver: {
        id: 'fleshweaver',
        name: 'Fleshweaver',
        fallbackEmoji: '🦷',
        rarity: 'rare',
        description: 'A mad surgeon who stitches the living and dead together.',
        hp: 55, attack: 18, defense: 16,
        sellMin: 100, sellMax: 200,
        flavorText: [
            'The stench of formaldehyde and something worse fills the room...',
            'A figure hunched over a table turns... its arms are not its own...',
            'Surgical instruments float in the air, guided by bloodstained hands...',
        ],
    },
    revenant: {
        id: 'revenant',
        name: 'Revenant',
        fallbackEmoji: '⚰️',
        rarity: 'rare',
        description: 'Returned from death with a singular purpose: vengeance.',
        hp: 60, attack: 20, defense: 14,
        sellMin: 100, sellMax: 200,
        flavorText: [
            'A coffin lid explodes outward as something claws its way free...',
            'A figure in funeral attire rises, eyes burning with unfulfilled rage...',
            'The grave was meant to be permanent. It wasn\'t...',
        ],
    },
    shadowfiend: {
        id: 'shadowfiend',
        name: 'Shadowfiend',
        fallbackEmoji: '🌑',
        rarity: 'rare',
        description: 'A creature made entirely of living shadow that devours light.',
        hp: 45, attack: 25, defense: 10,
        sellMin: 100, sellMax: 200,
        flavorText: [
            'Every torch in the corridor extinguishes simultaneously...',
            'Your own shadow detaches from the ground and lunges...',
            'A shape darker than darkness itself oozes from the walls...',
        ],
    },
    plaguedoctor: {
        id: 'plaguedoctor',
        name: 'Plague Doctor',
        fallbackEmoji: '🥼',
        rarity: 'rare',
        description: 'Once a healer, now a harbinger of disease who cures by killing.',
        hp: 48, attack: 24, defense: 12,
        sellMin: 100, sellMax: 200,
        flavorText: [
            'A beaked mask emerges from the green mist, empty eyes staring...',
            'The cure is worse than the disease. Far worse...',
            'Glass vials shatter at its feet, releasing something that eats flesh...',
        ],
    },
    nighthag: {
        id: 'nighthag',
        name: 'Night Hag',
        fallbackEmoji: '🧙‍♀️',
        rarity: 'rare',
        description: 'She sits on your chest while you sleep and drinks your nightmares.',
        hp: 52, attack: 21, defense: 13,
        sellMin: 100, sellMax: 200,
        flavorText: [
            'You wake up but cannot move... something is crouching on your ribs...',
            'A crooked smile floats in the darkness above your bed...',
            'She collects the screams of the sleeping in little glass jars...',
        ],
    },
    cryptwyrm: {
        id: 'cryptwyrm',
        name: 'Cryptwyrm',
        fallbackEmoji: '🐉',
        rarity: 'rare',
        description: 'A blind, serpentine dragon that nests in catacombs and breathes decay.',
        hp: 65, attack: 19, defense: 15,
        sellMin: 100, sellMax: 200,
        flavorText: [
            'The tunnel walls tremble as something massive coils in the deep...',
            'A breath of rot washes over you... something enormous is close...',
            'Scales scrape against ancient stone as a wyrm the color of bone slithers past...',
        ],
    },
    dreadweaver: {
        id: 'dreadweaver',
        name: 'Dreadweaver',
        fallbackEmoji: '🕸️',
        rarity: 'rare',
        description: 'A massive spider-like horror that weaves webs from human sinew.',
        hp: 55, attack: 23, defense: 11,
        sellMin: 100, sellMax: 200,
        flavorText: [
            'Webs of pale sinew span the ceiling like a second sky...',
            'Something with far too many legs descends silently behind you...',
            'The web vibrates... you realize you are standing on it...',
        ],
    },

    // ─── EPIC (5.5% spawn, 25% catch) ─── 6 species
    nosferatu: {
        id: 'nosferatu',
        name: 'Nosferatu',
        fallbackEmoji: '🧛',
        rarity: 'epic',
        description: 'An ancient vampire, grotesque and powerful beyond measure.',
        hp: 80, attack: 30, defense: 20,
        sellMin: 300, sellMax: 600,
        flavorText: [
            'The air turns to ice as a gaunt figure with elongated fingers steps from the fog...',
            'Two pinpricks of crimson light appear in the darkness... then a grin of needle-sharp fangs...',
            'A voice older than the castle itself whispers your name...',
        ],
    },
    deathknight: {
        id: 'deathknight',
        name: 'Death Knight',
        fallbackEmoji: '⚔️',
        rarity: 'epic',
        description: 'A fallen paladin resurrected in unholy armor, wielding a cursed blade.',
        hp: 90, attack: 28, defense: 25,
        sellMin: 300, sellMax: 600,
        flavorText: [
            'Heavy iron boots echo through the hall as a figure in black plate approaches...',
            'A sword wreathed in dark flame points directly at you...',
            'The emblem of a forgotten holy order is carved into its chestplate, desecrated...',
        ],
    },
    abomination: {
        id: 'abomination',
        name: 'Abomination',
        fallbackEmoji: '🧌',
        rarity: 'epic',
        description: 'A massive creature stitched from dozens of corpses, barely contained.',
        hp: 120, attack: 22, defense: 28,
        sellMin: 300, sellMax: 600,
        flavorText: [
            'The ground shakes as something enormous rounds the corner...',
            'A wall of rotting flesh and mismatched limbs blocks your path...',
            'It speaks with twelve voices at once, begging for death...',
        ],
    },
    grimreaver: {
        id: 'grimreaver',
        name: 'Grim Reaver',
        fallbackEmoji: '⚰️',
        rarity: 'epic',
        description: 'A headless executioner who still swings his axe with perfect aim.',
        hp: 85, attack: 35, defense: 15,
        sellMin: 300, sellMax: 600,
        flavorText: [
            'An axe whistles through the air where your head just was...',
            'A headless body in executioner\'s robes marches toward the chopping block...',
            'It carries its head under one arm. The head is smiling...',
        ],
    },
    soulforger: {
        id: 'soulforger',
        name: 'Soulforger',
        fallbackEmoji: '🔥',
        rarity: 'epic',
        description: 'A demonic blacksmith who hammers screaming souls into weapons.',
        hp: 75, attack: 32, defense: 22,
        sellMin: 300, sellMax: 600,
        flavorText: [
            'The clang of a hammer on an anvil echoes from the depths... but the anvil is screaming...',
            'Molten metal runs like veins across a figure wreathed in dark flame...',
            'Every weapon on the wall has a face. They are all weeping...',
        ],
    },
    lichpriest: {
        id: 'lichpriest',
        name: 'Lich Priest',
        fallbackEmoji: '📖',
        rarity: 'epic',
        description: 'An undead cleric who speaks prayers that kill the living and raise the dead.',
        hp: 70, attack: 33, defense: 18,
        sellMin: 300, sellMax: 600,
        flavorText: [
            'Holy words spoken backwards echo through the cathedral of bone...',
            'A robed skeleton reads from a book bound in human skin...',
            'The ground beneath your feet begins to churn as the dead answer its prayer...',
        ],
    },

    // ─── LEGENDARY (1.5% spawn, 10% catch) ─── 5 species
    bloodqueen: {
        id: 'bloodqueen',
        name: 'Blood Queen',
        fallbackEmoji: '👑',
        rarity: 'legendary',
        description: 'The immortal sovereign of all vampires. She has ruled for millennia.',
        hp: 150, attack: 40, defense: 35,
        sellMin: 1000, sellMax: 2000,
        flavorText: [
            'The moon turns red as a figure descends from the highest tower...',
            'Every creature in the crypt bows as *she* enters the room...',
            'A crown of crystallized blood floats above a woman of impossible beauty and terror...',
        ],
    },
    voidreaper: {
        id: 'voidreaper',
        name: 'Void Reaper',
        fallbackEmoji: '💀',
        rarity: 'legendary',
        description: 'Death itself given form. It exists between dimensions.',
        hp: 130, attack: 45, defense: 30,
        sellMin: 1000, sellMax: 2000,
        flavorText: [
            'Reality tears open and something from beyond steps through...',
            'A scythe made of pure void energy materializes before you...',
            'Time itself seems to stop as an entity of absolute darkness manifests...',
        ],
    },
    archlich: {
        id: 'archlich',
        name: 'Archlich',
        fallbackEmoji: '☠️',
        rarity: 'legendary',
        description: 'A sorcerer who conquered death itself. His phylactery has never been found.',
        hp: 120, attack: 48, defense: 28,
        sellMin: 1000, sellMax: 2000,
        flavorText: [
            'The walls crack as raw necrotic energy floods the room...',
            'A figure in tattered robes hovers above a throne of skulls, eyes blazing with violet fire...',
            'Every corpse in the crypt rises simultaneously, bowing to their eternal master...',
        ],
    },
    demonlord: {
        id: 'demonlord',
        name: 'Demon Lord',
        fallbackEmoji: '😈',
        rarity: 'legendary',
        description: 'A prince of the lower realms, summoned by a ritual gone catastrophically right.',
        hp: 160, attack: 42, defense: 32,
        sellMin: 1000, sellMax: 2000,
        flavorText: [
            'The ground splits open and hellfire pours from the crack...',
            'A voice that is not one voice but thousands speaks your true name...',
            'The air itself burns as something ancient and terrible claws its way into this world...',
        ],
    },
    eternalwarden: {
        id: 'eternalwarden',
        name: 'Eternal Warden',
        fallbackEmoji: '🗿',
        rarity: 'legendary',
        description: 'The first guardian, carved from the bedrock of the world before time began.',
        hp: 200, attack: 30, defense: 50,
        sellMin: 1000, sellMax: 2000,
        flavorText: [
            'The mountain moves. You realize it was never a mountain...',
            'Stone eyes older than the stars open for the first time in aeons...',
            'It has stood here since before the darkness. It will stand here after...',
        ],
    },
};

// ─── Helper: get monsters by rarity ───
function getMonstersByRarity(rarity) {
    return Object.values(MONSTERS).filter(m => m.rarity === rarity);
}

// ─── Helper: get all monster IDs ───
function getAllMonsterIds() {
    return Object.keys(MONSTERS);
}

// ─── Helper: find monster by name (case-insensitive) ───
function findMonsterByName(name) {
    const lower = name.toLowerCase().trim();
    // Try exact id match first
    if (MONSTERS[lower]) return MONSTERS[lower];
    // Try name match
    return Object.values(MONSTERS).find(m => m.name.toLowerCase() === lower) || null;
}

module.exports = {
    MONSTERS,
    RARITY_ORDER,
    RARITY_CONFIG,
    SPAWN_WEIGHTS,
    CATCH_RATES,
    getMonstersByRarity,
    getAllMonsterIds,
    findMonsterByName,
};

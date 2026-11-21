// Shop catalog. Rendering for each item lives in client/src/Avatar.jsx (keyed by id).
// Items with price 0 are owned by everyone from the start.
export const SLOTS = ['background', 'shirt', 'hat', 'glasses', 'pet'];

export const SLOT_LABELS = {
  background: 'Backgrounds',
  shirt: 'Shirts',
  hat: 'Hats',
  glasses: 'Eyewear',
  pet: 'Pets',
};

export const RARITIES = {
  common: { label: 'Common', color: '#8a94a6' },
  rare: { label: 'Rare', color: '#3b82f6' },
  epic: { label: 'Epic', color: '#a855f7' },
  legendary: { label: 'Legendary', color: '#f59e0b' },
};

export const ITEMS = [
  // Backgrounds
  { id: 'bg_sky', slot: 'background', name: 'Clear Sky', price: 0, rarity: 'common' },
  { id: 'bg_sunset', slot: 'background', name: 'Sunset', price: 120, rarity: 'common' },
  { id: 'bg_library', slot: 'background', name: 'Library', price: 300, rarity: 'rare' },
  { id: 'bg_night', slot: 'background', name: 'Starry Night', price: 450, rarity: 'rare' },
  { id: 'bg_galaxy', slot: 'background', name: 'Galaxy', price: 1500, rarity: 'legendary' },

  // Shirts
  { id: 'shirt_tee', slot: 'shirt', name: 'Plain Tee', price: 0, rarity: 'common' },
  { id: 'shirt_stripes', slot: 'shirt', name: 'Striped Shirt', price: 80, rarity: 'common' },
  { id: 'shirt_hoodie', slot: 'shirt', name: 'Cozy Hoodie', price: 200, rarity: 'rare' },
  { id: 'shirt_labcoat', slot: 'shirt', name: 'Lab Coat', price: 350, rarity: 'rare' },
  { id: 'shirt_tux', slot: 'shirt', name: 'Tuxedo', price: 800, rarity: 'epic' },

  // Hats
  { id: 'hat_cap', slot: 'hat', name: 'Baseball Cap', price: 60, rarity: 'common' },
  { id: 'hat_beanie', slot: 'hat', name: 'Beanie', price: 90, rarity: 'common' },
  { id: 'hat_party', slot: 'hat', name: 'Party Hat', price: 150, rarity: 'rare' },
  { id: 'hat_grad', slot: 'hat', name: 'Graduation Cap', price: 500, rarity: 'epic' },
  { id: 'hat_wizard', slot: 'hat', name: 'Wizard Hat', price: 900, rarity: 'epic' },
  { id: 'hat_crown', slot: 'hat', name: 'Crown', price: 2500, rarity: 'legendary' },

  // Eyewear
  { id: 'glasses_round', slot: 'glasses', name: 'Round Glasses', price: 70, rarity: 'common' },
  { id: 'glasses_3d', slot: 'glasses', name: '3D Glasses', price: 180, rarity: 'rare' },
  { id: 'glasses_shades', slot: 'glasses', name: 'Cool Shades', price: 250, rarity: 'rare' },
  { id: 'glasses_monocle', slot: 'glasses', name: 'Monocle', price: 700, rarity: 'epic' },

  // Pets
  { id: 'pet_duck', slot: 'pet', name: 'Rubber Duck', price: 150, rarity: 'common' },
  { id: 'pet_cat', slot: 'pet', name: 'Study Cat', price: 400, rarity: 'rare' },
  { id: 'pet_owl', slot: 'pet', name: 'Wise Owl', price: 1000, rarity: 'epic' },
  { id: 'pet_dragon', slot: 'pet', name: 'Tiny Dragon', price: 2000, rarity: 'legendary' },
];

export const ITEMS_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const DEFAULT_EQUIPPED = { background: 'bg_sky', shirt: 'shirt_tee' };

export const SKIN_TONES = ['#f9d7b5', '#eebb8f', '#d39a6a', '#a86b42', '#7a4a2a', '#4f3020'];

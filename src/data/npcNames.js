/**
 * npcNames.js — Name pools for NPC identity generation
 *
 * ~100 first names and ~100 surnames for settler NPC generation.
 * Names are fantasy-flavored but grounded (no extreme high-fantasy).
 */

export const FIRST_NAMES = [
  // Male-coded
  'Aldric', 'Bram', 'Cael', 'Dorin', 'Edric', 'Finn', 'Garret', 'Holt',
  'Iver', 'Jorik', 'Kael', 'Leif', 'Marten', 'Nils', 'Oswin', 'Penn',
  'Rafe', 'Soren', 'Tomas', 'Ulric', 'Voss', 'Wren', 'Yorick', 'Zale',
  'Ansel', 'Beric', 'Corwin', 'Daven', 'Elric', 'Farren', 'Galen', 'Hale',
  'Jasper', 'Kellan', 'Loren', 'Moss', 'Nolan', 'Orrin', 'Pike', 'Rowan',
  'Silas', 'Thane', 'Vale', 'Ward',
  // Female-coded
  'Ada', 'Brynn', 'Calla', 'Denna', 'Elara', 'Freya', 'Gwyn', 'Hana',
  'Iris', 'Jessa', 'Kira', 'Lira', 'Maren', 'Nessa', 'Opal', 'Petra',
  'Quinn', 'Rhea', 'Sage', 'Tessa', 'Una', 'Vera', 'Willa', 'Yara',
  'Zara', 'Anya', 'Brin', 'Cora', 'Darla', 'Elin', 'Fern', 'Gemma',
  'Hazel', 'Ivy', 'Jolene', 'Kenna', 'Luna', 'Maple', 'Nell', 'Olive',
  'Poppy', 'Roslin', 'Sable', 'Tamsin', 'Vesper', 'Wynne',
];

export const SURNAMES = [
  // Trade/craft-based
  'Baker', 'Cooper', 'Fletcher', 'Mason', 'Tanner', 'Weaver', 'Miller',
  'Smith', 'Thatcher', 'Turner', 'Carter', 'Porter', 'Sawyer', 'Carver',
  // Nature-based
  'Ashford', 'Birchwood', 'Clover', 'Dunmore', 'Elmwood', 'Foxglove',
  'Greenhill', 'Hawthorn', 'Ironwood', 'Juniper', 'Kestrel', 'Larkspur',
  'Moss', 'Nettle', 'Oakley', 'Pinecrest', 'Quarry', 'Redstone',
  'Stonewall', 'Thorn', 'Underhill', 'Vine', 'Whitfield', 'Yarrow',
  // Location-based
  'Aldfield', 'Brookside', 'Crestfall', 'Daleborn', 'Eastmere', 'Farrow',
  'Glenmore', 'Hillcrest', 'Ivydale', 'Kinson', 'Lakewood', 'Meadow',
  'Northvale', 'Oldham', 'Pinebrook', 'Ravenscroft', 'Stillwater',
  'Thornbury', 'Upperdale', 'Valemont', 'Westbrook', 'Yewdale',
  // Descriptor-based
  'Ashby', 'Blackwell', 'Coldwell', 'Duskwalker', 'Embers', 'Frost',
  'Greystone', 'Hartwell', 'Ironfist', 'Longstride', 'Marshwood',
  'Nighthollow', 'Oakheart', 'Proudfoot', 'Quicksilver', 'Roughstone',
  'Silverleaf', 'Tallowmere', 'Warmstone', 'Windmere',
  // Short/punchy
  'Ash', 'Bolt', 'Clay', 'Dirk', 'Fell', 'Gale', 'Hart', 'Lark',
  'Reed', 'Rook', 'Stone', 'Vale', 'Wren',
];

/**
 * Generate a unique NPC name that doesn't collide with existing names.
 * @param {Set<string>} existingNames - Names already in use
 * @returns {{ firstName: string, surname: string, fullName: string }}
 */
export function generateUniqueName(existingNames = new Set()) {
  const maxAttempts = 200;

  for (let i = 0; i < maxAttempts; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    const fullName = `${firstName} ${surname}`;

    if (!existingNames.has(fullName)) {
      return { firstName, surname, fullName };
    }
  }

  // Fallback: append number to guarantee uniqueness
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  const suffix = Math.floor(Math.random() * 900) + 100;
  const fullName = `${firstName} ${surname} ${suffix}`;
  return { firstName, surname, fullName };
}

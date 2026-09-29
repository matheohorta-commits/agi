// LEGO colours used by the set.
// rb  = Rebrickable colour id (verified against the Rebrickable catalogue)
// bl  = BrickLink colour id (for the BrickLink wanted-list XML export)
// hex = colour used for rendering (slightly tuned from the official RGB so it reads well under lights)
export const COLORS = {
  black:          { name: 'Black',             rb: 0,   bl: 11,  hex: '#1c1f24', rgb: '05131D' },
  white:          { name: 'White',             rb: 15,  bl: 1,   hex: '#f2f3f2', rgb: 'FFFFFF' },
  tan:            { name: 'Tan',               rb: 19,  bl: 2,   hex: '#e4cd9e', rgb: 'E4CD9E' },
  darkTan:        { name: 'Dark Tan',          rb: 28,  bl: 69,  hex: '#958a73', rgb: '958A73' },
  reddishBrown:   { name: 'Reddish Brown',     rb: 70,  bl: 88,  hex: '#6b3219', rgb: '582A12' },
  darkBrown:      { name: 'Dark Brown',        rb: 308, bl: 120, hex: '#3f2a10', rgb: '352100' },
  darkRed:        { name: 'Dark Red',          rb: 320, bl: 59,  hex: '#7e1a18', rgb: '720E0F' },
  red:            { name: 'Red',               rb: 4,   bl: 5,   hex: '#c91a09', rgb: 'C91A09' },
  lbg:            { name: 'Light Bluish Gray', rb: 71,  bl: 86,  hex: '#a0a5a9', rgb: 'A0A5A9' },
  dbg:            { name: 'Dark Bluish Gray',  rb: 72,  bl: 85,  hex: '#63666a', rgb: '6C6E68' },
  green:          { name: 'Green',             rb: 2,   bl: 6,   hex: '#237841', rgb: '237841' },
  brightGreen:    { name: 'Bright Green',      rb: 10,  bl: 36,  hex: '#4b9f4a', rgb: '4B9F4A' },
  darkGreen:      { name: 'Dark Green',        rb: 288, bl: 80,  hex: '#1c4a36', rgb: '184632' },
  sandGreen:      { name: 'Sand Green',        rb: 378, bl: 48,  hex: '#a0bcac', rgb: 'A0BCAC' },
  oliveGreen:     { name: 'Olive Green',       rb: 326, bl: 155, hex: '#9b9a5a', rgb: '9B9A5A' },
  medNougat:      { name: 'Medium Nougat',     rb: 84,  bl: 150, hex: '#aa7d55', rgb: 'AA7D55' },
  brightLightYellow: { name: 'Bright Light Yellow', rb: 226, bl: 103, hex: '#fff03a', rgb: 'FFF03A' },
  yellow:         { name: 'Yellow',            rb: 14,  bl: 3,   hex: '#f2cd37', rgb: 'F2CD37' },
  darkOrange:     { name: 'Dark Orange',       rb: 484, bl: 68,  hex: '#a95500', rgb: 'A95500' },
  pearlGold:      { name: 'Pearl Gold',        rb: 297, bl: 115, hex: '#b8903a', rgb: 'AA7F2E', metal: true },
  flatSilver:     { name: 'Flat Silver',       rb: 179, bl: 95,  hex: '#9a9899', rgb: '898788', metal: true },
  blue:           { name: 'Blue',              rb: 1,   bl: 7,   hex: '#0055bf', rgb: '0055BF' },
  darkBlue:       { name: 'Dark Blue',         rb: 272, bl: 63,  hex: '#0a3463', rgb: '0A3463' },
  sandBlue:       { name: 'Sand Blue',         rb: 379, bl: 55,  hex: '#6074a1', rgb: '6074A1' },
  transClear:     { name: 'Trans-Clear',       rb: 47,  bl: 12,  hex: '#dfeef5', rgb: 'FCFCFC', trans: 0.28 },
  transBlack:     { name: 'Trans-Brown',       rb: 40,  bl: 13,  hex: '#635f52', rgb: '635F52', trans: 0.6 },
  transLightBlue: { name: 'Trans-Light Blue',  rb: 41,  bl: 15,  hex: '#aeefec', rgb: 'AEEFEC', trans: 0.5 },
  transRed:       { name: 'Trans-Red',         rb: 36,  bl: 17,  hex: '#e0301e', rgb: 'C91A09', trans: 0.7, glow: 0.35 },
  transYellow:    { name: 'Trans-Yellow',      rb: 46,  bl: 19,  hex: '#f5cd2f', rgb: 'F5CD2F', trans: 0.7, glow: 0.45 },
  transOrange:    { name: 'Trans-Orange',      rb: 182, bl: 98,  hex: '#f08f1c', rgb: 'F08F1C', trans: 0.72, glow: 0.5 },
  transGreen:     { name: 'Trans-Green',       rb: 34,  bl: 20,  hex: '#84b68d', rgb: '84B68D', trans: 0.65, glow: 0.2 },
  transDarkBlue:  { name: 'Trans-Dark Blue',   rb: 33,  bl: 14,  hex: '#2040c0', rgb: '0020A0', trans: 0.7, glow: 0.2 },
  transPurple:    { name: 'Trans-Purple',      rb: 52,  bl: 51,  hex: '#a5a5cb', rgb: 'A5A5CB', trans: 0.65, glow: 0.2 },
};

export const colorKeys = Object.keys(COLORS);

export function isTrans(c) { return !!COLORS[c]?.trans; }

export interface FighterTheme {
  name: string;
  base: string;
  edge: string;
  highlight: string;
  rune: string;
  crest: string;
}

export const FIGHTER_THEMES: FighterTheme[] = [
  { name: "Ruby", base: "#FF3864", edge: "#64091F", highlight: "#FFD8E0", rune: "#FF6A88", crest: "#F9B042" },
  { name: "Sapphire", base: "#3B82F6", edge: "#08204E", highlight: "#D4E7FF", rune: "#5DA4FF", crest: "#F4E4C1" },
  { name: "Emerald", base: "#00C896", edge: "#024F3C", highlight: "#C3FFEE", rune: "#3DE0B5", crest: "#F1F7A1" },
  { name: "Amethyst", base: "#9B5DE5", edge: "#2D0D58", highlight: "#E9D4FF", rune: "#B07CFF", crest: "#FFD1EB" },
  { name: "Topaz", base: "#FFB400", edge: "#633C00", highlight: "#FFEAB5", rune: "#FFC94A", crest: "#FFEEDD" },
  { name: "Opal", base: "#3DE0FF", edge: "#0A4A5A", highlight: "#E0FAFF", rune: "#6BEFFF", crest: "#F1F8FF" },
  { name: "Garnet", base: "#C81D25", edge: "#47060B", highlight: "#FFD5D1", rune: "#E23C45", crest: "#F6C08E" }
];

export const RUNE_GLYPHS = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚺ"];

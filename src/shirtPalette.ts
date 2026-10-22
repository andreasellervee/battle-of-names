import palette from "./data/shirtPalette.json";

// Shared with the asset build: colour variants are files, never runtime pixel work.
export const SHIRT_PALETTE = palette;
export type IllustratedTeam = typeof SHIRT_PALETTE[number]["id"];

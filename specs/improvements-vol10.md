# Codex Prompt: V1 Development Updates for "Battle of Names"

Make the following updates to the game logic and UI:

---

## 1. Spawn Points

- Change the **default spawn point mode** to `"Even Spread"` instead of `"Random"`.
- Keep the dropdown selector, but set `"Even Spread"` as the selected option by default when the game loads.

---

## 2. Pre-defined Fights

- Add a new dropdown **above the player name input list** labeled:  
  **"Select Fight Theme (optional)"**
- When a user selects a theme, **auto-fill the player name list** with the corresponding set of names (overwriting existing ones).
- If the user later changes names manually, treat it as a custom fight.

### Example Themes and Fighter Lists

Implement support for at least the following 5 pre-defined fight themes:

```js
const predefinedFights = {
  "Top 5 AI Companies": [
    "OpenAI", "Google DeepMind", "Anthropic", "Meta AI", "Amazon AI"
  ],
  "Last 10 US Presidents": [
    "Joe Biden", "Donald Trump", "Barack Obama", "George W. Bush", "Bill Clinton",
    "George H. W. Bush", "Ronald Reagan", "Jimmy Carter", "Gerald Ford", "Richard Nixon"
  ],
  "LoL Champions": [
    "Ahri", "Yasuo", "Zed", "Lux", "Jinx", "Thresh", "Vayne", "Lee Sin", "Darius", "Ekko"
  ],
  "Greek Mythology": [
    "Zeus", "Hades", "Athena", "Apollo", "Ares", "Artemis", "Hermes", "Poseidon"
  ],
  "Anime Heroes": [
    "Naruto", "Goku", "Luffy", "Ichigo", "Saitama", "Tanjiro", "Eren", "Gon"
  ]
};
```

- Store these lists in a separate module (`src/data/predefinedFights.ts`) and import them into the main UI component.
- Make sure the UI resets correctly if a theme is re-selected or cleared.
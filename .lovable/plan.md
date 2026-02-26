

## Move Price to Top-Right (Below Skill Badge)

Based on the reference screenshot, the price (`375 Kc`) should sit in the top-right area of the card, aligned with the skill level badge -- not down in the bottom row with spots and host info.

### Changes in `src/components/games/GameCard.tsx`

**1. Add price below the skill badge in Row 1 (top-right column)**

Wrap the skill badge and price in a vertical stack on the right side of Row 1:

```text
[ Title  (Joined) .............. [C]     ]
[                                375 Kc  ]
```

The right side becomes a `flex flex-col items-end` container holding the skill chip on top and price below it.

**2. Remove price from Row 4 (bottom row)**

Delete the `showPrice` block from the bottom-right section (lines 211-214). The bottom row will only contain host info + spots/interest count.

### Technical detail

- Lines 147-151: Wrap in a `div` with `flex flex-col items-end gap-0.5`, add the price element below the skill badge.
- Lines 211-215: Remove the price `span` from the bottom row entirely.
- For court-sharing cards (no skill badge), the price still renders top-right on its own.


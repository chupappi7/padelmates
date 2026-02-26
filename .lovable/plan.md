
## Move "Joined/Requested/Court Secured" Badge Next to Title

Move the role status pill (Joined, Requested, Court Secured) from its current stacked position in the bottom-right corner to **Row 1**, placed inline between the title text and the skill level badge. The "Host" pill stays in Row 4 next to the host name as it is now.

### Changes in `src/components/games/GameCard.tsx`

**Row 1 (title row):** Insert the role pill after the title text (and after the Available/Taken badge for court sharing), before the skill chip:

```text
[ Title  (Joined) .............. [C] ]
```

**Row 4 (bottom row):** Remove the stacked pill+price column. Price stays but the Joined/Requested/Court Secured pill is no longer rendered there.

### Specific edits:

1. **Row 1** -- Inside the left `div` (flex items-center), after the court-sharing badge, add the role pill when `showTopRightPill` is true.

2. **Row 4** -- Remove the `showTopRightPill` rendering block from the stacked column. Keep the price display as a simple inline element alongside spots.

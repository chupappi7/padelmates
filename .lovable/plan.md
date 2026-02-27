
## Fix Hero Card Spacing

**Problem**: The `justify-between` on the text container spreads elements across the full avatar height (80px), creating excessive gaps between name, ID, and level/PDR row.

**Solution**: Remove `justify-between` and use tight fixed spacing so all three elements (name, ID, level) cluster together naturally.

### Changes to `src/components/profile/HeroCard.tsx`

1. **Line 83**: Change `flex flex-col justify-between` to just `flex flex-col` -- removes the vertical spreading
2. **Line 95**: Change `mt-1` to `mt-0.5` on the ID row -- pulls ID tighter under name  
3. **Line 109**: Add `mt-1.5` to the level/PDR row -- small consistent gap below ID

This will make all three lines (name, ID, level) sit close together as a tight stack rather than being stretched across the avatar height.

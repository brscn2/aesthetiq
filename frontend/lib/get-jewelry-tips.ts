export function getJewelryTips(season: string): string[] {
  const tips: Record<string, string[]> = {
    // Warm seasons (Autumn)
    "Dark Autumn": [
      "Choose antique gold and burnished brass for a rich, sophisticated look",
      "Copper and bronze pieces complement your deep, warm coloring beautifully",
      "Avoid bright, shiny silver - opt for oxidized silver if needed",
      "Gemstones like amber, topaz, and garnet enhance your palette",
    ],
    "Warm Autumn": [
      "Rich gold tones harmonize perfectly with your golden undertones",
      "Brass and copper add warmth that complements your natural coloring",
      "Rose gold is especially flattering for your warm complexion",
      "Look for jewelry with warm gemstones like citrine, coral, and tiger's eye",
    ],
    "Muted Autumn": [
      "Soft, matte gold finishes work best with your gentle coloring",
      "Antique brass and weathered copper add depth without overwhelming",
      "Avoid high-shine metals - opt for brushed or satin finishes",
      "Earth-toned gemstones like jasper and agate complement your palette",
    ],

    // Spring
    "Light Spring": [
      "Light gold and delicate rose gold enhance your fresh, bright coloring",
      "Choose polished, shiny finishes that reflect light beautifully",
      "Yellow gold pieces bring out the warmth in your complexion",
      "Gemstones like peridot, aquamarine, and light citrine are ideal",
    ],
    "Warm Spring": [
      "Bright, polished gold is your signature metal",
      "Yellow gold and brass complement your sunny, warm undertones",
      "Rose gold adds a playful, romantic touch to your look",
      "Coral, turquoise, and warm pearls are excellent gemstone choices",
    ],
    "Bright Spring": [
      "High-shine gold and brass make a bold statement with your vibrant coloring",
      "Choose polished finishes that catch the light",
      "Yellow gold pieces enhance your natural warmth and energy",
      "Bright gemstones like coral, turquoise, and citrine work beautifully",
    ],

    // Winter
    "Dark Winter": [
      "High-contrast silver and platinum complement your dramatic coloring",
      "White gold provides a sophisticated, cool-toned option",
      "Choose bold, statement pieces that match your high-contrast features",
      "Gemstones like sapphire, emerald, and diamond suit you perfectly",
    ],
    "Cool Winter": [
      "Bright silver and platinum enhance your cool, crisp coloring",
      "White gold is especially flattering for your complexion",
      "Opt for polished, high-shine finishes for maximum impact",
      "Icy gemstones like diamonds, white topaz, and blue sapphires are ideal",
    ],
    "Bright Winter": [
      "Highly polished silver and platinum match your vivid coloring",
      "Choose dramatic, eye-catching pieces in cool metals",
      "White gold and gunmetal add modern sophistication",
      "Bold gemstones like ruby, emerald, and sapphire make stunning accents",
    ],

    // Summer
    "Light Summer": [
      "Soft silver and delicate platinum pieces complement your gentle coloring",
      "Rose gold can work as it has cool pink undertones",
      "Choose pieces with a soft, muted finish rather than high shine",
      "Pastel gemstones like rose quartz, light amethyst, and aquamarine are perfect",
    ],
    "Cool Summer": [
      "Cool silver and platinum harmonize with your soft, cool undertones",
      "White gold provides elegant, understated sophistication",
      "Opt for brushed or satin finishes for a refined look",
      "Gemstones like amethyst, blue topaz, and pearls suit you beautifully",
    ],
    "Muted Summer": [
      "Soft silver with a matte or brushed finish flatters your muted coloring",
      "Antique silver adds depth without being too bright",
      "Avoid overly shiny metals - choose toned-down finishes",
      "Dusty gemstones like smoky quartz and soft amethyst work well",
    ],
  }

  return tips[season] || []
}

type PaletteItem = {
  color: string
  name: string
  category: string
}

type MakeupResult = {
  lips: { name: string; color: string }[]
  eyes: { name: string; color: string }[]
}

/* ======================================
   COLOR HELPERS
====================================== */

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max)

const hexToHSL = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)

  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }

    h *= 60
  }

  return { h, s: s * 100, l: l * 100 }
}

const hslToHex = (h: number, s: number, l: number) => {
  h /= 360
  s /= 100
  l /= 100

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3)
      return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (x: number) =>
    Math.round(x * 255).toString(16).padStart(2, "0")

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

    
const lipPalettes: Record<string, any[]> = {
    /* -------- AUTUMN -------- */
    "Dark Autumn": [
    { color: "#7A3030", name: "Brick Red", category: "deep" },
    { color: "#8B4040", name: "Russet", category: "earthy" },
    { color: "#6A2828", name: "Mahogany", category: "deep" },
    { color: "#9A4535", name: "Burnt Sienna", category: "warm" },
    { color: "#7A3535", name: "Spiced Wine", category: "rich" },
    ],
    "Warm Autumn": [
    { color: "#A84030", name: "Terracotta", category: "warm" },
    { color: "#B84838", name: "Cayenne", category: "rich" },
    { color: "#8A3A30", name: "Rust", category: "earthy" },
    { color: "#C85040", name: "Pumpkin Spice", category: "warm" },
    { color: "#9A4038", name: "Cinnamon", category: "deep" },
    ],
    "Muted Autumn": [
    { color: "#8A5550", name: "Dusty Rose", category: "soft" },
    { color: "#9A6058", name: "Soft Terracotta", category: "muted" },
    { color: "#7A4A48", name: "Mauve Brown", category: "neutral" },
    { color: "#8A5048", name: "Rose Clay", category: "earthy" },
    { color: "#9A5A50", name: "Dusty Coral", category: "soft" },
    ],

    /* -------- WINTER -------- */
    "Dark Winter": [
    { color: "#6B2C3E", name: "Black Cherry", category: "deep" },
    { color: "#8B3A4A", name: "Mulberry", category: "rich" },
    { color: "#5A2030", name: "Oxblood", category: "deep" },
    { color: "#7A3040", name: "Bordeaux", category: "dramatic" },
    { color: "#6A3545", name: "Plum Wine", category: "cool" },
    ],
    "Cool Winter": [
    { color: "#8A2050", name: "Raspberry", category: "vivid" },
    { color: "#7A3055", name: "Wine", category: "cool" },
    { color: "#6A2545", name: "Deep Plum", category: "deep" },
    { color: "#9A3060", name: "Magenta Rose", category: "vivid" },
    { color: "#5A2040", name: "Burgundy", category: "dramatic" },
    ],
    "Bright Winter": [
    { color: "#C82060", name: "Hot Pink", category: "vivid" },
    { color: "#E03070", name: "Fuchsia", category: "vivid" },
    { color: "#A82050", name: "Vivid Berry", category: "dramatic" },
    { color: "#B81850", name: "Electric Red", category: "vivid" },
    { color: "#D02860", name: "Magenta", category: "vivid" },
    ],

    /* -------- SPRING -------- */
    "Light Spring": [
    { color: "#C8706A", name: "Peach Rose", category: "fresh" },
    { color: "#D07A70", name: "Coral Pink", category: "warm" },
    { color: "#BA6A65", name: "Tea Rose", category: "soft" },
    { color: "#C87068", name: "Apricot", category: "fresh" },
    { color: "#B86860", name: "Rose Nude", category: "light" },
    ],
    "Warm Spring": [
    { color: "#D86858", name: "Coral", category: "warm" },
    { color: "#E87860", name: "Peach Coral", category: "fresh" },
    { color: "#C86050", name: "Salmon", category: "warm" },
    { color: "#E07058", name: "Tangerine Pink", category: "fresh" },
    { color: "#D06048", name: "Warm Coral", category: "warm" },
    ],
    "Bright Spring": [
    { color: "#E85050", name: "Poppy Red", category: "vivid" },
    { color: "#F06060", name: "Coral Red", category: "vivid" },
    { color: "#D84848", name: "Tomato Red", category: "vivid" },
    { color: "#E86858", name: "Orange Red", category: "vivid" },
    { color: "#D05050", name: "Clear Red", category: "vivid" },
    ],

    /* -------- SUMMER -------- */
    "Light Summer": [
    { color: "#A86070", name: "Rose Pink", category: "soft" },
    { color: "#9A5565", name: "Dusty Rose", category: "cool" },
    { color: "#B06878", name: "Soft Berry", category: "muted" },
    { color: "#985060", name: "Mauve Pink", category: "cool" },
    { color: "#A85868", name: "Rose Petal", category: "light" },
    ],
    "Cool Summer": [
    { color: "#9A4A68", name: "Raspberry Rose", category: "cool" },
    { color: "#8A4060", name: "Plum Rose", category: "cool" },
    { color: "#A85070", name: "Berry Pink", category: "soft" },
    { color: "#7A3858", name: "Muted Berry", category: "muted" },
    { color: "#9A4860", name: "Cool Rose", category: "cool" },
    ],
    "Muted Summer": [
    { color: "#8A5565", name: "Dusty Mauve", category: "muted" },
    { color: "#7A4A58", name: "Soft Plum", category: "soft" },
    { color: "#9A6068", name: "Rose Brown", category: "neutral" },
    { color: "#8A5060", name: "Muted Rose", category: "muted" },
    { color: "#7A4555", name: "Dusty Berry", category: "soft" },
    ],
}


/* =====================================================
    EYE PALETTES (WITH COLOR ADDED)
===================================================== */

const eyePalettes: Record<string, any[]> = {

    /* -------- AUTUMN -------- */

    "Dark Autumn": [
    { color: "#5A4038", name: "Burnt Umber", category: "base" },
    { color: "#6A4A40", name: "Warm Cocoa", category: "crease" },
    { color: "#556B2F", name: "Olive Moss", category: "accent" },
    { color: "#006D6F", name: "Deep Teal", category: "jewel" },
    { color: "#2A1A15", name: "Espresso", category: "liner" },
    { color: "#8A6858", name: "Bronze Glow", category: "highlight" },
    ],

    "Warm Autumn": [
    { color: "#6A5040", name: "Warm Brown", category: "base" },
    { color: "#7A5A48", name: "Caramel", category: "crease" },
    { color: "#8B7355", name: "Bronze", category: "accent" },
    { color: "#B8860B", name: "Dark Goldenrod", category: "jewel" },
    { color: "#3A2A20", name: "Dark Brown", category: "liner" },
    { color: "#D4A574", name: "Gold Shimmer", category: "highlight" },
    ],

    "Muted Autumn": [
    { color: "#7A6A60", name: "Soft Taupe", category: "base" },
    { color: "#8A7A68", name: "Mushroom", category: "crease" },
    { color: "#6B6355", name: "Sage", category: "accent" },
    { color: "#556B6F", name: "Muted Teal", category: "soft" },
    { color: "#4A3A30", name: "Soft Brown", category: "liner" },
    { color: "#B8A898", name: "Soft Gold", category: "highlight" },
    ],

    /* -------- WINTER -------- */

    "Dark Winter": [
    { color: "#3A3035", name: "Charcoal Plum", category: "base" },
    { color: "#4A3A45", name: "Deep Mauve", category: "crease" },
    { color: "#1F3C88", name: "Royal Blue", category: "jewel" },
    { color: "#046307", name: "Emerald", category: "jewel" },
    { color: "#B0006D", name: "Fuchsia", category: "vivid" },
    { color: "#1E1818", name: "Jet Black", category: "liner" },
    { color: "#7A6870", name: "Pewter", category: "highlight" },
    ],

    "Cool Winter": [
    { color: "#4A4048", name: "Cool Grey", category: "base" },
    { color: "#5A4A55", name: "Plum Grey", category: "crease" },
    { color: "#1E4D8C", name: "Sapphire", category: "jewel" },
    { color: "#5B2C6F", name: "Deep Purple", category: "jewel" },
    { color: "#C71585", name: "Magenta", category: "vivid" },
    { color: "#1A1A1A", name: "Black", category: "liner" },
    { color: "#8A8090", name: "Silver", category: "highlight" },
    ],

    "Bright Winter": [
    { color: "#3A3540", name: "Slate", category: "base" },
    { color: "#4A4050", name: "Cool Taupe", category: "crease" },
    { color: "#0047AB", name: "Cobalt Blue", category: "jewel" },
    { color: "#00A86B", name: "Jade", category: "jewel" },
    { color: "#FF1493", name: "Deep Pink", category: "vivid" },
    { color: "#141414", name: "True Black", category: "liner" },
    { color: "#C0C0C0", name: "Bright Silver", category: "highlight" },
    ],

    /* -------- SPRING -------- */

    "Light Spring": [
    { color: "#8A7A70", name: "Soft Taupe", category: "base" },
    { color: "#9A8A78", name: "Warm Beige", category: "crease" },
    { color: "#3EC1C9", name: "Turquoise", category: "bright" },
    { color: "#F4A6A0", name: "Peach Pink", category: "fresh" },
    { color: "#7ED9B3", name: "Mint", category: "accent" },
    { color: "#4A3A30", name: "Soft Brown", category: "liner" },
    { color: "#E8D8C8", name: "Champagne", category: "highlight" },
    ],

    "Warm Spring": [
    { color: "#9A8068", name: "Golden Tan", category: "base" },
    { color: "#AA9070", name: "Camel", category: "crease" },
    { color: "#20B2AA", name: "Light Sea Green", category: "bright" },
    { color: "#FF7F50", name: "Coral", category: "fresh" },
    { color: "#98D8C8", name: "Aqua", category: "accent" },
    { color: "#5A4030", name: "Warm Brown", category: "liner" },
    { color: "#FFD700", name: "Gold", category: "highlight" },
    ],

    "Bright Spring": [
    { color: "#8A7A68", name: "Warm Taupe", category: "base" },
    { color: "#9A8A70", name: "Sand", category: "crease" },
    { color: "#00CED1", name: "Dark Turquoise", category: "bright" },
    { color: "#FF6347", name: "Tomato", category: "vivid" },
    { color: "#7CFC00", name: "Lawn Green", category: "accent" },
    { color: "#4A3828", name: "Chestnut", category: "liner" },
    { color: "#FAFAD2", name: "Light Gold", category: "highlight" },
    ],

    /* -------- SUMMER -------- */

    "Light Summer": [
    { color: "#8A7A78", name: "Rose Taupe", category: "base" },
    { color: "#9A8A88", name: "Soft Mauve", category: "crease" },
    { color: "#7A8FBF", name: "Powder Blue", category: "accent" },
    { color: "#B4A0C8", name: "Soft Lavender", category: "soft" },
    { color: "#C38EB4", name: "Rose Mauve", category: "accent" },
    { color: "#4A4048", name: "Cool Brown", category: "liner" },
    { color: "#E8E0E8", name: "Pearl", category: "highlight" },
    ],

    "Cool Summer": [
    { color: "#7A7078", name: "Cool Taupe", category: "base" },
    { color: "#8A8088", name: "Dusty Mauve", category: "crease" },
    { color: "#6A8FAF", name: "Slate Blue", category: "accent" },
    { color: "#9A80B8", name: "Soft Plum", category: "soft" },
    { color: "#B08090", name: "Dusty Rose", category: "accent" },
    { color: "#3A3540", name: "Charcoal", category: "liner" },
    { color: "#D8D0E0", name: "Soft Silver", category: "highlight" },
    ],

    "Muted Summer": [
    { color: "#8A8080", name: "Greige", category: "base" },
    { color: "#9A9088", name: "Mushroom Grey", category: "crease" },
    { color: "#7A8A9A", name: "Dusty Blue", category: "soft" },
    { color: "#A090A0", name: "Muted Lavender", category: "soft" },
    { color: "#9A8890", name: "Soft Mauve", category: "accent" },
    { color: "#4A4545", name: "Soft Black", category: "liner" },
    { color: "#D0D0D8", name: "Muted Pearl", category: "highlight" },
    ],
}

/* ======================================
   MAIN FUNCTION
====================================== */

export function getMakeupColors(
  season: string,
  undertone: string,
  contrast: string,
): MakeupResult {
  const adjustColor = (hex: string) => {
    let { h, s, l } = hexToHSL(hex)

    if (undertone === "Warm") {
      h -= 5
      s += 5
    }

    if (undertone === "Cool") {
      h += 7
      s += 3
    }

    if (contrast === "High") {
      s *= 1.15
      l -= 5
    }

    if (contrast === "Low") {
      s *= 0.9
      l += 3
    }

    h = ((h % 360) + 360) % 360
    s = clamp(s, 0, 100)
    l = clamp(l, 0, 100)

    return hslToHex(h, s, l).toUpperCase()
  }

  const baseLips = lipPalettes[season] || lipPalettes["Dark Autumn"]
  const baseEyes = eyePalettes[season] || eyePalettes["Dark Autumn"]

  const lipPriorities: Record<string, string[]> = {
    High: ["deep", "rich", "vivid", "dramatic"],
    Medium: ["warm", "cool", "fresh", "base"],
    Low: ["soft", "muted", "light", "neutral"],
  }

  const eyePriorities: Record<string, string[]> = {
    High: ["jewel", "vivid", "accent", "bright", "deep", "liner"],
    Medium: ["base", "accent", "jewel", "crease", "soft"],
    Low: ["soft", "highlight", "neutral", "base"],
  }

  const select = (
    items: PaletteItem[],
    priorities: string[],
    count: number,
  ) => {
    return [...items]
      .sort(
        (a, b) =>
          (priorities.indexOf(a.category) === -1
            ? 9
            : priorities.indexOf(a.category)) -
          (priorities.indexOf(b.category) === -1
            ? 9
            : priorities.indexOf(b.category)),
      )
      .slice(0, count)
  }

  const lips = select(
    baseLips,
    lipPriorities[contrast] || lipPriorities.Medium,
    4,
  )

  const eyes = select(
    baseEyes,
    eyePriorities[contrast] || eyePriorities.Medium,
    5,
  )

  return {
    lips: lips.map((c) => ({
      name: c.name,
      color: adjustColor(c.color),
    })),

    eyes: eyes.map((c) => ({
      name: c.name,
      color: adjustColor(c.color),
    })),
  }
}


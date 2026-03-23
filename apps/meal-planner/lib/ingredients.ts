/**
 * Ingredient parsing and normalization.
 *
 * Parses free-text ingredient lines into structured items, normalizes
 * singular/plural forms so that "potatoes" and "potato" merge into one
 * grocery-list entry, and combines quantities when possible.
 */

// ── Parsing ────────────────────────────────────────────────────────────

/** Fraction characters → decimal */
const VULGAR: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

const UNIT_ALIASES: Record<string, string> = {
  // volume
  cup: "cup",
  cups: "cup",
  c: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  l: "L",
  liter: "L",
  liters: "L",
  litre: "L",
  litres: "L",
  // weight
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  // count
  can: "can",
  cans: "can",
  clove: "clove",
  cloves: "clove",
  slice: "slice",
  slices: "slice",
  bunch: "bunch",
  bunches: "bunch",
  pinch: "pinch",
  pinches: "pinch",
  handful: "handful",
  handfuls: "handful",
  pkg: "pkg",
  package: "pkg",
  packages: "pkg",
  bag: "bag",
  bags: "bag",
  bottle: "bottle",
  bottles: "bottle",
  jar: "jar",
  jars: "jar",
  piece: "piece",
  pieces: "piece",
  head: "head",
  heads: "head",
  stalk: "stalk",
  stalks: "stalk",
  sprig: "sprig",
  sprigs: "sprig",
};

export interface ParsedIngredient {
  quantity: number | null;
  unit: string | null; // normalised unit
  name: string; // raw name (not yet normalised)
}

/** Try to read a number (integer, decimal, or vulgar fraction) from the start. */
function parseLeadingNumber(s: string): { value: number; rest: string } | null {
  let str = s.trimStart();

  // vulgar fraction alone: "½ cup"
  if (str.length > 0 && VULGAR[str[0]]) {
    return { value: VULGAR[str[0]], rest: str.slice(1).trimStart() };
  }

  // number possibly followed by vulgar fraction: "1½"
  const m = str.match(/^(\d+\.?\d*)\s*/);
  if (!m) return null;

  let value = parseFloat(m[1]);
  let rest = str.slice(m[0].length);

  // check for vulgar fraction right after
  if (rest.length > 0 && VULGAR[rest[0]]) {
    value += VULGAR[rest[0]];
    rest = rest.slice(1).trimStart();
  }

  // check for "1/2" style
  const frac = rest.match(/^\/\s*(\d+)\s*/);
  if (frac) {
    value = value / parseFloat(frac[1]);
    rest = rest.slice(frac[0].length);
  }

  return { value, rest };
}

/** Parse a single ingredient line like "2 cups flour" */
export function parseIngredientLine(line: string): ParsedIngredient {
  const trimmed = line.trim();
  if (!trimmed) return { quantity: null, unit: null, name: "" };

  // try to extract a leading number
  const num = parseLeadingNumber(trimmed);
  if (!num) {
    return { quantity: null, unit: null, name: trimmed };
  }

  const { value, rest } = num;

  // try to match a unit at the start of rest
  const wordMatch = rest.match(/^([a-zA-Z]+)\.?\s+(.+)/);
  if (wordMatch) {
    const maybeUnit = wordMatch[1].toLowerCase();
    if (UNIT_ALIASES[maybeUnit]) {
      return {
        quantity: value,
        unit: UNIT_ALIASES[maybeUnit],
        name: wordMatch[2].trim(),
      };
    }
  }

  // no unit — the rest is the name (e.g. "3 eggs")
  return { quantity: value, unit: null, name: rest || trimmed };
}

// ── Normalisation ──────────────────────────────────────────────────────

/** Known irregular plurals (plural → singular). */
const IRREGULARS: Record<string, string> = {
  potatoes: "potato",
  tomatoes: "tomato",
  leaves: "leaf",
  halves: "half",
  loaves: "loaf",
  knives: "knife",
  wolves: "wolf",
  shelves: "shelf",
  anchovies: "anchovy",
  berries: "berry",
  cherries: "cherry",
  cranberries: "cranberry",
  strawberries: "strawberry",
  blueberries: "blueberry",
  raspberries: "raspberry",
  blackberries: "blackberry",
};

/** Reduce a word to a canonical singular form. */
export function singularize(word: string): string {
  const lower = word.toLowerCase();
  if (IRREGULARS[lower]) return IRREGULARS[lower];
  // -ies → -y  (but not single-syllable like "dies")
  if (lower.endsWith("ies") && lower.length > 4)
    return lower.slice(0, -3) + "y";
  // -ses, -xes, -zes, -ches, -shes → drop "es"
  if (/(?:s|x|z|ch|sh)es$/.test(lower)) return lower.slice(0, -2);
  // -ves → -f  (e.g. "halves" already handled by IRREGULARS for common ones)
  if (lower.endsWith("ves")) return lower.slice(0, -3) + "f";
  // generic trailing -s (but not already ending in "ss", e.g. "molasses")
  if (lower.endsWith("s") && !lower.endsWith("ss") && lower.length > 3)
    return lower.slice(0, -1);
  return lower;
}

/**
 * Build a normalisation key from an ingredient name so that
 * "red potatoes" and "red potato" map to the same bucket.
 */
export function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,()]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .sort()
    .join(" ");
}

// ── Grocery list generation ────────────────────────────────────────────

export interface GroceryItem {
  /** Display name (most common raw name seen for this key). */
  displayName: string;
  /** All amounts grouped by unit. null unit = "unit-less" (e.g. 3 eggs). */
  amounts: { quantity: number; unit: string | null }[];
  /** Which recipes contributed this ingredient. */
  recipeNames: string[];
}

/** Format amounts into a human-readable string like "2 cups, 100 g" */
export function formatAmounts(
  amounts: { quantity: number; unit: string | null }[]
): string {
  if (amounts.length === 0) return "";
  return amounts
    .map((a) => {
      const qty = Number.isInteger(a.quantity)
        ? a.quantity.toString()
        : a.quantity.toFixed(1).replace(/\.0$/, "");
      return a.unit ? `${qty} ${a.unit}` : qty;
    })
    .join(", ");
}

/**
 * Given a set of recipes (each with multi-line ingredients),
 * produce a combined grocery list with duplicates merged.
 */
export function buildGroceryList(
  recipes: { name: string; ingredients: string }[]
): GroceryItem[] {
  const buckets = new Map<
    string,
    {
      names: Map<string, number>; // raw name → count (to pick best display)
      amounts: Map<string | "@@none", number>; // unit → summed qty
      recipeNames: Set<string>;
    }
  >();

  for (const recipe of recipes) {
    const lines = recipe.ingredients
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      const parsed = parseIngredientLine(line);
      if (!parsed.name) continue;

      const key = normalizeKey(parsed.name);
      if (!buckets.has(key)) {
        buckets.set(key, {
          names: new Map(),
          amounts: new Map(),
          recipeNames: new Set(),
        });
      }
      const bucket = buckets.get(key)!;

      // track raw name
      bucket.names.set(
        parsed.name,
        (bucket.names.get(parsed.name) ?? 0) + 1
      );
      bucket.recipeNames.add(recipe.name);

      // accumulate quantity
      if (parsed.quantity != null) {
        const unitKey = parsed.unit ?? "@@none";
        bucket.amounts.set(
          unitKey,
          (bucket.amounts.get(unitKey) ?? 0) + parsed.quantity
        );
      }
    }
  }

  const items: GroceryItem[] = [];
  for (const bucket of buckets.values()) {
    // pick the most-seen raw name as display name
    let bestName = "";
    let bestCount = 0;
    for (const [name, count] of bucket.names) {
      if (count > bestCount) {
        bestName = name;
        bestCount = count;
      }
    }

    const amounts: { quantity: number; unit: string | null }[] = [];
    for (const [unitKey, qty] of bucket.amounts) {
      amounts.push({
        quantity: qty,
        unit: unitKey === "@@none" ? null : unitKey,
      });
    }

    items.push({
      displayName: bestName,
      amounts,
      recipeNames: Array.from(bucket.recipeNames),
    });
  }

  return items.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

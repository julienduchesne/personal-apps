"use client";

import { Badge } from "@/components/ui/badge";

function tagToHue(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

const TAG_EMOJIS: Record<string, string> = {
  pasta: "🍝",
  fried: "🍳",
  vegetarian: "🥬",
  vegan: "🌱",
  soup: "🍲",
  salad: "🥗",
  dessert: "🍰",
  breakfast: "🥞",
  grilled: "🔥",
  seafood: "🐟",
  chicken: "🍗",
  beef: "🥩",
  pork: "🐷",
  rice: "🍚",
  bread: "🍞",
  mexican: "🌮",
  asian: "🥢",
  italian: "🇮🇹",
  indian: "🍛",
  quick: "⚡",
  slow: "🐢",
  healthy: "💚",
  comfort: "🛋️",
  spicy: "🌶️",
  sweet: "🍬",
  baked: "🧁",
  sandwich: "🥪",
  pizza: "🍕",
  stew: "🫕",
  wrap: "🌯",
};

export function TagBadge({ tag }: { tag: string }) {
  const hue = tagToHue(tag);
  const emoji = TAG_EMOJIS[tag.toLowerCase()] ?? "";

  return (
    <Badge
      variant="secondary"
      className="rounded-full text-xs font-medium px-2.5 py-0.5"
      style={{
        backgroundColor: `oklch(0.9 0.09 ${hue})`,
        color: `oklch(0.3 0.14 ${hue})`,
      }}
    >
      {emoji && <span className="mr-0.5">{emoji}</span>}
      {tag}
    </Badge>
  );
}

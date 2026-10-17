// Preset personas and the demo product catalog.

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  interests: string[];
  accentColor: string;
}

export const PERSONAS: Record<string, Persona> = {
  "jazz-lover": {
    id: "jazz-lover",
    name: "爵士爱好者",
    emoji: "🎷",
    tagline: "黑胶、深夜电台、手工咖啡",
    interests: ["jazz", "vinyl", "espresso", "live-music", "photography"],
    accentColor: "#8b5a2b",
  },
  "streetwear-fan": {
    id: "streetwear-fan",
    name: "街头潮人",
    emoji: "🛹",
    tagline: "球鞋、滑板、城市夜生活",
    interests: ["streetwear", "sneakers", "hip-hop", "skate", "urban"],
    accentColor: "#d63c5e",
  },
  minimalist: {
    id: "minimalist",
    name: "极简主义者",
    emoji: "◻️",
    tagline: "留白、功能主义、日式美学",
    interests: ["minimalism", "japandi", "functional", "design", "tea"],
    accentColor: "#9aa5b1",
  },
};

export interface Product {
  id: string;
  name: string;
  blurb: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "cloudrunner-sneaker",
    name: "CloudRunner 小白鞋",
    blurb: "轻得像没穿一样的日常跑鞋",
  },
  {
    id: "aurora-perfume",
    name: "Aurora 香水",
    blurb: "晨雾中的柑橘与雪松",
  },
  {
    id: "kiln-coffee",
    name: "Kiln 手冲咖啡豆",
    blurb: "深烘埃塞俄比亚，黑巧克力尾韵",
  },
];

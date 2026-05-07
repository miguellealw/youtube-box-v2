export const PRESET_EMOJIS = [
  "🎮", "🎵", "🎬", "📰", "🏋️", "🍳", "✈️", "💻",
  "🎨", "📚", "😂", "🔬", "💰", "🏀", "🐾", "🧘",
  "🏠", "🎸", "🌍", "⭐", "📁",
]

const KEYWORD_MAP: [string[], string][] = [
  [["game", "gaming", "play", "stream", "esport"], "🎮"],
  [["music", "song", "artist", "band", "playlist", "rap", "hip hop"], "🎵"],
  [["film", "movie", "cinema", "review", "trailer"], "🎬"],
  [["news", "politics", "world", "current", "daily"], "📰"],
  [["fitness", "gym", "workout", "exercise", "lifting"], "🏋️"],
  [["cook", "food", "recipe", "kitchen", "baking", "eating"], "🍳"],
  [["travel", "vlog", "adventure", "trip", "country"], "✈️"],
  [["tech", "coding", "software", "dev", "programming", "code"], "💻"],
  [["art", "design", "draw", "creative", "craft"], "🎨"],
  [["learn", "education", "tutorial", "course", "teach", "school"], "📚"],
  [["comedy", "funny", "meme", "humor", "sketch"], "😂"],
  [["science", "space", "physics", "chemistry", "biology"], "🔬"],
  [["finance", "money", "invest", "crypto", "stock", "business"], "💰"],
  [["sports", "football", "basketball", "soccer", "nba", "nfl"], "🏀"],
  [["animal", "pet", "dog", "cat", "wildlife"], "🐾"],
  [["meditation", "mental", "wellness", "yoga", "health"], "🧘"],
  [["home", "diy", "house", "garden", "decor"], "🏠"],
  [["guitar", "guitar", "band", "rock", "music"], "🎸"],
  [["nature", "environment", "earth", "climate"], "🌍"],
]

export function getEmojiForCategory(name: string): string {
  const lower = name.toLowerCase()
  for (const [keywords, emoji] of KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return emoji
  }
  return "📁"
}

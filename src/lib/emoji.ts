export const PRESET_EMOJIS = [
  // Entertainment & Media
  "🎮", "🕹️", "🎲", "🃏", "🎯",
  "🎵", "🎶", "🎤", "🎧", "🥁",
  "🎬", "🎥", "📺", "🎞️", "🎭",
  "📰", "📡", "🗞️",
  // Lifestyle
  "🏋️", "🤸", "🧗", "⚽", "🏊",
  "🍳", "🍕", "🍜", "🥗", "☕",
  "✈️", "🚀", "🛶", "🏕️", "🗺️",
  "🏠", "🌿", "🪴", "🔨", "🛋️",
  "🧘", "🧠", "💊", "🩺", "❤️",
  // Tech & Science
  "💻", "📱", "🖥️", "🤖", "🔌",
  "🔬", "🔭", "🧪", "⚗️", "🌌",
  // Education & Creativity
  "📚", "📖", "✏️", "🎓", "🏫",
  "🎨", "🖌️", "📷", "🎸", "🎹",
  // Finance & Business
  "💰", "📈", "💎", "🏦", "🤝",
  // Nature & Animals
  "🌍", "🌊", "🌋", "🌸", "🍂",
  "🐾", "🐶", "🐱", "🦁", "🦋",
  // Misc
  "😂", "🔥", "💡", "🎉", "⭐",
  "🏆", "🎁", "🔑", "📁", "🗂️",
]

const KEYWORD_MAP: [string[], string][] = [
  [["game", "gaming", "play", "stream", "esport"], "🎮"],
  [["retro", "arcade", "controller", "console"], "🕹️"],
  [["board game", "tabletop", "card game", "puzzle"], "🎲"],
  [["music", "song", "playlist", "rap", "hip hop", "pop"], "🎵"],
  [["artist", "band", "concert", "album"], "🎶"],
  [["podcast", "microphone", "talk", "interview"], "🎤"],
  [["audio", "headphone", "lofi", "beats"], "🎧"],
  [["drum", "percussion", "rhythm"], "🥁"],
  [["guitar", "rock", "metal", "strings"], "🎸"],
  [["piano", "keyboard", "classical", "jazz"], "🎹"],
  [["film", "movie", "cinema", "review", "trailer"], "🎬"],
  [["vlog", "daily", "life", "behind the scenes"], "🎥"],
  [["tv", "series", "show", "episode", "netflix"], "📺"],
  [["animation", "anime", "cartoon", "short film"], "🎞️"],
  [["theater", "comedy", "drama", "performance"], "🎭"],
  [["news", "politics", "current", "breaking"], "📰"],
  [["broadcast", "journalism", "media"], "📡"],
  [["fitness", "gym", "workout", "exercise", "lifting", "bodybuilding"], "🏋️"],
  [["yoga", "stretch", "flexibility", "pilates"], "🤸"],
  [["climb", "hike", "outdoor", "trail"], "🧗"],
  [["sports", "football", "basketball", "soccer", "nba", "nfl", "baseball"], "⚽"],
  [["swim", "pool", "water sport", "diving"], "🏊"],
  [["cook", "food", "recipe", "kitchen", "baking", "eating"], "🍳"],
  [["pizza", "fast food", "snack", "junk food"], "🍕"],
  [["noodle", "ramen", "asian food", "sushi"], "🍜"],
  [["healthy", "salad", "vegan", "nutrition", "diet"], "🥗"],
  [["coffee", "drink", "tea", "cafe", "beverage"], "☕"],
  [["travel", "trip", "adventure", "country", "tour"], "✈️"],
  [["space", "nasa", "astronomy", "rocket", "star"], "🚀"],
  [["kayak", "boat", "sailing", "sea"], "🛶"],
  [["camping", "wilderness", "survival", "backpacking"], "🏕️"],
  [["map", "geography", "explore", "world"], "🗺️"],
  [["tech", "coding", "software", "dev", "programming", "code"], "💻"],
  [["mobile", "app", "android", "ios", "phone"], "📱"],
  [["pc", "desktop", "hardware", "computer", "setup"], "🖥️"],
  [["ai", "robot", "machine learning", "automation"], "🤖"],
  [["electronics", "gadget", "circuit", "raspberry"], "🔌"],
  [["science", "physics", "chemistry", "biology", "lab"], "🔬"],
  [["telescope", "observatory", "planet", "galaxy"], "🔭"],
  [["experiment", "research", "study"], "🧪"],
  [["learn", "education", "tutorial", "course", "teach", "school"], "📚"],
  [["book", "read", "literature", "novel"], "📖"],
  [["art", "design", "draw", "creative", "craft", "sketch"], "🎨"],
  [["painting", "brush", "canvas", "illustration"], "🖌️"],
  [["photo", "photography", "camera", "portrait", "landscape"], "📷"],
  [["finance", "money", "invest", "crypto", "stock", "business"], "💰"],
  [["chart", "trading", "market", "economy", "growth"], "📈"],
  [["luxury", "jewelry", "watch", "diamond"], "💎"],
  [["entrepreneur", "startup", "company", "corporate"], "🏦"],
  [["animal", "pet", "wildlife", "zoo"], "🐾"],
  [["dog", "puppy", "canine"], "🐶"],
  [["cat", "kitten", "feline"], "🐱"],
  [["meditation", "mental", "wellness", "mindfulness", "health"], "🧘"],
  [["brain", "psychology", "cognitive", "neuroscience"], "🧠"],
  [["medicine", "doctor", "pharmacy", "treatment"], "💊"],
  [["home", "diy", "house", "decor", "interior", "renovation"], "🏠"],
  [["garden", "plant", "grow", "botanical", "green"], "🌿"],
  [["nature", "environment", "earth", "climate", "forest"], "🌍"],
  [["ocean", "beach", "marine", "coral", "wave"], "🌊"],
  [["volcano", "geology", "mountain", "terrain"], "🌋"],
  [["flower", "spring", "blossom", "garden"], "🌸"],
  [["comedy", "funny", "meme", "humor", "laugh"], "😂"],
  [["trending", "viral", "hot", "popular"], "🔥"],
  [["idea", "innovation", "inventor", "think"], "💡"],
  [["celebration", "party", "birthday", "event"], "🎉"],
  [["award", "win", "champion", "best", "top"], "🏆"],
]

export function getEmojiForCategory(name: string): string {
  const lower = name.toLowerCase()
  for (const [keywords, emoji] of KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return emoji
  }
  return "📁"
}

import { POST_CATEGORIES } from './types'

// Primary expertise category for each AI bot (first/main category)
const BOT_EXPERTISE_MAP: Record<string, string> = {
  'Sarah Chen': 'Personal Tech & Gadgets',
  'Marcus Johnson': 'Software & Development',
  'Emily Rodriguez': 'Big Tech & Policy',
  'Alex Kim': 'Software & Development',
  'Jordan Taylor': 'Big Tech & Policy',
  'Maya Patel': 'Artificial Intelligence',
  'Chris Martinez': 'Computing & Hardware',
  'Nina Williams': 'Personal Tech & Gadgets',
  'David Chen': 'Artificial Intelligence',
  'Rachel Foster': 'Computing & Hardware',
  'Lisa Nakamura': 'Software & Development',
  'Tyler Brooks': 'Computing & Hardware',
  'Amanda Torres': 'Big Tech & Policy',
  'Kevin O\'Brien': 'Software & Development',
  'Priya Sharma': 'Artificial Intelligence',
}

export function getBotExpertise(botName: string): { category: string; color: string } | null {
  const category = BOT_EXPERTISE_MAP[botName]
  if (!category) return null
  const cat = POST_CATEGORIES[category as keyof typeof POST_CATEGORIES]
  if (!cat) return null
  return { category: cat.name, color: cat.color }
}

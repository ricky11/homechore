const DAY_MS = 86_400_000

export const mealSlots = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
]
export const mealParts = [
  { id: 'appetizer', label: 'Appetizer' },
  { id: 'main', label: 'Main' },
  { id: 'side', label: 'Side' },
]
export const defaultHousehold = {
  name: 'My Home', icon: '🏠', assignees: ['Anu', 'Swarna'],
  routinePeriods: [
    { id: 'morning', label: 'Morning', start: '06:30', end: '11:00' },
    { id: 'midday', label: 'Midday', start: '11:00', end: '15:00' },
    { id: 'evening', label: 'Evening', start: '15:00', end: '20:00' },
  ],
  offDays: { Anu: [0], Swarna: [2] },
}
export const householdIconOptions = ['🏠', '🏡', '🏢', '🌿', '☀️', '🧡'].map((icon) => ({ label: icon, value: icon }))
export const weekdays = [
  { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }, { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 }, { label: 'Sun', value: 0 },
]
export const dutyEmojiOptions = [
  '🧹', '🧺', '=🛏️', '🍳', '🧽', '🪟', '🚗', '🚙', '🚕', '🚌', '🛵', '🚲', '🅿️', '🗑️', '🛒', '🌿', '👶', '📌',
  '🧴', '🪣', '🧼', '🧻', '🧯', '🧰', '🔧', '🔑', '💡', '🔋', '🪫', '📦',
  '✉️', '📬', '📚', '🖥️', '📱', '🛁', '🚿', '🪥', '🧸', '🐕', '🐈', '🧗🏼‍♂️',
  '🌱', '💧', '🪴', '🧑‍🍳', '🥗', '🍽️', '🧃', '🚶', '🏃', '🧘', '💊', '🩺',
  '🧷', '🪡', '✂️', '🧾', '💳', '🎁', '🎂', '🗓️', '⏰', '✅', '⭐', '❤️',
].map((emoji) => ({ label: emoji, value: emoji }))
const dutyEmojiSuggestions = [
  { words: ['sheet', 'bed', 'pillow'], emoji: '🛏️' }, { words: ['laundry', 'wash', 'fold', 'clothes'], emoji: '🧺' },
  { words: ['cook', 'meal', 'kitchen', 'dish'], emoji: '🍳' }, { words: ['clean', 'sweep', 'mop', 'dust'], emoji: '🧹' },
  { words: ['bathroom', 'toilet'], emoji: '🧽' }, { words: ['window'], emoji: '🪟' }, { words: ['car'], emoji: '🚗' },
  { words: ['trash', 'recycling', 'rubbish'], emoji: '🗑️' }, { words: ['grocery', 'shopping'], emoji: '🛒' },
  { words: ['garden', 'plant'], emoji: '🌿' }, { words: ['kid', 'child', 'school'], emoji: '👶' },
  { words: ['rock', 'climb'], emoji: '🧗🏼‍♂️' },
]

export function parseDate(value) { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day) }
export function toDateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function addDays(date, amount) { return new Date(date.getTime() + amount * DAY_MS) }
export function mondayFor(date = new Date()) { const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate()); return addDays(copy, copy.getDay() === 0 ? -6 : 1 - copy.getDay()) }
export function cloneData(value) { return JSON.parse(JSON.stringify(value)) }
export function createId() { const random = globalThis.crypto.getRandomValues(new Uint32Array(2)); return `${Date.now().toString(36)}-${random[0].toString(36)}${random[1].toString(36)}` }
export function emptyMeal() { return { appetizer: null, main: null, side: null, assignee: 'Shared' } }
export function buildDays(weekStart) { return Array.from({ length: 7 }, (_, index) => ({ date: toDateKey(addDays(weekStart, index)), duties: [], meals: { breakfast: emptyMeal(), lunch: emptyMeal(), dinner: emptyMeal() }, notes: '' })) }
export function createWeek(weekKey) { return { id: weekKey, days: buildDays(parseDate(weekKey)) } }
export function minutesFor(time) { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes }
export function timeLabel(value) { const [hours, minutes] = value.split(':').map(Number); if (hours === 24) return '12:00 am'; return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'am' : 'pm'}` }
export function periodRange(period) { return `${timeLabel(period.start)}-${timeLabel(period.end)}` }
export const allTimeOptions = Array.from({ length: 48 }, (_, index) => { const value = `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`; return { label: timeLabel(value), value } })
export const periodEndOptions = [...allTimeOptions, { label: '12:00 am', value: '24:00' }]
export function dayName(day) { return parseDate(day.date).toLocaleDateString('en-GB', { weekday: 'long' }) }
export function dayNumber(day) { return parseDate(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
export function suggestedDutyEmoji(name) { const normalizedName = name.toLowerCase(); return dutyEmojiSuggestions.find(({ words }) => words.some((word) => normalizedName.includes(word)))?.emoji ?? '📌' }
export function mealImageUrl(filename) { return filename ? `/media/${encodeURIComponent(filename)}` : null }
export function slugify(value) { return `${value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}` }

// Copies only duty occurrences so each week's meals and notes remain independent.
export function copyWeek(previous, weekKey) {
  const days = buildDays(parseDate(weekKey))
  days.forEach((day, index) => { day.duties = previous.days[index].duties.map((duty) => ({ ...cloneData(duty), id: createId() })) })
  return { id: weekKey, days }
}
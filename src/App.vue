<script setup>
import { computed, h, nextTick, onMounted, ref, watch } from 'vue'
import {
  ArrowDown, ArrowLeft, ArrowUp, CalendarDays, ChevronLeft, ChevronRight, CirclePlus, Clock3, Copy,
  CookingPot, Download, House, ImagePlus, ListPlus, NotebookPen, Pencil, Printer, RotateCcw,
  Settings2, Trash2, X,
} from '@lucide/vue'
import {
  NButton as Button,
  NCard,
  NCheckbox as Checkbox,
  NInput as InputText,
  NInput as Textarea,
  NModal,
  NSelect as Select,
  useMessage,
} from 'naive-ui'
import seed from './data/seed.json'

const DAY_MS = 86_400_000

const mealSlots = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
]
const mealParts = [
  { id: 'appetizer', label: 'Appetizer' },
  { id: 'main', label: 'Main' },
  { id: 'side', label: 'Side' },
]
const defaultHousehold = {
  name: 'My Home',
  icon: '🏠',
  assignees: ['Anu', 'Swarna'],
  routinePeriods: [
    { id: 'morning', label: 'Morning', start: '06:30', end: '11:00' },
    { id: 'midday', label: 'Midday', start: '11:00', end: '15:00' },
    { id: 'evening', label: 'Evening', start: '15:00', end: '20:00' },
  ],
  offDays: { Anu: [0], Swarna: [2] },
}
const householdIconOptions = ['🏠', '🏡', '🏢', '🌿', '☀️', '🧡']
  .map((icon) => ({ label: icon, value: icon }))
const weekdays = [
  { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }, { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 }, { label: 'Sun', value: 0 },
]
const dutyEmojiOptions = [
  '🧹', '🧺', '🛏️', '🍳', '🧽', '🪟', '🚗', '🚙', '🚕', '🚌', '🛵', '🚲', '🅿️', '🗑️', '🛒', '🌿', '👶', '📌',
  '🧴', '🪣', '🧼', '🧻', '🧯', '🧰', '🔧', '🔑', '💡', '🔋', '🪫', '📦',
  '✉️', '📬', '📚', '🖥️', '📱', '🛁', '🚿', '🪥', '🧸', '🐕', '🐈',
  '🌱', '💧', '🪴', '🧑‍🍳', '🥗', '🍽️', '🧃', '🚶', '🏃', '🧘', '💊', '🩺',
  '🧷', '🪡', '✂️', '🧾', '💳', '🎁', '🎂', '🗓️', '⏰', '✅', '⭐', '❤️',
]
  .map((emoji) => ({ label: emoji, value: emoji }))
const dutyEmojiSuggestions = [
  { words: ['sheet', 'bed', 'pillow'], emoji: '🛏️' },
  { words: ['laundry', 'wash', 'fold', 'clothes'], emoji: '🧺' },
  { words: ['cook', 'meal', 'kitchen', 'dish'], emoji: '🍳' },
  { words: ['clean', 'sweep', 'mop', 'dust'], emoji: '🧹' },
  { words: ['bathroom', 'toilet'], emoji: '🧽' },
  { words: ['window'], emoji: '🪟' },
  { words: ['car'], emoji: '🚗' },
  { words: ['trash', 'recycling', 'rubbish'], emoji: '🗑️' },
  { words: ['grocery', 'shopping'], emoji: '🛒' },
  { words: ['garden', 'plant'], emoji: '🌿' },
  { words: ['kid', 'child', 'school'], emoji: '👶' },
]
const allTimeOptions = Array.from({ length: 48 }, (_, index) => {
  const value = `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`
  return { label: timeLabel(value), value }
})
const periodEndOptions = [...allTimeOptions, { label: '12:00 am', value: '24:00' }]

const weeks = ref({})
const currentWeek = ref(null)
const catalog = ref({ duties: [], meals: [] })
const household = ref({ ...defaultHousehold })
const selectedDayIndex = ref(null)
const loading = ref(true)
const serverError = ref('')
const clearDialogOpen = ref(false)
const optionsDialogOpen = ref(false)
const optionMode = ref('household')
const newDuty = ref({ name: '', area: '', emoji: '' })
const newMeal = ref({ name: '', type: 'main', image: null })
const newAssignee = ref('')
const householdError = ref('')
const routineError = ref('')
const editingOption = ref(null)
const imageError = ref('')
const saveState = ref('Saved')
const previousWeekAvailable = ref(false)
const message = useMessage()
let saveTimer
let hydrating = false

const selectedDay = computed(() => {
  if (selectedDayIndex.value === null || !currentWeek.value) return null
  return currentWeek.value.days[selectedDayIndex.value]
})
const weekLabel = computed(() => {
  if (!currentWeek.value) return ''
  const start = parseDate(currentWeek.value.id)
  const end = addDays(start, 6)
  const first = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const last = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${first} – ${last}`
})
const dutyOptions = computed(() =>
  catalog.value.duties.map((duty) => ({ label: `${duty.emoji || suggestedDutyEmoji(duty.name)} ${duty.name} · ${duty.area}`, value: duty.id })),
)
const assigneeOptions = computed(() => [
  ...household.value.assignees.map((value) => ({ label: value, value })),
  { label: 'Shared', value: 'Shared' },
])
const periods = computed(() => household.value.routinePeriods)
const periodOptions = computed(() => periods.value.map((period) => ({ label: period.label, value: period.id })))
const weekIsBlank = computed(() => currentWeek.value?.days.every((day) =>
  day.duties.length === 0
  && !day.notes.trim()
  && mealSlots.every((slot) => mealParts.every((part) => !day.meals[slot.id][part.id])),
))

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date, amount) {
  return new Date(date.getTime() + amount * DAY_MS)
}

function mondayFor(date = new Date()) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = copy.getDay() === 0 ? -6 : 1 - copy.getDay()
  return addDays(copy, offset)
}

function emptyMeal() {
  return { appetizer: null, main: null, side: null, assignee: 'Shared' }
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value))
}

function createId() {
  const random = globalThis.crypto.getRandomValues(new Uint32Array(2))
  return `${Date.now().toString(36)}-${random[0].toString(36)}${random[1].toString(36)}`
}

function buildDays(weekStart) {
  return Array.from({ length: 7 }, (_, index) => ({
    date: toDateKey(addDays(weekStart, index)),
    duties: [],
    meals: { breakfast: emptyMeal(), lunch: emptyMeal(), dinner: emptyMeal() },
    notes: '',
  }))
}

function snapshotDuty(dutyId, period = periods.value[0]?.id ?? 'morning', assignee = 'Shared', time = '') {
  const source = catalog.value.duties.find((duty) => duty.id === dutyId)
  return {
    id: createId(), sourceId: dutyId, name: source?.name ?? 'New duty',
    area: source?.area ?? 'General', emoji: source?.emoji ?? '', period, assignee, time,
  }
}

function copyWeek(previous, weekKey) {
  const days = buildDays(parseDate(weekKey))
  days.forEach((day, index) => {
    day.duties = previous.days[index].duties.map((duty) => ({
      ...cloneData(duty), id: createId(),
    }))
  })
  return { id: weekKey, days }
}

function createWeek(weekKey) {
  return { id: weekKey, days: buildDays(parseDate(weekKey)) }
}

async function getPreviousWeek(weekKey) {
  const previousKey = toDateKey(addDays(parseDate(weekKey), -7))
  return weeks.value[previousKey] ?? null
}

async function loadWeek(weekKey) {
  hydrating = true
  saveState.value = 'Saved'
  currentWeek.value = weeks.value[weekKey] ?? createWeek(weekKey)
  previousWeekAvailable.value = Boolean(await getPreviousWeek(weekKey))
  if (!weeks.value[weekKey]) await saveWeek(currentWeek.value)
  await nextTick()
  hydrating = false
}

async function fetchSharedState() {
  const response = await fetch('/api/state')
  if (!response.ok) throw new Error('Could not load planner data.')
  const state = await response.json()
  weeks.value = state.weeks ?? {}
  catalog.value = state.catalog ?? cloneData(seed)
  household.value = { ...defaultHousehold, ...state.household }
  if (!Array.isArray(household.value.assignees) || !household.value.assignees.length) {
    household.value.assignees = [...defaultHousehold.assignees]
  }
}

async function saveWeek(week) {
  const snapshot = cloneData(week)
  weeks.value[snapshot.id] = snapshot
  await persistState({ week: snapshot })
}

async function persistState(update) {
  const response = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error ?? 'Could not save planner data.')
  }
}

async function copyPreviousWeek() {
  const previous = await getPreviousWeek(currentWeek.value.id)
  if (!previous) return
  hydrating = true
  currentWeek.value = copyWeek(previous, currentWeek.value.id)
  await saveWeek(currentWeek.value)
  await nextTick()
  hydrating = false
}

async function navigateWeek(amount) {
  selectedDayIndex.value = null
  await fetchSharedState()
  await loadWeek(toDateKey(addDays(parseDate(currentWeek.value.id), amount * 7)))
}

async function goToToday() {
  selectedDayIndex.value = null
  await fetchSharedState()
  await loadWeek(toDateKey(mondayFor()))
}

function printSchedule() {
  globalThis.print()
}

function pdfFilename(label) {
  return `homechore-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${currentWeek.value.id}.pdf`
}

function drawPdfEmoji(pdf, emoji, x, y, size) {
  const iconCanvas = globalThis.document.createElement('canvas')
  iconCanvas.width = 64
  iconCanvas.height = 64
  const context = iconCanvas.getContext('2d')
  context.font = '48px sans-serif'
  context.fillText(emoji, 6, 50)
  pdf.addImage(iconCanvas.toDataURL('image/png'), 'PNG', x, y, size, size)
}

function writePdfHeader(pdf, title, subtitle) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  pdf.setFillColor(38, 116, 90)
  pdf.rect(0, 0, pageWidth, 20, 'F')
  drawPdfEmoji(pdf, household.value.icon, 10, 5, 9)
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('HomeChore', 22, 9)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text(household.value.name, 22, 15)
  pdf.setFontSize(8)
  pdf.text(title, pageWidth - 10, 9, { align: 'right' })
  pdf.text(subtitle, pageWidth - 10, 15, { align: 'right' })
  pdf.setTextColor(38, 51, 47)
}

function writePdfSettings(pdf, position, width, size) {
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(size)
  const settings = `Assignees: ${household.value.assignees.join(', ')} | Routine: ${periods.value.map((period) => `${period.label} ${periodRange(period)}`).join(' | ')}`
  const lines = pdf.splitTextToSize(settings, width)
  pdf.text(lines, 12, position)
  return position + lines.length * (size * 0.48) + 3
}

function writeDailyPdf(pdf, day) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const fontSize = 8
  const lineHeight = fontSize * 0.52
  const pageBottom = pageHeight - 12
  let position = 27
  let pageFull = false
  writePdfHeader(pdf, 'Daily plan', `${dayName(day)}, ${dayNumber(day)}`)
  position = writePdfSettings(pdf, position, pageWidth - 24, 7)
  const availability = availabilityFor(day)
    if (availability) {
    pdf.setTextColor(138, 53, 40)
    pdf.setFontSize(7)
    pdf.text(availability, 12, position)
    pdf.setTextColor(38, 51, 47)
    position += 5
  }

  const writeLines = (text, indent = 12, emoji = '') => {
    if (pageFull) return
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(fontSize)
    const lines = pdf.splitTextToSize(text, pageWidth - indent - 12)
    const lineCapacity = Math.floor((pageBottom - position) / lineHeight)
    if (lineCapacity < 1) {
      pageFull = true
      return
    }
    const visibleLines = lines.slice(0, lineCapacity)
    if (visibleLines.length < lines.length) {
      visibleLines[visibleLines.length - 1] = `${visibleLines[visibleLines.length - 1].replace(/\s+$/, '')}...`
      pageFull = true
    }
    if (emoji) drawPdfEmoji(pdf, emoji, indent, position - 3.6, 4)
    pdf.text(visibleLines, indent + (emoji ? 6 : 0), position)
    position += visibleLines.length * lineHeight + 1.5
  }

  for (const period of periods.value) {
    if (pageFull || position + 5 > pageBottom) {
      pageFull = true
      break
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(38, 116, 90)
    pdf.setFontSize(9)
    pdf.text(`${period.label}  ${periodRange(period)}`, 12, position)
    pdf.setTextColor(38, 51, 47)
    position += 5
    const duties = dutiesFor(day, period.id)
    if (!duties.length) writeLines('No duties planned', 18)
    for (const duty of duties) {
      const timing = duty.time ? `${timeLabel(duty.time)} - ` : ''
      writeLines(`${timing}${duty.name} (${duty.assignee})`, 18, dutyEmoji(duty))
    }
  }

  const meals = mealSummary(day)
  if (meals.length && !pageFull && position + 5 <= pageBottom) {
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(123, 91, 18)
    pdf.setFontSize(9)
    pdf.text('Meals', 12, position)
    pdf.setTextColor(38, 51, 47)
    position += 5
    for (const meal of meals) writeLines(`${meal.label}: ${meal.value}`, 18)
  }
  if (day.notes.trim() && !pageFull && position + 5 <= pageBottom) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text('Notes', 12, position)
    position += 5
    writeLines(day.notes, 18)
  }
  if (pageFull) message.warning('Some detail was shortened to keep this daily plan on one page.')
}

function writeWeeklyPdf(pdf) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 7
  const gap = 3
  const weekdayWidth = (pageWidth - (margin * 2) - (gap * 4)) / 5
  const weekendWidth = (pageWidth - (margin * 2) - gap) / 2
  const topY = 42
  const topHeight = 113
  const bottomY = topY + topHeight + gap
  writePdfHeader(pdf, 'Weekly plan', weekLabel.value)
  writePdfSettings(pdf, 25, pageWidth - 24, 6)

  currentWeek.value.days.forEach((day, index) => {
    const weekend = index > 4
    const panelWidth = weekend ? weekendWidth : weekdayWidth
    const x = weekend ? margin + (index - 5) * (weekendWidth + gap) : margin + index * (weekdayWidth + gap)
    const panelY = weekend ? bottomY : topY
    const panelHeight = weekend ? pageHeight - bottomY - 7 : topHeight
    const panelBottom = panelY + panelHeight - 4
    let position = panelY + 14
    let panelFull = false
    const writePanelText = (text, size = weekend ? 10.5 : 9.5, indent = 0, emoji = '') => {
      if (panelFull) return
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(size)
      const lines = pdf.splitTextToSize(text, panelWidth - indent - (emoji ? 5 : 0))
      const lineHeight = size * 0.5
      const lineCapacity = Math.floor((panelBottom - position) / lineHeight)
      if (lineCapacity < 1) {
        panelFull = true
        return
      }
      const visibleLines = lines.slice(0, lineCapacity)
      if (visibleLines.length < lines.length) {
        visibleLines[visibleLines.length - 1] = `${visibleLines[visibleLines.length - 1].replace(/\s+$/, '')}...`
        panelFull = true
      }
      if (emoji) drawPdfEmoji(pdf, emoji, x + indent, position - 3.8, 4.8)
      pdf.text(visibleLines, x + indent + (emoji ? 5.5 : 0), position)
      position += visibleLines.length * lineHeight + 2
    }
    const writePanelHeading = (label, fill, text) => {
      const headingHeight = weekend ? 5.5 : 4.8
      if (panelFull || position + headingHeight > panelBottom) {
        panelFull = true
        return
      }
      pdf.setFillColor(...fill)
      pdf.rect(x + 2, position - 3.6, panelWidth - 4, weekend ? 5 : 4.4, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...text)
      pdf.setFontSize(weekend ? 10 : 9)
      const heading = pdf.splitTextToSize(label, panelWidth - 7)[0]
      pdf.text(heading.length < label.length ? `${heading.replace(/\s+$/, '')}...` : heading, x + 3, position)
      pdf.setTextColor(38, 51, 47)
      position += headingHeight
    }
    pdf.setFillColor(237, 246, 241)
    pdf.rect(x, panelY, panelWidth, panelHeight, 'F')
    pdf.setFillColor(38, 116, 90)
    pdf.rect(x, panelY, panelWidth, 11, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(weekend ? 16 : 13)
    pdf.text(dayName(day), x + 3, panelY + 5.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(weekend ? 8 : 7)
    pdf.text(dayNumber(day), x + 3, panelY + 9.5)
    pdf.setTextColor(38, 51, 47)
    pdf.setFont('helvetica', 'normal')
    const availability = availabilityFor(day)
    if (availability) writePanelText(availability, weekend ? 9.5 : 8.5, 3)
    for (const period of periods.value) {
      writePanelHeading(`${period.label} | ${periodRange(period)}`, [215, 234, 225], [38, 116, 90])
      if (panelFull) break
      const duties = dutiesFor(day, period.id)
      if (!duties.length) writePanelText('Open', weekend ? 9.5 : 8.5, 4)
      for (const duty of duties) writePanelText(`${duty.time ? `${timeLabel(duty.time)} ` : ''}${duty.name} (${duty.assignee})`, weekend ? 10.2 : 9.2, 4, dutyEmoji(duty))
    }
    const meals = mealSummary(day)
    if (meals.length && !panelFull) {
      writePanelHeading('Meals', [255, 244, 207], [123, 91, 18])
      for (const meal of meals) writePanelText(`${meal.label}: ${meal.value}`, weekend ? 9.5 : 8.5, 4)
    }
    if (day.notes.trim() && !panelFull) {
      writePanelHeading('Notes', [232, 237, 234], [38, 51, 47])
      writePanelText(day.notes, weekend ? 9.5 : 8.5, 4)
    }
  })
}

async function downloadCurrentPlanPdf() {
  if (!currentWeek.value) return
  try {
    const { jsPDF } = await import('jspdf')
    if (selectedDay.value) {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      writeDailyPdf(pdf, selectedDay.value)
      pdf.save(pdfFilename(`daily-${selectedDay.value.date}`))
      return
    }
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
    writeWeeklyPdf(pdf)
    pdf.save(pdfFilename('weekly'))
  } catch {
    message.error('Could not create this PDF.')
  }
}

function retryConnection() {
  globalThis.location.reload()
}

function scheduleSave() {
  if (hydrating || !currentWeek.value) return
  saveState.value = 'Saving…'
  clearTimeout(saveTimer)
  const snapshot = cloneData(currentWeek.value)
  saveTimer = setTimeout(async () => {
    try {
      await saveWeek(snapshot)
      saveState.value = 'Saved'
    } catch {
      saveState.value = 'Save failed'
    }
  }, 250)
}

function dayName(day) {
  return parseDate(day.date).toLocaleDateString('en-GB', { weekday: 'long' })
}

function dayNumber(day) {
  return parseDate(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function availabilityFor(day) {
  const weekday = parseDate(day.date).getDay()
  return household.value.assignees
    .filter((assignee) => household.value.offDays[assignee]?.includes(weekday))
    .map((assignee) => `${assignee} off`)
    .join(' · ')
}

function dutiesFor(day, periodId) {
  return day.duties.filter((duty) => duty.period === periodId)
}

function mealOptions(type) {
  return catalog.value.meals
    .filter((meal) => meal.type === type)
    .map((meal) => ({ label: meal.name, value: meal.id, image: mealImageUrl(meal.image) }))
}

function mealImageUrl(filename) {
  return filename ? `/media/${encodeURIComponent(filename)}` : null
}

function renderMealLabel(option) {
  return h('span', { class: 'meal-option-label' }, [
    option.image
      ? h('img', { src: option.image, alt: '', class: 'meal-option-image' })
      : h(CookingPot, { size: 17, 'aria-hidden': 'true' }),
    h('span', option.label),
  ])
}

function mealName(id) {
  return catalog.value.meals.find((meal) => meal.id === id)?.name ?? ''
}

function mealSummary(day) {
  return mealSlots.flatMap((slot) => {
    const meal = day.meals[slot.id]
    const choices = mealParts.map((part) => mealName(meal[part.id])).filter(Boolean)
    return choices.length ? [{ label: slot.label, value: choices.join(' · ') }] : []
  })
}

function addDuty(day, periodId) {
  if (catalog.value.duties[0]) {
    day.duties.push(snapshotDuty(catalog.value.duties[0].id, periodId))
    return
  }
  day.duties.push({
    id: createId(), sourceId: null, name: '', area: 'General',
    period: periodId, assignee: 'Shared', time: '',
  })
}

function minutesFor(time) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function timeLabel(value) {
  const [hours, minutes] = value.split(':').map(Number)
  if (hours === 24) return '12:00 am'
  const suffix = hours < 12 ? 'am' : 'pm'
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

function periodRange(period) {
  return `${timeLabel(period.start)}-${timeLabel(period.end)}`
}

function timeOptionsFor(periodId) {
  const period = periods.value.find((item) => item.id === periodId)
  if (!period) return []
  return allTimeOptions.filter((option) =>
    minutesFor(option.value) >= minutesFor(period.start) && minutesFor(option.value) < minutesFor(period.end),
  )
}

function changeDutyPeriod(duty, periodId) {
  duty.period = periodId
  if (duty.time && !timeOptionsFor(periodId).some((option) => option.value === duty.time)) duty.time = ''
}

function suggestedDutyEmoji(name) {
  const normalizedName = name.toLowerCase()
  return dutyEmojiSuggestions.find(({ words }) => words.some((word) => normalizedName.includes(word)))?.emoji ?? '📌'
}

function dutyEmoji(duty) {
  return catalog.value.duties.find((option) => option.id === duty.sourceId)?.emoji
    || duty.emoji
    || suggestedDutyEmoji(duty.name)
}

async function changeDuty(duty, sourceId) {
  let source = catalog.value.duties.find((item) => item.id === sourceId)
  if (!source && typeof sourceId === 'string' && sourceId.trim()) {
    source = {
      id: slugify(sourceId), name: sourceId.trim(), area: 'General',
      emoji: suggestedDutyEmoji(sourceId),
    }
    catalog.value.duties.push(source)
    await saveCatalog()
  }
  if (!source) return
  Object.assign(duty, { sourceId: source.id, name: source.name, area: source.area, emoji: source.emoji ?? '' })
}

function removeDuty(day, dutyId) {
  day.duties = day.duties.filter((duty) => duty.id !== dutyId)
}

async function clearWeek() {
  const fresh = {
    id: currentWeek.value.id,
    days: buildDays(parseDate(currentWeek.value.id)),
  }
  hydrating = true
  currentWeek.value = fresh
  await saveWeek(fresh)
  clearDialogOpen.value = false
  await nextTick()
  hydrating = false
}

function slugify(value) {
  return `${value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
}

async function saveCatalog() {
  await persistState({ catalog: cloneData(catalog.value) })
}

async function saveHousehold() {
  const name = household.value.name.trim()
  const assignees = household.value.assignees
    .map((assignee) => assignee.trim())
    .filter(Boolean)
  if (!name || !assignees.length || assignees.includes('Shared') || new Set(assignees).size !== assignees.length) {
    householdError.value = 'Use a home name and unique Assignee names.'
    return
  }
  household.value = {
    ...household.value,
    name,
    icon: household.value.icon || defaultHousehold.icon,
    assignees: [...new Set(assignees)],
  }
  try {
    await persistState({ household: cloneData(household.value) })
    householdError.value = ''
  } catch (error) {
    householdError.value = error.message
  }
}

function addAssignee() {
  const name = newAssignee.value.trim()
  if (!name || household.value.assignees.includes(name) || name === 'Shared') return
  household.value.assignees.push(name)
  newAssignee.value = ''
}

function removeAssignee(name) {
  if (household.value.assignees.length === 1 || assigneeInUse(name)) return
  household.value.assignees = household.value.assignees.filter((assignee) => assignee !== name)
  delete household.value.offDays[name]
}

function assigneeInUse(assignee) {
  return Object.values(weeks.value).some((week) => week.days.some((day) =>
    day.duties.some((duty) => duty.assignee === assignee)
    || mealSlots.some((slot) => day.meals[slot.id].assignee === assignee),
  ))
}

function renameAssignee(index, value) {
  const current = household.value.assignees[index]
  const name = value.trim()
  if (!name || name === current || name === 'Shared' || household.value.assignees.includes(name)) return
  household.value.assignees[index] = name
  household.value.offDays[name] = household.value.offDays[current] ?? []
  delete household.value.offDays[current]
}

function setOffDay(assignee, weekday, checked) {
  const current = household.value.offDays[assignee] ?? []
  household.value.offDays[assignee] = checked
    ? [...new Set([...current, weekday])]
    : current.filter((day) => day !== weekday)
}

function periodInUse(periodId) {
  return Object.values(weeks.value).some((week) => week.days.some((day) =>
    day.duties.some((duty) => duty.period === periodId),
  ))
}

function addRoutinePeriod() {
  if (household.value.routinePeriods.length === 6) return
  const occupied = household.value.routinePeriods.map((period) => ({
    start: minutesFor(period.start), end: minutesFor(period.end),
  }))
  const start = Array.from({ length: 47 }, (_, index) => index * 30)
    .find((minute) => !occupied.some((range) => minute < range.end && range.start < minute + 30))
  if (start === undefined) return
  const toTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  household.value.routinePeriods.push({
    id: `period-${Date.now().toString(36)}`,
    label: 'New period',
    start: toTime(start),
    end: toTime(start + 30),
  })
}

function moveRoutinePeriod(index, amount) {
  const target = index + amount
  if (target < 0 || target >= household.value.routinePeriods.length) return
  const [period] = household.value.routinePeriods.splice(index, 1)
  household.value.routinePeriods.splice(target, 0, period)
}

function removeRoutinePeriod(index) {
  const period = household.value.routinePeriods[index]
  if (household.value.routinePeriods.length === 2 || periodInUse(period.id)) return
  household.value.routinePeriods.splice(index, 1)
}

async function saveRoutine() {
  await saveHousehold()
  routineError.value = householdError.value
}

async function addDutyOption() {
  if (!newDuty.value.name.trim() || !newDuty.value.area.trim()) return
  catalog.value.duties.push({
    id: slugify(newDuty.value.name),
    name: newDuty.value.name.trim(),
    area: newDuty.value.area.trim(),
    emoji: newDuty.value.emoji || suggestedDutyEmoji(newDuty.value.name),
  })
  newDuty.value = { name: '', area: '', emoji: '' }
  await saveCatalog()
}

async function addMealOption() {
  if (!newMeal.value.name.trim()) return
  catalog.value.meals.push({
    id: slugify(newMeal.value.name),
    name: newMeal.value.name.trim(),
    type: newMeal.value.type,
    image: newMeal.value.image,
  })
  newMeal.value = { name: '', type: 'main', image: null }
  await saveCatalog()
}

async function imageToWebp(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Please choose an image smaller than 5 MB.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('Could not process this image.')),
    'image/webp',
    0.82,
  ))
}

async function uploadMealImage(blob) {
  const form = new FormData()
  form.append('image', blob, 'meal.webp')
  const response = await fetch('/api/media', { method: 'POST', body: form })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error ?? 'Could not save this image.')
  return result.filename
}

async function handleMealImage(event, target) {
  const [file] = event.target.files
  if (!file) return
  imageError.value = ''
  try {
    target.image = await uploadMealImage(await imageToWebp(file))
  } catch (error) {
    imageError.value = error.message
    message.error(error.message)
  } finally {
    event.target.value = ''
  }
}

function startEditOption(kind, option) {
  editingOption.value = { kind, originalId: option.id, ...cloneData(option) }
}

async function commitOptionEdit() {
  const edit = editingOption.value
  if (!edit?.name.trim()) return
  const collection = edit.kind === 'duty' ? catalog.value.duties : catalog.value.meals
  const target = collection.find((item) => item.id === edit.originalId)
  if (target) {
    target.name = edit.name.trim()
    if (edit.kind === 'duty') {
      target.area = edit.area.trim() || 'General'
      target.emoji = edit.emoji || suggestedDutyEmoji(edit.name)
    }
    else {
      target.type = edit.type
      target.image = edit.image ?? null
    }
  }
  editingOption.value = null
  await saveCatalog()
}

async function deleteOption(kind, id) {
  if (kind === 'duty') catalog.value.duties = catalog.value.duties.filter((item) => item.id !== id)
  else catalog.value.meals = catalog.value.meals.filter((item) => item.id !== id)
  await saveCatalog()
}

watch(currentWeek, scheduleSave, { deep: true })

onMounted(async () => {
  try {
    await fetchSharedState()
    await loadWeek(toDateKey(mondayFor()))
  } catch {
    serverError.value = 'The shared planner server is unavailable. Start it with npm run dev or npm start.'
    saveState.value = 'Server unavailable'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <div class="brand-block">
        <div class="brand-mark" aria-hidden="true">{{ household.icon }}</div>
        <div>
          <p class="eyebrow">{{ household.name }}</p>
          <h1>HomeChore</h1>
          <p class="subtitle">A simple household routine and meal planner for busy families and their helpers.</p>
        </div>
      </div>
      <div class="header-actions no-print">
        <span class="save-state">{{ saveState }}</span>
        <Button secondary aria-label="Manage options" @click="optionsDialogOpen = true"><Settings2 :size="18" /><span class="action-label">Manage</span></Button>
        <Button secondary :disabled="loading || Boolean(serverError) || !currentWeek" aria-label="Download current plan as PDF" @click="downloadCurrentPlanPdf"><Download :size="18" /><span class="action-label">Download PDF</span></Button>
        <Button secondary aria-label="Print current plan" @click="printSchedule"><Printer :size="18" /><span class="action-label">Print</span></Button>
      </div>
    </header>

    <div v-if="loading" class="loading-state"><CalendarDays :size="32" /><span>Opening your planner…</span></div>

    <section v-else-if="serverError" class="loading-state server-error">
      <CalendarDays :size="32" />
      <h2>Planner server unavailable</h2>
      <p>{{ serverError }}</p>
      <Button type="primary" @click="retryConnection">Try again</Button>
    </section>

    <template v-else>
      <section class="week-toolbar no-print" aria-label="Week navigation">
        <Button quaternary circle aria-label="Previous week" @click="navigateWeek(-1)"><ChevronLeft :size="22" /></Button>
        <div class="week-title"><p>Week plan</p><h2>{{ weekLabel }}</h2></div>
        <Button quaternary circle aria-label="Next week" @click="navigateWeek(1)"><ChevronRight :size="22" /></Button>
        <Button class="today-button" secondary type="primary" size="small" @click="goToToday">Today</Button>
      </section>

      <Transition name="view" mode="out-in">
        <section v-if="selectedDay" :key="selectedDay.date" class="day-detail">
          <div class="detail-heading">
            <Button class="no-print" quaternary @click="selectedDayIndex = null"><ArrowLeft :size="18" /><span>{{ weekLabel }}</span></Button>
            <div>
              <p class="eyebrow">Daily plan</p>
              <h2>{{ dayName(selectedDay) }}, {{ dayNumber(selectedDay) }}</h2>
              <span v-if="availabilityFor(selectedDay)" class="availability">{{ availabilityFor(selectedDay) }}</span>
            </div>
          </div>

          <div class="detail-layout">
            <div class="duty-editor">
              <section v-for="period in periods" :key="period.id" class="period-section">
                <div class="section-heading">
                  <div><p class="period-time"><Clock3 :size="15" /> {{ periodRange(period) }}</p><h3>{{ period.label }}</h3></div>
                  <Button class="no-print" quaternary size="small" @click="addDuty(selectedDay, period.id)"><CirclePlus :size="17" /><span>Add duty</span></Button>
                </div>
                <div v-if="!dutiesFor(selectedDay, period.id).length" class="empty-line">No duties planned</div>
                <article v-for="duty in dutiesFor(selectedDay, period.id)" :key="duty.id" class="duty-row" :data-assignee="duty.assignee.toLowerCase()">
                  <div class="duty-choice"><span class="duty-emoji" aria-hidden="true">{{ dutyEmoji(duty) }}</span><Select class="duty-select" :value="duty.sourceId" :options="dutyOptions" filterable tag aria-label="Duty or new duty" @update:value="changeDuty(duty, $event)" /></div>
                  <Select :value="duty.period" :options="periodOptions" aria-label="Routine Period" @update:value="changeDutyPeriod(duty, $event)" />
                  <Select v-model:value="duty.time" :options="timeOptionsFor(duty.period)" clearable placeholder="Optional time" aria-label="Optional exact time" />
                  <Select v-model:value="duty.assignee" :options="assigneeOptions" aria-label="Assigned to" />
                  <Button class="no-print" quaternary circle type="error" aria-label="Remove duty" @click="removeDuty(selectedDay, duty.id)"><Trash2 :size="17" /></Button>
                </article>
              </section>
            </div>

            <aside class="meal-editor">
              <div class="section-heading"><div><p class="period-time"><CookingPot :size="15" /> Meal plan</p><h3>Meals</h3></div></div>
              <section v-for="slot in mealSlots" :key="slot.id" class="meal-slot">
                <h4>{{ slot.label }}</h4>
                <div class="meal-fields">
                  <label v-for="part in mealParts" :key="part.id">
                    <span>{{ part.label }}</span>
                    <Select v-model:value="selectedDay.meals[slot.id][part.id]" :options="mealOptions(part.id)" :render-label="renderMealLabel" filterable clearable :placeholder="`No ${part.label.toLowerCase()}`" />
                  </label>
                  <label><span>Prepared by</span><Select v-model:value="selectedDay.meals[slot.id].assignee" :options="assigneeOptions" /></label>
                </div>
              </section>
              <label class="notes-field"><span><NotebookPen :size="16" /> Notes for the day</span><Textarea v-model:value="selectedDay.notes" type="textarea" autosize :rows="3" placeholder="Add a reminder…" /></label>
            </aside>
          </div>
        </section>

        <section v-else key="week" class="week-view">
          <div class="board-scroll">
            <div class="week-board">
              <button v-for="(day, index) in currentWeek.days" :key="day.date" class="day-column" type="button" @click="selectedDayIndex = index">
                <header class="day-heading"><div><span>{{ dayNumber(day) }}</span><h3>{{ dayName(day) }}</h3></div><ChevronRight class="open-day no-print" :size="18" /></header>
                <p v-if="availabilityFor(day)" class="availability">{{ availabilityFor(day) }}</p>
                <div v-for="period in periods" :key="period.id" class="overview-period">
                  <p class="overview-time">{{ periodRange(period) }}</p>
                  <div v-if="!dutiesFor(day, period.id).length" class="empty-slot">Open</div>
                  <div v-for="duty in dutiesFor(day, period.id)" :key="duty.id" class="duty-chip" :data-assignee="duty.assignee.toLowerCase()"><span><b class="duty-emoji" aria-hidden="true">{{ dutyEmoji(duty) }}</b>{{ duty.name }}</span><small>{{ duty.time || duty.assignee }}</small></div>
                </div>
                <div v-if="mealSummary(day).length" class="meal-summary">
                  <p><CookingPot :size="14" /> Meals</p>
                  <div v-for="meal in mealSummary(day)" :key="meal.label"><strong>{{ meal.label }}</strong><span>{{ meal.value }}</span></div>
                </div>
              </button>
            </div>
          </div>
          <footer class="board-footer no-print">
            <p>{{ weekIsBlank ? 'This week is blank. Add duties or copy the previous week.' : 'Select any day to edit duties, meals, and notes.' }}</p>
            <div class="footer-actions">
              <Button v-if="weekIsBlank" type="primary" :disabled="!previousWeekAvailable" :title="previousWeekAvailable ? 'Copy duties from the previous saved week' : 'No previous saved week is available'" @click="copyPreviousWeek">
                <Copy :size="17" /><span>Copy Previous Week Data</span>
              </Button>
              <Button type="error" quaternary @click="clearDialogOpen = true"><RotateCcw :size="17" /><span>Clear week</span></Button>
            </div>
          </footer>
        </section>
      </Transition>
    </template>

    <NModal v-model:show="clearDialogOpen">
      <NCard class="modal-card" title="Clear this week?" role="dialog" aria-modal="true">
        <p>This permanently removes every duty, meal, and note from this week. Other weeks will not be changed.</p>
        <template #footer><div class="modal-actions"><Button quaternary @click="clearDialogOpen = false">Cancel</Button><Button type="error" @click="clearWeek">Clear week</Button></div></template>
      </NCard>
    </NModal>

    <NModal v-model:show="optionsDialogOpen">
      <NCard class="modal-card options-card" title="Manage planner options" role="dialog" aria-modal="true" closable @close="optionsDialogOpen = false">
      <div class="option-switch">
        <Button :type="optionMode === 'household' ? 'primary' : 'default'" @click="optionMode = 'household'"><House :size="17" /> Household</Button>
        <Button :type="optionMode === 'routine' ? 'primary' : 'default'" @click="optionMode = 'routine'"><Clock3 :size="17" /> Routine</Button>
        <Button :type="optionMode === 'duties' ? 'primary' : 'default'" @click="optionMode = 'duties'"><ListPlus :size="17" /> Duties</Button>
        <Button :type="optionMode === 'meals' ? 'primary' : 'default'" @click="optionMode = 'meals'"><CookingPot :size="17" /> Meals</Button>
      </div>
      <template v-if="optionMode === 'household'">
        <form class="household-form" @submit.prevent="saveHousehold">
          <label><span>Home name</span><InputText v-model:value="household.name" placeholder="My Home" aria-label="Home name" /></label>
          <label><span>Icon</span><Select v-model:value="household.icon" :options="householdIconOptions" aria-label="Home icon" /></label>
          <div class="assignee-fields">
            <span>Assignees</span>
            <div v-for="(assignee, index) in household.assignees" :key="`${assignee}-${index}`" class="assignee-row">
              <InputText :value="assignee" :disabled="assigneeInUse(assignee)" :title="assigneeInUse(assignee) ? 'Move planned work before renaming this Assignee' : undefined" :aria-label="`${assignee} name`" @update:value="renameAssignee(index, $event)" />
              <Button quaternary circle type="error" :disabled="household.assignees.length === 1 || assigneeInUse(assignee)" :title="assigneeInUse(assignee) ? 'Move planned work before removing this Assignee' : undefined" :aria-label="`Remove ${assignee}`" @click="removeAssignee(assignee)"><X :size="16" /></Button>
            </div>
            <div class="add-assignee"><InputText v-model:value="newAssignee" placeholder="Add a person" aria-label="New Assignee name" @keyup.enter.prevent="addAssignee" /><Button secondary @click="addAssignee"><CirclePlus :size="17" /> Add</Button></div>
          </div>
          <p v-if="householdError" class="form-error">{{ householdError }}</p>
          <div class="modal-actions"><Button type="primary" attr-type="submit">Save household</Button></div>
        </form>
      </template>
      <template v-else-if="optionMode === 'routine'">
        <div class="routine-editor">
          <div class="section-heading"><div><p class="period-time"><Clock3 :size="15" /> Daily routine</p><h3>Routine periods</h3></div><Button secondary :disabled="household.routinePeriods.length === 6" @click="addRoutinePeriod"><CirclePlus :size="17" /> Add period</Button></div>
          <article v-for="(period, index) in household.routinePeriods" :key="period.id" class="routine-row">
            <InputText v-model:value="period.label" aria-label="Routine Period name" />
            <Select v-model:value="period.start" :options="allTimeOptions" aria-label="Routine Period start time" />
            <Select v-model:value="period.end" :options="periodEndOptions" aria-label="Routine Period end time" />
            <div class="row-actions">
              <Button quaternary circle :disabled="index === 0" aria-label="Move Routine Period earlier" @click="moveRoutinePeriod(index, -1)"><ArrowUp :size="16" /></Button>
              <Button quaternary circle :disabled="index === household.routinePeriods.length - 1" aria-label="Move Routine Period later" @click="moveRoutinePeriod(index, 1)"><ArrowDown :size="16" /></Button>
              <Button quaternary circle type="error" :disabled="household.routinePeriods.length === 2 || periodInUse(period.id)" :title="periodInUse(period.id) ? 'Move planned Duties before removing this Routine Period' : undefined" aria-label="Remove Routine Period" @click="removeRoutinePeriod(index)"><Trash2 :size="16" /></Button>
            </div>
          </article>
          <div class="off-day-fields">
            <p>Days off</p>
            <div v-for="assignee in household.assignees" :key="assignee" class="off-day-row"><strong>{{ assignee }}</strong><Checkbox v-for="weekday in weekdays" :key="weekday.value" :checked="household.offDays[assignee]?.includes(weekday.value)" @update:checked="setOffDay(assignee, weekday.value, $event)">{{ weekday.label }}</Checkbox></div>
          </div>
          <p v-if="routineError" class="form-error">{{ routineError }}</p>
          <div class="modal-actions"><Button type="primary" @click="saveRoutine">Save routine</Button></div>
        </div>
      </template>
      <template v-else-if="optionMode === 'duties'">
        <form class="option-form duty-option-form" @submit.prevent="addDutyOption"><InputText v-model:value="newDuty.name" placeholder="Duty name" aria-label="Duty name" /><InputText v-model:value="newDuty.area" placeholder="Area, e.g. Kitchen" aria-label="Duty area" /><Select v-model:value="newDuty.emoji" :options="dutyEmojiOptions" clearable placeholder="Suggested" aria-label="Duty emoji" /><Button attr-type="submit"><CirclePlus :size="18" /> Add</Button></form>
        <div class="option-list">
          <div v-for="duty in catalog.duties" :key="duty.id" class="option-row">
            <template v-if="editingOption?.kind === 'duty' && editingOption.originalId === duty.id"><div class="option-edit-fields"><span class="duty-emoji duty-edit-preview" aria-hidden="true">{{ editingOption.emoji || suggestedDutyEmoji(editingOption.name) }}</span><InputText v-model:value="editingOption.name" /><InputText v-model:value="editingOption.area" /><Select v-model:value="editingOption.emoji" :options="dutyEmojiOptions" clearable aria-label="Duty emoji" /><Button size="small" @click="commitOptionEdit">Save</Button></div></template>
            <template v-else><div class="option-identity"><span class="duty-emoji" aria-hidden="true">{{ duty.emoji || suggestedDutyEmoji(duty.name) }}</span><div><strong>{{ duty.name }}</strong><span>{{ duty.area }}</span></div></div><div class="row-actions"><Button quaternary circle aria-label="Rename duty" @click="startEditOption('duty', duty)"><Pencil :size="16" /></Button><Button quaternary circle type="error" aria-label="Delete duty option" @click="deleteOption('duty', duty.id)"><Trash2 :size="16" /></Button></div></template>
          </div>
        </div>
      </template>
      <template v-else>
        <form class="option-form meal-option-form" @submit.prevent="addMealOption">
          <InputText v-model:value="newMeal.name" placeholder="Meal name" aria-label="Meal name" />
          <Select v-model:value="newMeal.type" :options="mealParts.map(part => ({ label: part.label, value: part.id }))" />
          <label class="image-picker">
            <ImagePlus :size="17" /><span>{{ newMeal.image ? 'Change image' : 'Add image' }}</span>
            <input type="file" accept="image/*" @change="handleMealImage($event, newMeal)" />
          </label>
          <img v-if="newMeal.image" :src="mealImageUrl(newMeal.image)" alt="New meal preview" class="meal-preview" />
          <Button v-if="newMeal.image" quaternary circle type="error" aria-label="Remove new meal image" @click="newMeal.image = null"><X :size="16" /></Button>
          <Button attr-type="submit"><CirclePlus :size="18" /> Add</Button>
        </form>
        <p v-if="imageError" class="form-error">{{ imageError }}</p>
        <div class="option-list">
          <div v-for="meal in catalog.meals" :key="meal.id" class="option-row">
            <template v-if="editingOption?.kind === 'meal' && editingOption.originalId === meal.id">
              <div class="meal-edit-fields">
                <InputText v-model:value="editingOption.name" aria-label="Edit meal name" />
                <Select v-model:value="editingOption.type" :options="mealParts.map(part => ({ label: part.label, value: part.id }))" />
                <label class="image-picker"><ImagePlus :size="17" /><span>{{ editingOption.image ? 'Change image' : 'Add image' }}</span><input type="file" accept="image/*" @change="handleMealImage($event, editingOption)" /></label>
                <img v-if="editingOption.image" :src="mealImageUrl(editingOption.image)" :alt="`${editingOption.name} preview`" class="meal-preview" />
                <Button v-if="editingOption.image" quaternary circle type="error" aria-label="Remove meal image" @click="editingOption.image = null"><X :size="16" /></Button>
              </div>
              <Button size="small" @click="commitOptionEdit">Save</Button>
            </template>
            <template v-else><div class="option-identity"><span class="meal-thumb"><img v-if="meal.image" :src="mealImageUrl(meal.image)" alt="" /><CookingPot v-else :size="17" /></span><div><strong>{{ meal.name }}</strong><span>{{ meal.type }}</span></div></div><div class="row-actions"><Button quaternary circle aria-label="Rename meal" @click="startEditOption('meal', meal)"><Pencil :size="16" /></Button><Button quaternary circle type="error" aria-label="Delete meal option" @click="deleteOption('meal', meal.id)"><Trash2 :size="16" /></Button></div></template>
          </div>
        </div>
      </template>
      </NCard>
    </NModal>
  </main>
</template>

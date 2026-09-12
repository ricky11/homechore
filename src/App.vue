<script setup>
import { computed, h, nextTick, onMounted, ref, watch } from 'vue'
import {
  ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, CirclePlus, Clock3, Copy,
  CookingPot, House, ImagePlus, ListPlus, NotebookPen, Pencil, Printer, RotateCcw,
  Settings2, Trash2, X,
} from '@lucide/vue'
import {
  NButton as Button,
  NCard,
  NInput as InputText,
  NInput as Textarea,
  NModal,
  NSelect as Select,
} from 'naive-ui'
import seed from './data/seed.json'

const DAY_MS = 86_400_000

const periods = [
  { id: 'morning', label: 'Morning', time: '6:30–11:00 am' },
  { id: 'midday', label: 'Midday', time: '11:00 am–3:00 pm' },
  { id: 'evening', label: 'Evening', time: '3:00–8:00 pm' },
]
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
}
const householdIconOptions = ['🏠', '🏡', '🏢', '🌿', '☀️', '🧡']
  .map((icon) => ({ label: icon, value: icon }))

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
const newDuty = ref({ name: '', area: '' })
const newMeal = ref({ name: '', type: 'main', image: null })
const newAssignee = ref('')
const householdError = ref('')
const editingOption = ref(null)
const imageError = ref('')
const saveState = ref('Saved')
const previousWeekAvailable = ref(false)
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
  catalog.value.duties.map((duty) => ({ label: `${duty.name} · ${duty.area}`, value: duty.id })),
)
const assigneeOptions = computed(() => [
  ...household.value.assignees.map((value) => ({ label: value, value })),
  { label: 'Shared', value: 'Shared' },
])
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

function snapshotDuty(dutyId, period = 'morning', assignee = 'Shared', time = '') {
  const source = catalog.value.duties.find((duty) => duty.id === dutyId)
  return {
    id: createId(), sourceId: dutyId, name: source?.name ?? 'New duty',
    area: source?.area ?? 'General', period, assignee, time,
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
  if (!response.ok) throw new Error('Could not save planner data.')
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

function availabilityFor(index) {
  if (index === 1) return 'Swarna off'
  if (index === 6) return 'Anu off'
  return ''
}

function dutiesFor(day, periodId) {
  return day.duties.filter((duty) => duty.period === periodId)
}

function mealOptions(type) {
  return catalog.value.meals
    .filter((meal) => meal.type === type)
    .map((meal) => ({ label: meal.name, value: meal.id, image: meal.image }))
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

async function changeDuty(duty, sourceId) {
  let source = catalog.value.duties.find((item) => item.id === sourceId)
  if (!source && typeof sourceId === 'string' && sourceId.trim()) {
    source = { id: slugify(sourceId), name: sourceId.trim(), area: 'General' }
    catalog.value.duties.push(source)
    await saveCatalog()
  }
  if (!source) return
  Object.assign(duty, { sourceId: source.id, name: source.name, area: source.area })
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
    name,
    icon: household.value.icon.trim() || defaultHousehold.icon,
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
}

function assigneeInUse(assignee) {
  return Object.values(weeks.value).some((week) => week.days.some((day) =>
    day.duties.some((duty) => duty.assignee === assignee)
    || mealSlots.some((slot) => day.meals[slot.id].assignee === assignee),
  ))
}

async function addDutyOption() {
  if (!newDuty.value.name.trim() || !newDuty.value.area.trim()) return
  catalog.value.duties.push({ id: slugify(newDuty.value.name), name: newDuty.value.name.trim(), area: newDuty.value.area.trim() })
  newDuty.value = { name: '', area: '' }
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

async function imageToDataUrl(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Please choose an image smaller than 10 MB.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/webp', 0.82)
}

async function handleMealImage(event, target) {
  const [file] = event.target.files
  if (!file) return
  imageError.value = ''
  try {
    target.image = await imageToDataUrl(file)
  } catch (error) {
    imageError.value = error.message
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
    if (edit.kind === 'duty') target.area = edit.area.trim() || 'General'
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
        <Button secondary aria-label="Print schedule" @click="printSchedule"><Printer :size="18" /><span class="action-label">Print</span></Button>
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
              <span v-if="availabilityFor(selectedDayIndex)" class="availability">{{ availabilityFor(selectedDayIndex) }}</span>
            </div>
          </div>

          <div class="detail-layout">
            <div class="duty-editor">
              <section v-for="period in periods" :key="period.id" class="period-section">
                <div class="section-heading">
                  <div><p class="period-time"><Clock3 :size="15" /> {{ period.time }}</p><h3>{{ period.label }}</h3></div>
                  <Button class="no-print" quaternary size="small" @click="addDuty(selectedDay, period.id)"><CirclePlus :size="17" /><span>Add duty</span></Button>
                </div>
                <div v-if="!dutiesFor(selectedDay, period.id).length" class="empty-line">No duties planned</div>
                <article v-for="duty in dutiesFor(selectedDay, period.id)" :key="duty.id" class="duty-row" :data-assignee="duty.assignee.toLowerCase()">
                  <Select class="duty-select" :value="duty.sourceId" :options="dutyOptions" filterable tag aria-label="Duty or new duty" @update:value="changeDuty(duty, $event)" />
                  <InputText v-model:value="duty.time" placeholder="Optional time" aria-label="Optional exact time" />
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
                <p v-if="availabilityFor(index)" class="availability">{{ availabilityFor(index) }}</p>
                <div v-for="period in periods" :key="period.id" class="overview-period">
                  <p class="overview-time">{{ period.time }}</p>
                  <div v-if="!dutiesFor(day, period.id).length" class="empty-slot">Open</div>
                  <div v-for="duty in dutiesFor(day, period.id)" :key="duty.id" class="duty-chip" :data-assignee="duty.assignee.toLowerCase()"><span>{{ duty.name }}</span><small>{{ duty.time || duty.assignee }}</small></div>
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
              <InputText v-model:value="household.assignees[index]" :disabled="assigneeInUse(assignee)" :title="assigneeInUse(assignee) ? 'Move planned work before renaming this Assignee' : undefined" :aria-label="`${assignee} name`" />
              <Button quaternary circle type="error" :disabled="household.assignees.length === 1 || assigneeInUse(assignee)" :title="assigneeInUse(assignee) ? 'Move planned work before removing this Assignee' : undefined" :aria-label="`Remove ${assignee}`" @click="removeAssignee(assignee)"><X :size="16" /></Button>
            </div>
            <div class="add-assignee"><InputText v-model:value="newAssignee" placeholder="Add a person" aria-label="New Assignee name" @keyup.enter.prevent="addAssignee" /><Button secondary @click="addAssignee"><CirclePlus :size="17" /> Add</Button></div>
          </div>
          <p v-if="householdError" class="form-error">{{ householdError }}</p>
          <div class="modal-actions"><Button type="primary" attr-type="submit">Save household</Button></div>
        </form>
      </template>
      <template v-else-if="optionMode === 'routine'">
        <div class="routine-preview">
          <div v-for="period in periods" :key="period.id"><strong>{{ period.label }}</strong><span>{{ period.time }}</span></div>
        </div>
      </template>
      <template v-else-if="optionMode === 'duties'">
        <form class="option-form" @submit.prevent="addDutyOption"><InputText v-model:value="newDuty.name" placeholder="Duty name" aria-label="Duty name" /><InputText v-model:value="newDuty.area" placeholder="Area, e.g. Kitchen" aria-label="Duty area" /><Button attr-type="submit"><CirclePlus :size="18" /> Add</Button></form>
        <div class="option-list">
          <div v-for="duty in catalog.duties" :key="duty.id" class="option-row">
            <template v-if="editingOption?.kind === 'duty' && editingOption.originalId === duty.id"><InputText v-model:value="editingOption.name" /><InputText v-model:value="editingOption.area" /><Button size="small" @click="commitOptionEdit">Save</Button></template>
            <template v-else><div><strong>{{ duty.name }}</strong><span>{{ duty.area }}</span></div><div class="row-actions"><Button quaternary circle aria-label="Rename duty" @click="startEditOption('duty', duty)"><Pencil :size="16" /></Button><Button quaternary circle type="error" aria-label="Delete duty option" @click="deleteOption('duty', duty.id)"><Trash2 :size="16" /></Button></div></template>
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
          <img v-if="newMeal.image" :src="newMeal.image" alt="New meal preview" class="meal-preview" />
          <Button v-if="newMeal.image" quaternary circle type="error" aria-label="Remove new meal image" @click="newMeal.image = null"><X :size="16" /></Button>
          <Button attr-type="submit"><CirclePlus :size="18" /> Add</Button>
        </form>
        <p v-if="imageError" class="form-error">{{ imageError }}</p>
        <div class="option-list">
          <div v-for="meal in catalog.meals" :key="meal.id" class="option-row">
            <template v-if="editingOption?.kind === 'meal' && editingOption.originalId === meal.id">
              <div class="option-edit-fields">
                <InputText v-model:value="editingOption.name" aria-label="Edit meal name" />
                <Select v-model:value="editingOption.type" :options="mealParts.map(part => ({ label: part.label, value: part.id }))" />
                <label class="image-picker"><ImagePlus :size="17" /><span>{{ editingOption.image ? 'Change image' : 'Add image' }}</span><input type="file" accept="image/*" @change="handleMealImage($event, editingOption)" /></label>
                <img v-if="editingOption.image" :src="editingOption.image" :alt="`${editingOption.name} preview`" class="meal-preview" />
                <Button v-if="editingOption.image" quaternary circle type="error" aria-label="Remove meal image" @click="editingOption.image = null"><X :size="16" /></Button>
              </div>
              <Button size="small" @click="commitOptionEdit">Save</Button>
            </template>
            <template v-else><div class="option-identity"><span class="meal-thumb"><img v-if="meal.image" :src="meal.image" alt="" /><CookingPot v-else :size="17" /></span><div><strong>{{ meal.name }}</strong><span>{{ meal.type }}</span></div></div><div class="row-actions"><Button quaternary circle aria-label="Rename meal" @click="startEditOption('meal', meal)"><Pencil :size="16" /></Button><Button quaternary circle type="error" aria-label="Delete meal option" @click="deleteOption('meal', meal.id)"><Trash2 :size="16" /></Button></div></template>
          </div>
        </div>
      </template>
      </NCard>
    </NModal>
  </main>
</template>

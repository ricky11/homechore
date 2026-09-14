import { computed, nextTick, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import seed from '../data/seed.json' with { type: 'json' }
import { calendarEventTime, calendarEventsForDay } from '../utils/calendar-events.js'
import { addDays, allTimeOptions, buildDays, cloneData, copyWeek, createId, createWeek, defaultHousehold, mealParts, mealSlots, mondayFor, parseDate, suggestedDutyEmoji, toDateKey, minutesFor, slugify } from '../utils/planner.js'

export const usePlannerStore = defineStore('planner', () => {
  const weeks = ref({})
  const currentWeek = ref(null)
  const catalog = ref({ duties: [], meals: [] })
  const household = ref(cloneData(defaultHousehold))
  const selectedDayIndex = ref(null)
  const loading = ref(true)
  const serverError = ref('')
  const saveState = ref('Saved')
  const previousWeekAvailable = ref(false)
  const householdError = ref('')
  const googleCalendarIntegration = ref(null)
  const calendarEvents = ref([])
  const calendarEventsError = ref('')
  let saveTimer
  let hydrating = false
  let calendarEventsRequest = 0

  const selectedDay = computed(() => selectedDayIndex.value === null || !currentWeek.value ? null : currentWeek.value.days[selectedDayIndex.value])
  const weekLabel = computed(() => {
    if (!currentWeek.value) return ''
    const start = parseDate(currentWeek.value.id)
    return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${addDays(start, 6).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  })
  const dutyOptions = computed(() => catalog.value.duties.map((duty) => ({ label: `${duty.emoji || suggestedDutyEmoji(duty.name)} ${duty.name} · ${duty.area}`, value: duty.id })))
  const assigneeOptions = computed(() => [...household.value.assignees.map((value) => ({ label: value, value })), { label: 'Shared', value: 'Shared' }])
  const periods = computed(() => household.value.routinePeriods)
  const periodOptions = computed(() => periods.value.map((period) => ({ label: period.label, value: period.id })))
  const weekIsBlank = computed(() => currentWeek.value?.days.every((day) => day.duties.length === 0 && !day.notes.trim() && mealSlots.every((slot) => mealParts.every((part) => !day.meals[slot.id][part.id]))))

  async function persistState(update) {
    const response = await fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update) })
    if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.error ?? 'Could not save planner data.') }
  }
  async function saveWeek(week) { const snapshot = cloneData(week); weeks.value[snapshot.id] = snapshot; await persistState({ week: snapshot }) }
  async function fetchSharedState() {
    const response = await fetch('/api/state')
    if (!response.ok) throw new Error('Could not load planner data.')
    const state = await response.json()
    weeks.value = state.weeks ?? {}
    catalog.value = state.catalog ?? cloneData(seed)
    household.value = { ...cloneData(defaultHousehold), ...state.household }
    if (!Array.isArray(household.value.assignees) || !household.value.assignees.length) household.value.assignees = [...defaultHousehold.assignees]
  }
  async function fetchGoogleCalendarIntegration() {
    try {
      const response = await fetch('/api/integrations/google')
      if (!response.ok) throw new Error('Could not load Google Calendar status.')
      googleCalendarIntegration.value = await response.json()
    } catch {
      googleCalendarIntegration.value = { available: false, status: 'error', message: 'Google Calendar status is unavailable right now.' }
    }
  }
  async function fetchCalendarEvents(start, end) {
    const request = ++calendarEventsRequest
    try {
      const response = await fetch(`/api/calendar-events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error ?? 'Could not load Calendar Events.')
      if (request !== calendarEventsRequest) return
      calendarEvents.value = result.events ?? []
      calendarEventsError.value = ''
    } catch (error) {
      if (request !== calendarEventsRequest) return
      calendarEvents.value = []
      calendarEventsError.value = error.message
    }
  }
  async function googleCalendarCalendars() {
    const response = await fetch('/api/integrations/google/calendars')
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error ?? 'Could not load Google Calendars.')
    return result.calendars ?? []
  }
  async function selectGoogleCalendar(calendarId) {
    const response = await fetch('/api/integrations/google/calendar', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ calendarId }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error ?? 'Could not select the Google Calendar.')
    googleCalendarIntegration.value = result
  }
  async function disconnectGoogleCalendar() {
    const response = await fetch('/api/integrations/google', { method: 'DELETE' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error ?? 'Could not disconnect Google Calendar.')
    googleCalendarIntegration.value = result
  }
  // Hydration suppresses the week watcher while replacing the current record.
  async function loadWeek(weekKey) {
    hydrating = true; saveState.value = 'Saved'; currentWeek.value = weeks.value[weekKey] ?? createWeek(weekKey)
    previousWeekAvailable.value = Boolean(weeks.value[toDateKey(addDays(parseDate(weekKey), -7))])
    if (!weeks.value[weekKey]) await saveWeek(currentWeek.value)
    void fetchCalendarEvents(weekKey, toDateKey(addDays(parseDate(weekKey), 7)))
    await nextTick(); hydrating = false
  }
  async function initialize() {
    try { await fetchSharedState(); await loadWeek(toDateKey(mondayFor())); void fetchGoogleCalendarIntegration() }
    catch { serverError.value = 'The shared planner server is unavailable. Start it with npm run dev or npm start.'; saveState.value = 'Server unavailable' }
    finally { loading.value = false }
  }
  async function navigateWeek(amount) { selectedDayIndex.value = null; await fetchSharedState(); await loadWeek(toDateKey(addDays(parseDate(currentWeek.value.id), amount * 7))) }
  async function goToToday() { selectedDayIndex.value = null; await fetchSharedState(); await loadWeek(toDateKey(mondayFor())) }
  async function openWeekForDate(date) { selectedDayIndex.value = null; await fetchSharedState(); await loadWeek(toDateKey(mondayFor(parseDate(date)))) }
  async function copyPreviousWeek() {
    const previous = weeks.value[toDateKey(addDays(parseDate(currentWeek.value.id), -7))]
    if (!previous) return
    hydrating = true; currentWeek.value = copyWeek(previous, currentWeek.value.id); await saveWeek(currentWeek.value); await nextTick(); hydrating = false
  }
  async function clearWeek() { hydrating = true; currentWeek.value = { id: currentWeek.value.id, days: buildDays(parseDate(currentWeek.value.id)) }; await saveWeek(currentWeek.value); await nextTick(); hydrating = false }
  // Coalesce editor changes into one API write while retaining the latest snapshot.
  function scheduleSave() {
    if (hydrating || !currentWeek.value) return
    saveState.value = 'Saving…'; clearTimeout(saveTimer); const snapshot = cloneData(currentWeek.value)
    saveTimer = setTimeout(async () => { try { await saveWeek(snapshot); saveState.value = 'Saved' } catch { saveState.value = 'Save failed' } }, 250)
  }
  function snapshotDuty(dutyId, period = periods.value[0]?.id ?? 'morning') { const source = catalog.value.duties.find((duty) => duty.id === dutyId); return { id: createId(), sourceId: dutyId, name: source?.name ?? 'New duty', area: source?.area ?? 'General', emoji: source?.emoji ?? '', period, assignee: 'Shared', time: '' } }
  function addDuty(day, periodId) { day.duties.push(catalog.value.duties[0] ? snapshotDuty(catalog.value.duties[0].id, periodId) : { id: createId(), sourceId: null, name: '', area: 'General', period: periodId, assignee: 'Shared', time: '' }) }
  function dutiesFor(day, periodId) { return day.duties.filter((duty) => duty.period === periodId) }
  function dutySelectValue(duty) { return duty.sourceId ?? (duty.sourceEventId ? `calendar-event:${duty.sourceEventId}` : null) }
  function dutyOptionsFor(duty) {
    return duty.sourceEventId && !duty.sourceId
      ? [{ label: `${duty.emoji || suggestedDutyEmoji(duty.name)} ${duty.name} · Calendar`, value: dutySelectValue(duty) }, ...dutyOptions.value]
      : dutyOptions.value
  }
  function dutyEmoji(duty) { return catalog.value.duties.find((option) => option.id === duty.sourceId)?.emoji || duty.emoji || suggestedDutyEmoji(duty.name) }
  function calendarEventsFor(day) { return calendarEventsForDay(calendarEvents.value, day.date) }
  function calendarEventIsCopied(day, event) { return day.duties.some((duty) => duty.sourceEventId === event.id) }
  function calendarEventTimeForDay(day, event) {
    if (event.allDay || toDateKey(new Date(event.start)) !== day.date) return ''
    const start = new Date(event.start)
    return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
  }
  function copyCalendarEvent(day, event) {
    if (calendarEventIsCopied(day, event)) return
    const time = calendarEventTimeForDay(day, event)
    const timeMinutes = minutesFor(time)
    const period = periods.value.find((item) => timeMinutes !== null && timeMinutes >= minutesFor(item.start) && timeMinutes < minutesFor(item.end)) ?? periods.value[0]
    day.duties.push({ id: createId(), sourceId: null, sourceEventId: event.id, name: event.title, area: 'Calendar', emoji: '', period: period?.id ?? 'morning', assignee: '', time: period && timeOptionsFor(period.id).some((option) => option.value === time) ? time : '' })
  }
  function timeOptionsFor(periodId) { const period = periods.value.find((item) => item.id === periodId); return period ? allTimeOptions.filter((option) => minutesFor(option.value) >= minutesFor(period.start) && minutesFor(option.value) < minutesFor(period.end)) : [] }
  function changeDutyPeriod(duty, periodId) { duty.period = periodId; if (duty.time && !timeOptionsFor(periodId).some((option) => option.value === duty.time)) duty.time = '' }
  async function changeDuty(duty, sourceId) { let source = catalog.value.duties.find((item) => item.id === sourceId); if (!source && typeof sourceId === 'string' && sourceId.trim()) { source = { id: slugify(sourceId), name: sourceId.trim(), area: 'General', emoji: suggestedDutyEmoji(sourceId) }; catalog.value.duties.push(source); await saveCatalog() }; if (source) Object.assign(duty, { sourceId: source.id, name: source.name, area: source.area, emoji: source.emoji ?? '' }) }
  function removeDuty(day, dutyId) { day.duties = day.duties.filter((duty) => duty.id !== dutyId) }
  function availabilityFor(day) { const weekday = parseDate(day.date).getDay(); return household.value.assignees.filter((assignee) => household.value.offDays[assignee]?.includes(weekday)).map((assignee) => `${assignee} off`).join(' · ') }
  function mealOptions(type) { return catalog.value.meals.filter((meal) => meal.type === type).map((meal) => ({ label: meal.name, value: meal.id, image: meal.image ? `/media/${encodeURIComponent(meal.image)}` : null })) }
  function mealSummary(day) { return mealSlots.flatMap((slot) => { const meal = day.meals[slot.id]; const choices = mealParts.map((part) => catalog.value.meals.find((item) => item.id === meal[part.id])?.name ?? '').filter(Boolean); return choices.length ? [{ label: slot.label, value: choices.join(' · ') }] : [] }) }
  async function saveCatalog() { await persistState({ catalog: cloneData(catalog.value) }) }
  async function saveHousehold() {
    const name = household.value.name.trim(); const assignees = household.value.assignees.map((assignee) => assignee.trim()).filter(Boolean)
    if (!name || !assignees.length || assignees.includes('Shared') || new Set(assignees).size !== assignees.length) { householdError.value = 'Use a home name and unique Assignee names.'; return }
    household.value = { ...household.value, name, icon: household.value.icon || defaultHousehold.icon, assignees: [...new Set(assignees)] }
    try { await persistState({ household: cloneData(household.value) }); householdError.value = '' } catch (error) { householdError.value = error.message }
  }
  function assigneeInUse(assignee) { return Object.values(weeks.value).some((week) => week.days.some((day) => day.duties.some((duty) => duty.assignee === assignee) || mealSlots.some((slot) => day.meals[slot.id].assignee === assignee))) }
  function addAssignee(name) { if (name && !household.value.assignees.includes(name) && name !== 'Shared') household.value.assignees.push(name) }
  function removeAssignee(name) { if (household.value.assignees.length === 1 || assigneeInUse(name)) return; household.value.assignees = household.value.assignees.filter((assignee) => assignee !== name); delete household.value.offDays[name] }
  function renameAssignee(index, value) { const current = household.value.assignees[index]; const name = value.trim(); if (!name || name === current || name === 'Shared' || household.value.assignees.includes(name)) return; household.value.assignees[index] = name; household.value.offDays[name] = household.value.offDays[current] ?? []; delete household.value.offDays[current] }
  function setOffDay(assignee, weekday, checked) { const current = household.value.offDays[assignee] ?? []; household.value.offDays[assignee] = checked ? [...new Set([...current, weekday])] : current.filter((day) => day !== weekday) }
  function periodInUse(periodId) { return Object.values(weeks.value).some((week) => week.days.some((day) => day.duties.some((duty) => duty.period === periodId))) }
  function addRoutinePeriod() { if (household.value.routinePeriods.length === 6) return; const occupied = household.value.routinePeriods.map((period) => ({ start: minutesFor(period.start), end: minutesFor(period.end) })); const start = Array.from({ length: 47 }, (_, index) => index * 30).find((minute) => !occupied.some((range) => minute < range.end && range.start < minute + 30)); if (start === undefined) return; const toTime = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; household.value.routinePeriods.push({ id: `period-${Date.now().toString(36)}`, label: 'New period', start: toTime(start), end: toTime(start + 30) }) }
  function moveRoutinePeriod(index, amount) { const target = index + amount; if (target < 0 || target >= household.value.routinePeriods.length) return; const [period] = household.value.routinePeriods.splice(index, 1); household.value.routinePeriods.splice(target, 0, period) }
  function removeRoutinePeriod(index) { const period = household.value.routinePeriods[index]; if (household.value.routinePeriods.length === 2 || periodInUse(period.id)) return; household.value.routinePeriods.splice(index, 1) }
  async function addDutyOption(duty) { if (!duty.name.trim() || !duty.area.trim()) return; catalog.value.duties.push({ id: slugify(duty.name), name: duty.name.trim(), area: duty.area.trim(), emoji: duty.emoji || suggestedDutyEmoji(duty.name) }); await saveCatalog() }
  async function addMealOption(meal) { if (!meal.name.trim()) return; catalog.value.meals.push({ id: slugify(meal.name), name: meal.name.trim(), type: meal.type, image: meal.image }); await saveCatalog() }
  async function commitOptionEdit(edit) { if (!edit?.name.trim()) return; const collection = edit.kind === 'duty' ? catalog.value.duties : catalog.value.meals; const target = collection.find((item) => item.id === edit.originalId); if (target) { target.name = edit.name.trim(); if (edit.kind === 'duty') Object.assign(target, { area: edit.area.trim() || 'General', emoji: edit.emoji || suggestedDutyEmoji(edit.name) }); else Object.assign(target, { type: edit.type, image: edit.image ?? null }) }; await saveCatalog() }
  async function deleteOption(kind, id) { if (kind === 'duty') catalog.value.duties = catalog.value.duties.filter((item) => item.id !== id); else catalog.value.meals = catalog.value.meals.filter((item) => item.id !== id); await saveCatalog() }
  async function uploadMealImage(file) {
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
    if (file.size > 5 * 1024 * 1024) throw new Error('Please choose an image smaller than 5 MB.')
    const bitmap = await createImageBitmap(file); const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale); canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
    const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not process this image.')), 'image/webp', 0.82))
    const form = new FormData(); form.append('image', blob, 'meal.webp'); const response = await fetch('/api/media', { method: 'POST', body: form }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error ?? 'Could not save this image.'); return result.filename
  }
  watch(currentWeek, scheduleSave, { deep: true })
  watch(selectedDay, (day) => {
    if (day) {
      void fetchCalendarEvents(day.date, toDateKey(addDays(parseDate(day.date), 1)))
    } else if (currentWeek.value) {
      const start = currentWeek.value.id
      void fetchCalendarEvents(start, toDateKey(addDays(parseDate(start), 7)))
    }
  })
  return { weeks, currentWeek, catalog, household, selectedDayIndex, loading, serverError, saveState, previousWeekAvailable, householdError, googleCalendarIntegration, calendarEvents, calendarEventsError, selectedDay, weekLabel, dutyOptions, assigneeOptions, periods, periodOptions, weekIsBlank, initialize, navigateWeek, goToToday, openWeekForDate, copyPreviousWeek, clearWeek, addDuty, dutiesFor, dutySelectValue, dutyOptionsFor, dutyEmoji, calendarEventsFor, calendarEventTime, calendarEventIsCopied, copyCalendarEvent, timeOptionsFor, changeDutyPeriod, changeDuty, removeDuty, availabilityFor, mealOptions, mealSummary, saveHousehold, assigneeInUse, addAssignee, removeAssignee, renameAssignee, setOffDay, periodInUse, addRoutinePeriod, moveRoutinePeriod, removeRoutinePeriod, addDutyOption, addMealOption, commitOptionEdit, deleteOption, uploadMealImage, fetchGoogleCalendarIntegration, googleCalendarCalendars, selectGoogleCalendar, disconnectGoogleCalendar }
})
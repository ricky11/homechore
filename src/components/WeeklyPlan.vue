<script setup>
import { ref } from 'vue'
import { CalendarDays, Check, ChevronRight, CookingPot, Copy, Plus, RotateCcw } from '@lucide/vue'
import { NButton as Button, NCard, NModal } from 'naive-ui'
import { usePlannerStore } from '../stores/planner'
import { dayName, dayNumber, periodRange } from '../utils/planner'

const planner = usePlannerStore()
const clearDialogOpen = ref(false)

// Confirm destructive removal before replacing the active week's saved record.
async function clearWeek() {
  await planner.clearWeek()
  clearDialogOpen.value = false
}
</script>

<template>
  <section v-if="planner.currentWeek" key="week" class="week-view">
    <div class="board-scroll"><div class="week-board"><article v-for="(day, index) in planner.currentWeek.days" :key="day.date" class="day-column"><button class="day-heading" type="button" @click="planner.selectedDayIndex = index"><div><span>{{ dayNumber(day) }}</span><h3>{{ dayName(day) }}</h3></div><ChevronRight class="open-day no-print" :size="18" /></button><p v-if="planner.availabilityFor(day)" class="availability">{{ planner.availabilityFor(day) }}</p><div v-for="period in planner.periods" :key="period.id" class="overview-period"><p class="overview-time">{{ periodRange(period) }}</p><div v-if="!planner.dutiesFor(day, period.id).length" class="empty-slot">Open</div><div v-for="duty in planner.dutiesFor(day, period.id)" :key="duty.id" class="duty-chip" :data-assignee="duty.assignee.toLowerCase()"><span><b class="duty-emoji" aria-hidden="true">{{ planner.dutyEmoji(duty) }}</b>{{ duty.name }}</span><small>{{ duty.time || duty.assignee }}</small></div></div><div v-if="planner.calendarEventsFor(day).length" class="calendar-event-summary"><p><CalendarDays :size="14" /> Calendar</p><div v-for="event in planner.calendarEventsFor(day)" :key="event.id" class="calendar-event-summary-row"><div><strong>{{ planner.calendarEventTime(event) }}</strong><span>{{ event.title }}</span></div><Button class="no-print" quaternary circle size="tiny" :disabled="planner.calendarEventIsCopied(day, event)" :aria-label="planner.calendarEventIsCopied(day, event) ? `${event.title} added` : `Add ${event.title} to duties`" :title="planner.calendarEventIsCopied(day, event) ? 'Added' : 'Add to duties'" @click="planner.copyCalendarEvent(day, event)"><Check v-if="planner.calendarEventIsCopied(day, event)" :size="15" /><Plus v-else :size="15" /></Button></div></div><div v-if="planner.mealSummary(day).length" class="meal-summary"><p><CookingPot :size="14" /> Meals</p><div v-for="meal in planner.mealSummary(day)" :key="meal.label"><strong>{{ meal.label }}</strong><span>{{ meal.value }}</span></div></div></article></div></div>
    <p v-if="planner.calendarEventsError" class="calendar-event-error">{{ planner.calendarEventsError }}</p>
    <footer class="board-footer no-print"><p>{{ planner.weekIsBlank ? 'This week is blank. Add duties or copy the previous week.' : 'Select any day to edit duties, meals, and notes.' }}</p><div class="footer-actions"><Button v-if="planner.weekIsBlank" type="primary" :disabled="!planner.previousWeekAvailable" :title="planner.previousWeekAvailable ? 'Copy duties from the previous saved week' : 'No previous saved week is available'" @click="planner.copyPreviousWeek"><Copy :size="17" /><span>Copy Previous Week Data</span></Button><Button type="error" quaternary @click="clearDialogOpen = true"><RotateCcw :size="17" /><span>Clear week</span></Button></div></footer>
    <NModal v-model:show="clearDialogOpen"><NCard class="modal-card" title="Clear this week?" role="dialog" aria-modal="true"><p>This permanently removes every duty, meal, and note from this week. Other weeks will not be changed.</p><template #footer><div class="modal-actions"><Button quaternary @click="clearDialogOpen = false">Cancel</Button><Button type="error" @click="clearWeek">Clear week</Button></div></template></NCard></NModal>
  </section>
</template>
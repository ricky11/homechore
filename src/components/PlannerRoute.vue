<script setup>
import { nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DailyPlan from './DailyPlan.vue'
import WeeklyPlan from './WeeklyPlan.vue'
import { usePlannerStore } from '../stores/planner'

const planner = usePlannerStore()
const route = useRoute()
const router = useRouter()
let applyingRoute = false

watch([() => route.params.date, () => planner.currentWeek?.id], async ([date]) => {
  if (!planner.currentWeek) return
  applyingRoute = true
  if (!date) {
    planner.selectedDayIndex = null
  } else {
    let index = planner.currentWeek.days.findIndex((day) => day.date === date)
    if (index < 0) {
      await planner.openWeekForDate(date)
      index = planner.currentWeek.days.findIndex((day) => day.date === date)
    }
    if (index < 0) await router.replace('/')
    else planner.selectedDayIndex = index
  }
  await nextTick()
  applyingRoute = false
}, { immediate: true })

watch(() => planner.selectedDay?.date, (date) => {
  if (applyingRoute) return
  const path = date ? `/day/${date}` : '/'
  if (route.path !== path) void router.push(path)
})
</script>

<template>
  <Transition name="view" mode="out-in">
    <DailyPlan v-if="planner.selectedDay" />
    <WeeklyPlan v-else />
  </Transition>
</template>
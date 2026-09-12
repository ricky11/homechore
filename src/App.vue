<script setup>
import { onMounted } from 'vue'
import { CalendarDays } from '@lucide/vue'
import { NButton as Button } from 'naive-ui'
import AppHeader from './components/AppHeader.vue'
import DailyPlan from './components/DailyPlan.vue'
import ManagePlannerOptions from './components/ManagePlannerOptions.vue'
import WeeklyPlan from './components/WeeklyPlan.vue'
import WeekToolbar from './components/WeekToolbar.vue'
import { usePlannerStore } from './stores/planner'

const planner = usePlannerStore()
const optionsDialogOpen = ref(false)

function retryConnection() {
  globalThis.location.reload()
}

onMounted(planner.initialize)
</script>

<template>
  <main class="app-shell">
    <AppHeader @manage="optionsDialogOpen = true" />
    <div v-if="planner.loading" class="loading-state"><CalendarDays :size="32" /><span>Opening your planner…</span></div>
    <section v-else-if="planner.serverError" class="loading-state server-error"><CalendarDays :size="32" /><h2>Planner server unavailable</h2><p>{{ planner.serverError }}</p><Button type="primary" @click="retryConnection">Try again</Button></section>
    <template v-else><WeekToolbar /><Transition name="view" mode="out-in"><DailyPlan v-if="planner.selectedDay" /><WeeklyPlan v-else /></Transition></template>
    <ManagePlannerOptions v-model:open="optionsDialogOpen" />
  </main>
</template>
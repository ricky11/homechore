<script setup>
import { Download, Printer, Settings2 } from '@lucide/vue'
import { NButton as Button } from 'naive-ui'
import { usePlannerStore } from '../stores/planner'
import { usePdfExport } from '../composables/usePdfExport'

const emit = defineEmits(['manage'])
const planner = usePlannerStore()
const { downloadCurrentPlanPdf } = usePdfExport()

function printSchedule() { globalThis.print() }
</script>

<template>
  <header class="app-header">
    <div class="brand-block"><div class="brand-mark" aria-hidden="true">{{ planner.household.icon }}</div><div><p class="eyebrow">{{ planner.household.name }}</p><h1>HomeChore</h1><p class="subtitle">A simple household routine and meal planner for busy families and their helpers.</p></div></div>
    <div class="header-actions no-print">
      <span class="save-state">{{ planner.saveState }}</span>
      <Button secondary aria-label="Manage options" @click="emit('manage')"><Settings2 :size="18" /><span class="action-label">Manage</span></Button>
      <Button secondary :disabled="planner.loading || Boolean(planner.serverError) || !planner.currentWeek" aria-label="Download current plan as PDF" @click="downloadCurrentPlanPdf"><Download :size="18" /><span class="action-label">Download PDF</span></Button>
      <Button secondary aria-label="Print current plan" @click="printSchedule"><Printer :size="18" /><span class="action-label">Print</span></Button>
    </div>
  </header>
</template>
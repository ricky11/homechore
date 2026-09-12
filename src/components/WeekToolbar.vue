<script setup>
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { NButton as Button } from 'naive-ui'
import { usePlannerStore } from '../stores/planner'

const planner = usePlannerStore()
</script>

<template>
  <section class="week-toolbar no-print" aria-label="Week navigation">
    <Button quaternary circle aria-label="Previous week" @click="planner.navigateWeek(-1)"><ChevronLeft :size="22" /></Button>
    <div class="week-title"><p>Week plan</p><h2>{{ planner.weekLabel }}</h2></div>
    <Button quaternary circle aria-label="Next week" @click="planner.navigateWeek(1)"><ChevronRight :size="22" /></Button>
    <Button class="today-button" secondary type="primary" size="small" @click="planner.goToToday">Today</Button>
  </section>
</template>
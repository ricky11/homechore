import { createRouter, createWebHistory } from 'vue-router'
import PlannerRoute from './components/PlannerRoute.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: PlannerRoute },
    { path: '/day/:date', component: PlannerRoute },
  ],
})
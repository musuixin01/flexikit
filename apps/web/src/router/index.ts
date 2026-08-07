import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Landing', component: () => import('@/views/Landing.vue') },
  { path: '/app', name: 'Home', component: () => import('@/views/Home.vue') },
  { path: '/about', name: 'About', component: () => import('@/views/About.vue') },
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue') },
  { path: '/profile', name: 'Profile', component: () => import('@/views/Profile.vue') },
  { path: '/discover', name: 'Discover', component: () => import('@/views/Discover.vue') },
  { path: '/terms', name: 'Terms', component: () => import('@/views/Terms.vue') },
  { path: '/privacy', name: 'Privacy', component: () => import('@/views/Privacy.vue') },
  { path: '/data', name: 'DataManagement', component: () => import('@/views/DataManagement.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
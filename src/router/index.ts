import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, guestOnly: true },
  },
  {
    // Public share landing page. The actual binary lives at the backend's
    // /f/:id; this page fronts it with metadata and a download button.
    path: '/s/:fileId',
    name: 'download',
    component: () => import('@/views/DownloadView.vue'),
    meta: { public: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Global guard: session restore, auth/admin gating, forced password change.
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Restore the session once on first navigation (token present, user not loaded).
  if (auth.token && !auth.user) {
    await auth.restore()
  }

  // Public routes need no gating — but redirect authed users away from login.
  if (to.meta.public) {
    if (to.meta.guestOnly && auth.isAuthenticated) return { name: 'dashboard' }
    return true
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // A must-change-password user is handled by a global blocking dialog
  // (ForcePasswordDialog), not a route — so no redirect here.

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'dashboard' }
  }

  return true
})

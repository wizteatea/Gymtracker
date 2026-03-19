const CACHE_NAME = 'gymtracker-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  const url = e.request.url
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.includes('google-analytics') ||
    url.includes('/api/')
  ) {
    return
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

// ── Timer de repos géré par le Service Worker ──
// Le SW reste actif en arrière-plan plus longtemps que la page principale
let restTimer = null

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting()
    return
  }

  // Programmer une notification de fin de repos
  if (e.data?.type === 'SCHEDULE_REST') {
    clearTimeout(restTimer)
    const { delayMs, nextExercise } = e.data
    if (delayMs <= 0) return
    restTimer = setTimeout(() => {
      self.registration.showNotification('⏱ Repos terminé !', {
        body: nextExercise ? `Prochain : ${nextExercise}` : 'C\'est reparti !',
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: 'rest-timer',          // remplace la notif précédente
        renotify: true,
        requireInteraction: false,
        silent: false,
      })
    }, delayMs)
  }

  // Annuler la notification programmée
  if (e.data?.type === 'CANCEL_REST') {
    clearTimeout(restTimer)
    restTimer = null
  }
})

// Clic sur la notification → ouvre/focus l'app
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus()
      return clients.openWindow('/')
    })
  )
})

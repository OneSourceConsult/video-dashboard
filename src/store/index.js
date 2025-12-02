import { createStore } from 'vuex'

import mqttStore from '@/store/mqtt'
import settingsStore from '@/store/settings'
import videosStore from '@/store/videos'
import joystickStore from '@/store/joystick'
import authStore from '@/store/auth'

export const store = createStore({
  state: {
    loading: false,
    alertNotification: false,
    rootApp: undefined,
  },
  getters: {
    getLoading: (state) => state.loading,
    getRootApp: (state) => state.rootApp,
    isAlertNotificationOpen: (state) => state.alertNotification,
  },
  mutations: {
    setLoading(state, payload) {
      state.loading = payload
    },
    setRootApp(state, payload) {
      state.rootApp = payload
    },
    setAlertNotification(state, payload) {
      state.alertNotification = payload
    },
  },
})

store.registerModule('mqtt', mqttStore)
store.registerModule('settings', settingsStore)
store.registerModule('videos', videosStore)
store.registerModule('joystick', joystickStore)
store.registerModule('auth', authStore)

export default store

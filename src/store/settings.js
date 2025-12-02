let mqttURLDefault = import.meta.env.VITE_APP_MQTT_URL
let platformDefault = 'PPDR'

try {
  const jsonMqttURL = localStorage.getItem('mqttURL')
  const jsonPlatform = localStorage.getItem('platform')
  if (jsonMqttURL !== null) mqttURLDefault = JSON.parse(jsonMqttURL)
  if (jsonPlatform !== null) platformDefault = JSON.parse(jsonPlatform)
} catch (error) {
  console.error('Failed to load configuration from localStorage:', error)
}

export default {
  namespaced: true,
  state: () => ({
    mqttURL: mqttURLDefault,
    platform: platformDefault,
    appFullscreen: false,
    showSettings: true,
    sensors: [],
    sensorsToShow: [],
    showOwnStream: false,
    mapFullscreen: false,
    streamFullscreen: false,
    mapMode: 'small',
    showDetails: 'small',
    focusMode: 'drone',
    inHololens: undefined,
  }),
  getters: {
    getMapMode: (state) => state.mapMode,
    getShowDetails: (state) => state.showDetails,
    getFocusMode: (state) => state.focusMode,
    getMqttURL: (state) => state.mqttURL,
    getPlatform: (state) => state.platform,
    getSensors: (state) => state.sensors,
    getSensorsToShow: (state) => state.sensorsToShow,
    getShowOwnStream: (state) => state.showOwnStream,
    getShowSettings: (state) => state.showSettings,
    isMapFullscreen: (state) => state.mapFullscreen,
    getStreamFullscreen: (state) => state.streamFullscreen,
    getAppFullscreen: (state) => state.appFullscreen,
    getInHololens: (state) => state.inHololens,
  },
  mutations: {
    SET_MAP_MODE(state, payload) {
      state.mapMode = payload
    },
    SET_SHOW_DETAILS(state, payload) {
      state.showDetails = payload
    },
    SET_FOCUS_MODE(state, payload) {
      state.focusMode = payload
    },
    TOGGLE_MAP_FULLSCREEN(state) {
      state.mapFullscreen = !state.mapFullscreen
    },
    SET_STREAM_FULLSCREEN(state, payload) {
      state.streamFullscreen = payload
    },
    SET_APP_FULLSCREEN(state, payload) {
      state.appFullscreen = payload
    },
    SET_IN_HOLOLENS(state, payload) {
      state.inHololens = payload
    },
    SET_SENSORS(state, payload) {
      state.sensors = payload
    },
    SET_SENSORS_TO_SHOW(state, payload) {
      state.sensorsToShow = payload
    },
    SET_SHOW_OWN_STREAM(state, payload) {
      state.showOwnStream = payload
    },
    SET_SHOW_SETTINGS(state, payload) {
      state.showSettings = payload
    },
    SET_MQTT_URL(state, payload) {
      state.mqttURL = payload
    },
    SET_PLATFORM(state, payload) {
      state.platform = payload
    },
  },
  actions: {
    setMapMode({ commit }, payload) {
      commit('SET_MAP_MODE', payload)
    },
    setShowDetails({ commit }, size) {
      commit('SET_SHOW_DETAILS', size)
    },
    setFocusMode({ commit }, payload) {
      commit('SET_FOCUS_MODE', payload)
    },
    toggleMapFullscreen({ commit }) {
      commit('TOGGLE_MAP_FULLSCREEN')
    },
    setStreamFullscreen({ commit }, stream) {
      commit('SET_STREAM_FULLSCREEN', stream)
    },
    setAppFullscreen({ commit }, fullscreen) {
      commit('SET_APP_FULLSCREEN', fullscreen)
    },
    isInHololens({ commit }) {
      const ua = navigator.userAgent || ''
      const inHololens = ua.includes('Windows CE') || ua.includes('ARM')
      commit('SET_IN_HOLOLENS', inHololens)
      return inHololens
    },
    setSensors({ commit }, sensors) {
      commit('SET_SENSORS', sensors)
    },
    setSensorsToShow({ commit }, sensors) {
      commit('SET_SENSORS_TO_SHOW', sensors)
    },
    setShowOwnStream({ commit }, val) {
      commit('SET_SHOW_OWN_STREAM', val)
    },
    setShowSettings({ commit }, val) {
      commit('SET_SHOW_SETTINGS', val)
    },
    setMqttURL({ commit }, url) {
      try {
        localStorage.setItem('mqttURL', JSON.stringify(url))
      } catch (e) {
        console.warn('Failed to save mqttURL to localStorage:', e)
      }
      commit('SET_MQTT_URL', url)
    },
    setPlatform({ commit }, platform) {
      try {
        localStorage.setItem('platform', JSON.stringify(platform))
      } catch (e) {
        console.warn('Failed to save platform to localStorage:', e)
      }
      commit('SET_PLATFORM', platform)
    },
  },
}

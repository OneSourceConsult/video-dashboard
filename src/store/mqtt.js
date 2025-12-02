import mqtt from 'mqtt'

const DEFAULT_MQTT_URL = (() => {
  try {
    const stored = localStorage.getItem('mqtt:brokerUrl')
    if (stored && stored.trim() !== '') return stored
  } catch (e) {
    // ignore (e.g., SSR or disabled storage)
    console.error('Could not access localStorage to get MQTT broker URL:', e.message)
  }
  return import.meta.env.VITE_APP_MQTT_URL
})()

export default {
  namespaced: true,

  state: () => ({
    client: null,
    isConnected: false,
    messages: [],
    error: null,
    subscribedTopics: []
  }),

  getters: {
    client: (state) => state.client,
    isConnected: (state) => state.isConnected,
    messages: (state) => state.messages,
    error: (state) => state.error,
    subscribedTopics: (state) => state.subscribedTopics,
    getMessagesByTopic: (state) => (topic) => state.messages.filter(m => m.topic === topic)
  },

  mutations: {
    SET_CLIENT(state, client) {
      state.client = client
    },
    SET_CONNECTED(state, val) {
      state.isConnected = val
    },
    SET_ERROR(state, err) {
      state.error = err
    },
    ADD_MESSAGE(state, payload) {
      state.messages.unshift(payload)
      if (state.messages.length > 100) state.messages.pop()
    },
    CLEAR_MESSAGES(state) {
      state.messages = []
    },
    ADD_SUBSCRIBED_TOPIC(state, topic) {
      if (!state.subscribedTopics.includes(topic)) state.subscribedTopics.push(topic)
    },
    REMOVE_SUBSCRIBED_TOPIC(state, topic) {
      state.subscribedTopics = state.subscribedTopics.filter(t => t !== topic)
    },
    CLEAR_SUBSCRIBED_TOPICS(state) {
      state.subscribedTopics = []
    },
    RESET_STATE(state) {
      state.client = null
      state.isConnected = false
      state.messages = []
      state.error = null
      state.subscribedTopics = []
    }
  },

  actions: {
    connect({ state, commit }, { mqttUrl = DEFAULT_MQTT_URL, options = {} } = {}) {
      if (state.client && state.isConnected) {
        console.log('MQTT already connected')
        return
      }

      const connectOptions = {
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
        ...options
      }

      try {
        const client = mqtt.connect(mqttUrl, connectOptions)
        commit('SET_CLIENT', client)

        client.on('connect', () => {
          commit('SET_CONNECTED', true)
          commit('SET_ERROR', null)

          state.subscribedTopics.forEach(topic => {
            client.subscribe(topic, (err) => {
              if (err) {
                console.error(`Failed to subscribe to ${topic}`)
              }
            })
          })
        })

        client.on('message', (topic, message) => {
          const payload = {
            topic,
            message: message.toString(),
            timestamp: new Date().toISOString()
          }
          commit('ADD_MESSAGE', payload)
        })

        client.on('error', (err) => {
          commit('SET_ERROR', err)
          console.error('MQTT error:', err)
        })

        client.on('close', () => {
          commit('SET_CONNECTED', false)
        })
      } catch (err) {
        commit('SET_ERROR', err)
        console.error('Failed to connect to MQTT:', err)
      }
    },

    disconnect({ state, commit }) {
      if (state.client) {
        state.client.end(true)
        commit('RESET_STATE')
      }
    },

    subscribe({ state, commit }, payload) {
      const topic = typeof payload === 'string' ? payload : payload && payload.topic
      const options = payload && payload.options ? payload.options : {}

      if (!topic) {
        console.error('No topic provided for MQTT subscribe')
        return Promise.reject(new Error('No topic provided'))
      }

      if (!state.client || !state.isConnected) {
        console.error('MQTT client not connected')
        return Promise.reject(new Error('MQTT client not connected'))
      }

      return new Promise((resolve, reject) => {
        if (state.subscribedTopics.includes(topic)) return resolve()

        // mqtt.subscribe(topic, [options], callback)
        state.client.subscribe(topic, options, (err, granted) => {
          if (err) {
            console.error(`Failed to subscribe to ${topic}:`, err)
            commit('SET_ERROR', err)
            return reject(err)
          }

          // mqtt.js may return a granted array; a qos of 128 indicates failure
          const first = Array.isArray(granted) ? granted[0] : granted
          if (first && first.qos === 128) {
            const subErr = new Error(`Subscription rejected for ${topic}`)
            console.error(`Subscription rejected for ${topic}:`, granted)
            commit('SET_ERROR', subErr)
            return reject(subErr)
          }

          commit('ADD_SUBSCRIBED_TOPIC', topic)
          resolve(granted)
        })
      })
    },

    unsubscribe({ state, commit }, data) {
      const topic = data.topic
      if (!state.client || !state.isConnected) {
        console.error('MQTT client not connected')
        return Promise.reject(new Error('MQTT client not connected'))
      }

      return new Promise((resolve, reject) => {
        state.client.unsubscribe(topic, (err) => {
          if (err) {
            console.error(`Failed to unsubscribe from ${topic}:`, err)
            return reject(err)
          }
          commit('REMOVE_SUBSCRIBED_TOPIC', topic)
          resolve()
        })
      })
    },

    publish({ state, commit }, { topic, message, options = {} }) {
      if (!state.client || !state.isConnected) {
        console.error('MQTT client not connected')
        return Promise.reject(new Error('MQTT client not connected'))
      }

      return new Promise((resolve, reject) => {
        state.client.publish(topic, message, options, (err) => {
          if (err) {
            commit('SET_ERROR', err)
            console.error('Failed to publish message:', err)
            return reject(err)
          }
          resolve()
        })
      })
    },

    waitForMessage({ state }, { topic, timeout = 5000, filter } = {}) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          unsubscribe()
          reject(new Error('Timeout waiting for message'))
        }, timeout)

        const messageHandler = (msgTopic, message) => {
          if (msgTopic !== topic) return

          const msgString = message.toString()
          if (typeof filter === 'function' && !filter(msgString)) {
            return // ignore messages that don’t pass the filter
          }

          clearTimeout(timer)
          unsubscribe()
          resolve(msgString)
        }

        const unsubscribe = () => {
          state.client.removeListener('message', messageHandler)
        }

        state.client.on('message', messageHandler)
      })
    },

    clearMessages({ commit }) {
      commit('CLEAR_MESSAGES')
    },

    getTopicByStreamURL(_, { rawUrl, suffix = 'control_all_device' } = {}) {
      if (!rawUrl) return null

      try {
        const replaced = String(rawUrl)
          .replace(/^rtmp:\/\//i, 'http://')
          .replace(/^rtsp:\/\//i, 'http://')

        const u = new URL(replaced)

        const segments = (u.pathname || '')
          .split('/')
          .filter(s => s && s.trim() !== '')
          .map(s => s.replace(/\s+/g, '_'))

        if (segments.length === 0) return null

        const last = segments[segments.length - 1]
        if (last.includes('.')) segments.pop()

        if (segments.length === 0) return null

        const path = segments.join('/')
        return `devices/${path}/${suffix}`
      } catch {
        try {
          const m = String(rawUrl).match(/:\/\/[^/]+\/(.+)$/)
          if (!m) return null

          const segments = m[1]
            .split('/')
            .filter(s => s && s.trim() !== '')
            .map(s => s.replace(/\s+/g, '_'))

          if (segments.length === 0) return null

          const last = segments[segments.length - 1]
          if (last.includes('.')) segments.pop()

          if (segments.length === 0) return null

          const path = segments.join('/')
          return `devices/${path}/${suffix}`
        } catch {
          return null
        }
      }
    },
  }
}

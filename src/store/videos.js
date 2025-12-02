export default {
  namespaced: true,
  state: () => ({
    streams: {},
    streamSubscriberInfo: undefined,

    mediamtxBase: import.meta.env.VITE_APP_MEDIAMTX_BASE_URL,

    streamStarted: false,
    streamIsPlaying: false,
    canToggleStream: true,

    webrtcPCs: {},
  }),

  getters: {
    getStreams: (state) => state.streams,
    isInitialized: (state) => !!state.mediamtxBase,
    getStreamStarted: (state) => state.streamStarted,
  },

  mutations: {
    SET_STREAM(state, { id, stream }) {
      if (stream === undefined) {
        const copy = { ...state.streams }
        delete copy[id]
        state.streams = copy
      } else {
        state.streams = { ...state.streams, [id]: stream }
      }
    },
    SET_STREAM_STARTED(state, payload) {
      state.streamStarted = payload
    },
    SET_PROP(state, { key, value }) {
      state[key] = value
    },
    SET_MEDIAMTX_BASE(state, url) {
      state.mediamtxBase = url
    },
    SET_WEBRTC_PC(state, { mount, pc }) {
      state.webrtcPCs = { ...state.webrtcPCs, [mount]: pc }
    },
    CLEAR_WEBRTC_PC(state, mount) {
      const copy = { ...state.webrtcPCs }
      delete copy[mount]
      state.webrtcPCs = copy
    },
  },

  actions: {
    initializeMediaMtx({ commit }, baseUrl) {
      if (!baseUrl) return
      commit('SET_MEDIAMTX_BASE', baseUrl)
    },
    gatherLocalCandidates(_, pc, timeout = 5000) {
      if (!pc) return Promise.resolve()
      if (pc.iceGatheringState === 'complete') return Promise.resolve()
      return new Promise((resolve) => {
        let timer = setTimeout(() => {
          pc.removeEventListener('icegatheringstatechange', handler)
          resolve()
        }, timeout)
        const handler = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timer)
            pc.removeEventListener('icegatheringstatechange', handler)
            resolve()
          }
        }
        pc.addEventListener('icegatheringstatechange', handler)
      })
    },
    async playWithWhep({ state, commit, dispatch }, { mount, videoElementId }) {
      if (!state.mediamtxBase) {
        console.error('[webrtc] mediamtxBase not set — call initializeMediaMtx(baseUrl)')
        return false
      }
      const base = state.mediamtxBase.replace(/\/+$/, '')
      const endpoint = `${base}/${encodeURIComponent(mount)}/whep`

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })

      pc.ontrack = (ev) => {
        const videoEl =
          document.getElementById(videoElementId) ||
          document.querySelector(`video#${videoElementId}`)
        if (videoEl) {
          videoEl.srcObject = ev.streams[0] ?? new MediaStream(ev.track ? [ev.track] : [])
          videoEl.play().catch(() => {})
          commit('SET_PROP', { key: 'streamIsPlaying', value: true })
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          dispatch('stopPlaying', { mount, videoElementId })
        }
      }

      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })

      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await dispatch('gatherLocalCandidates', pc)

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: pc.localDescription.sdp,
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          console.error('[webrtc] WHEP play failed', res.status, text)
          pc.close()
          return false
        }

        const answerSdp = await res.text()
        if (!answerSdp) {
          console.error('[webrtc] Empty answer SDP from WHEP')
          pc.close()
          return false
        }

        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
        commit('SET_WEBRTC_PC', { mount, pc })
        commit('SET_PROP', { key: 'streamStarted', value: true })
        return true
      } catch (err) {
        console.error('[webrtc] playWithWhep error', err)
        try {
          pc.close()
        } catch (e) {}
        return false
      }
    },

    async stopPlaying({ state, commit }, { mount, videoElementId }) {
      const pc = state.webrtcPCs[mount]
      if (pc) {
        try {
          pc.getSenders().forEach((s) => s.track && s.track.stop())
        } catch (e) {}
        try {
          pc.close()
        } catch (e) {}
        commit('CLEAR_WEBRTC_PC', mount)
      }
      const el =
        document.getElementById(videoElementId) || document.querySelector(`video#${videoElementId}`)
      if (el) el.srcObject = null
      commit('SET_PROP', { key: 'streamStarted', value: false })
      commit('SET_PROP', { key: 'streamIsPlaying', value: false })
    },

    async attachStream({ commit, dispatch }, payload) {
      const { id, mount, deviceId, type, username } = payload
      const newStreamObj = { type, deviceId, username }
      commit('SET_STREAM', { id, stream: newStreamObj })
      await dispatch('playWithWhep', { mount, videoElementId: id })
    },

    async requestToWatchStream({ dispatch }, payload) {
      const { mount, id } = payload
      await dispatch('playWithWhep', { mount, videoElementId: id })
    },
  },
}

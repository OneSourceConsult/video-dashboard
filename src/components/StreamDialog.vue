<template>
  <v-dialog v-model="internalVisible" :max-width="dialogMaxWidth" :fullscreen="fullscreen">
    <div class="dialog-content" :style="contentStyle" role="dialog" aria-labelledby="dialogTitle">
      <v-row class="dialog-header" align="center" justify="space-between">
        <v-col cols="auto">
          <h2 id="dialogTitle" style="margin: 0">Streams</h2>
        </v-col>

        <v-col cols="auto">
          <v-btn icon type="button" @click="close" aria-label="Close dialog" title="Close">
            <v-icon :icon="icons.mdiClose" aria-hidden="true" focusable="false" width="20" height="20" />
          </v-btn>
        </v-col>
      </v-row>

      <div class="streams-list" role="list" aria-label="Predefined streams">
        <div v-for="(s, idx) in predefinedStreams" :key="s.name + '|' + s.url + '|' + idx" role="listitem"
          class="stream-item" :class="{ selected: selectedIndex === idx }" @click="selectIndex(idx)"
          @keydown.enter.prevent="selectIndex(idx)" @keydown.space.prevent="selectIndex(idx)" tabindex="0"
          :aria-pressed="selectedIndex === idx">
          <div class="stream-meta">
            <div class="stream-name">{{ s.name }}</div>
            <div class="stream-url">{{ s.url }}</div>
          </div>

          <div class="stream-action" aria-hidden="false">
            <button class="delete-btn" type="button" @click.stop="removeStream(idx)" :aria-label="`remove ${s.name}`"
              title="Remove">
              <v-icon :icon="icons.mdiTrashCan" aria-hidden="true" focusable="false" width="16" height="16" />
            </button>
          </div>
        </div>
      </div>

      <div class="add-new">
        <input v-model="newName" type="text" placeholder="Name (e.g. Cam 5)" aria-label="New stream name"
          @keydown.enter.prevent="addNewStream" />
        <input v-model="newUrl" type="text" placeholder="Stream URL (e.g. https://127.0.0.1:10306/live/)"
          aria-label="New stream URL" @keydown.enter.prevent="addNewStream" />
        <button class="add-btn" type="button" @click="addNewStream" :disabled="!canAddNew" :aria-disabled="!canAddNew"
          title="Add stream">
          <v-icon :icon="icons.mdiPlus" aria-hidden="true" focusable="false" width="20" height="20" />
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<script>
import { defineComponent, ref, watch, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { mdiTrashCan, mdiClose, mdiPlus } from '@mdi/js'

export default defineComponent({
  name: 'VideoDialog',
  props: {
    visible: Boolean,
    initialUrl: { type: String, default: '' },
    initialUser: { type: String, default: '' },
    initialPassword: { type: String, default: '' },
    initialProtocol: { type: String, default: 'hls' },
    mediamtxBase: { type: String, default: '' },
  },
  data() {
    return {
      icons: {
        mdiTrashCan,
        mdiClose,
        mdiPlus,
      }
    }
  },
  emits: ['update:visible', 'add:stream'],
  setup(props, { emit }) {
    const protocol = ref(props.initialProtocol)
    const mount = ref('')
    const fullUrl = ref('')

    const STORAGE_KEY = 'predefinedStreams'
    const predefinedStreams = ref([])
    const newName = ref('')
    const newUrl = ref('')
    const streamName = ref('')
    const selectedIndex = ref(null)
    const selectedStream = computed(() =>
      selectedIndex.value === null ? null : predefinedStreams.value[selectedIndex.value],
    )

    const internalVisible = computed({
      get: () => props.visible,
      set: (v) => emit('update:visible', v),
    })

    const { smAndDown, mdAndDown } = useDisplay()
    const fullscreen = computed(() => smAndDown.value)
    const dialogMaxWidth = computed(() => (mdAndDown.value ? '92%' : 520))
    const contentStyle = computed(() =>
      fullscreen.value ? { maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' } : {},
    )

    watch(
      () => props.initialProtocol,
      (v) => (protocol.value = v),
    )

    onMounted(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            predefinedStreams.value = parsed.filter((s) => s && s.url && s.name)
          } else {
            loadDefaults()
          }
        } else {
          loadDefaults()
        }
      } catch (err) {
        console.error('Error loading predefined streams from localStorage', err)
        loadDefaults()
      }
    })

    function loadDefaults() {
      predefinedStreams.value = [
        { name: 'Cam 1', url: 'https://127.0.0.1:10306/ipv-5g/static-cam1/' },
        { name: 'Cam 2', url: 'https://127.0.0.1:10306/ipv-5g/static-cam2/' },
        { name: 'Cam 3', url: 'https://127.0.0.1:10306/ipv-5g/static-cam3/' },
        { name: 'Cam 4', url: 'https://127.0.0.1:10306/ipv-5g/static-cam4/' },
        { name: 'Drone', url: 'https://127.0.0.1:10306/ipv-5g/drone/' },
      ]
      persistPredefined()
    }

    function persistPredefined() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(predefinedStreams.value))
      } catch (err) {
        console.error('Error saving predefined streams to localStorage', err)
      }
    }

    function close() {
      internalVisible.value = false
    }

    function normalizeToHls(stream) {
      if (!stream || !stream.url) return stream
      const rawUrl = String(stream.url).trim()
      if (!rawUrl) return { ...stream }
      const detectProtocol = (u) => {
        const s = u.trim().toLowerCase()
        if (s.startsWith('rtmp://')) return 'rtmp'
        if (s.startsWith('rtsp://')) return 'rtsp'
        if (s.startsWith('wss://') || s.startsWith('webrtc://') || s.startsWith('ws://'))
          return 'webrtc'
        if (s.endsWith('.m3u8') || s.includes('.m3u8')) return 'hls'
        if (s.startsWith('http://') || s.startsWith('https://')) return 'hls'
        return stream.protocol || 'hls'
      }
      let proto = detectProtocol(rawUrl)
      if (proto === 'webrtc') return { ...stream, protocol: 'webrtc', url: rawUrl }
      if (proto === 'rtmp' || proto === 'rtsp') {
        try {
          let hlsUrl = rawUrl.replace(/^(rtmp|rtsp):\/\//i, 'https://')
          hlsUrl = hlsUrl.replace(/(^https:\/*)/i, 'https://')
          if (!/\.m3u8(\b|$)/i.test(hlsUrl)) {
            if (!hlsUrl.endsWith('/')) hlsUrl += '/'
            hlsUrl += 'index.m3u8'
          }
          return { ...stream, protocol: 'hls', url: hlsUrl }
        } catch (err) {
          console.error('Error converting the stream url!', err)
          return { ...stream, protocol: 'hls' }
        }
      }
      if (proto === 'hls') {
        let hlsUrl = rawUrl
        if (!/\.m3u8(\b|$)/i.test(hlsUrl)) {
          if (!hlsUrl.endsWith('/')) hlsUrl += '/'
          hlsUrl += 'index.m3u8'
        }
        return { ...stream, protocol: 'hls', url: hlsUrl }
      }
      return { ...stream, protocol: 'hls', url: rawUrl }
    }

    function mqttTopicFromStreamUrl(rawUrl) {
      if (!rawUrl) return null
      try {
        const replaced = rawUrl.replace(/^rtmp:\/\//i, 'http://').replace(/^rtsp:\/\//i, 'http://')
        const u = new URL(replaced)
        const segments = (u.pathname || '')
          .split('/')
          .filter((s) => s && s.trim() !== '')
          .map((s) => s.replace(/\s+/g, '_'))
        if (segments.length === 0) return null
        const last = segments[segments.length - 1]
        if (last.includes('.')) segments.pop()
        if (segments.length === 0) return null
        const path = segments.join('/')
        return `devices/${path}`
      } catch (err) {
        const m = rawUrl.match(/:\/\/[^\/]+\/(.+)$/)
        if (!m) return null
        const segments = m[1]
          .split('/')
          .filter((s) => s && s.trim() !== '')
          .map((s) => s.replace(/\s+/g, '_'))
        if (segments.length === 0) return null
        const last = segments[segments.length - 1]
        if (last.includes('.')) segments.pop()
        if (segments.length === 0) return null
        const path = segments.join('/')
        return `devices/${path}`
      }
    }

    function selectIndex(idx) {
      selectedIndex.value = idx
      apply()
    }

    const canAddNew = computed(() => {
      const nameOk = newName.value && String(newName.value).trim().length > 0
      const urlOk = newUrl.value && String(newUrl.value).trim().length > 0
      return nameOk && urlOk
    })

    function addNewStream() {
      if (!canAddNew.value) return
      const name = String(newName.value).trim()
      const theUrl = String(newUrl.value).trim()
      const existingIndex = predefinedStreams.value.findIndex(
        (s) => s.url === theUrl || s.name === name,
      )
      if (existingIndex !== -1) {
        selectedIndex.value = existingIndex
        newName.value = ''
        newUrl.value = ''
        return
      }
      predefinedStreams.value.push({ name, url: theUrl })
      persistPredefined()
      selectedIndex.value = predefinedStreams.value.length - 1
      newName.value = ''
      newUrl.value = ''
    }

    function removeStream(idx) {
      const s = predefinedStreams.value[idx]
      if (!s) return
      predefinedStreams.value.splice(idx, 1)
      persistPredefined()
      if (selectedIndex.value === idx) {
        selectedIndex.value = null
      } else if (selectedIndex.value > idx) {
        selectedIndex.value = selectedIndex.value - 1
      }
    }

    function apply() {
      if (protocol.value === 'webrtc') {
        let playUrl = null
        let mountName = mount.value || null
        if (selectedStream.value && selectedStream.value.url) {
          playUrl = selectedStream.value.url
        } else if (fullUrl.value) {
          playUrl = fullUrl.value
        } else if (mountName) {
          const base = props.mediamtxBase
            ? String(props.mediamtxBase).replace(/\/$/, '')
            : window.location.origin
          playUrl = `${base}/${encodeURIComponent(mountName)}/whep`
        }
        if (!playUrl) return

        const ptzTopic = mountName ? `devices/${mountName}/control_all_device` : null

        const payload = {
          protocol: 'webrtc',
          mount: mountName,
          webrtcPlayUrl: playUrl,
          ptzTopic,
        }
        emit('add:stream', payload)
        emit('update:visible', false)
        return
      }
      const chosenUrl =
        selectedStream.value && selectedStream.value.url ? selectedStream.value.url : url.value
      if (!chosenUrl) return
      const rawStream = {
        name: selectedStream.value && selectedStream.value.name ? selectedStream.value.name : streamName.value || 'Unnamed Stream',
        url: chosenUrl.trim(),
        protocol: protocol.value,
      }

      const normalizedStream = normalizeToHls(rawStream)
      const finalStream = { ...normalizedStream, protocol: normalizedStream.protocol || 'hls' }

      const baseTopic = mqttTopicFromStreamUrl(finalStream.url)
      const ptzTopic = baseTopic ? `${baseTopic}/control_all_device` : null

      const finalWithTopic = { ...finalStream, ptzTopic }

      emit('add:stream', finalWithTopic)
      emit('update:visible', false)
    }

    return {
      mdiTrashCan,
      internalVisible,
      dialogMaxWidth,
      fullscreen,
      contentStyle,
      predefinedStreams,
      newName,
      newUrl,
      selectedIndex,
      selectIndex,
      removeStream,
      addNewStream,
      canAddNew,
      close,
    }
  },
})
</script>

<style scoped>
.dialog-content {
  position: relative;
  background: #1f2937;
  color: white;
  padding: clamp(12px, 3vw, 24px);
  border-radius: 12px;
  min-width: 280px;
  max-width: clamp(320px, 92%, 640px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
}

.close-x {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: none;
  color: #fff;
  font-size: clamp(20px, 3.5vw, 28px);
  font-weight: 700;
  cursor: pointer;
  z-index: 20;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.12s,
    background 0.12s,
    transform 0.08s;
}

.close-x:hover {
  color: #fff;
  background: rgba(59, 130, 246, 0.12);
  transform: translateY(-2px);
}

.control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.protocol-wrapper {
  position: relative;
}

.protocol-select {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 100%;
  padding: 8px 36px 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  box-sizing: border-box;
  font-size: 14px;
  transition:
    box-shadow 0.12s ease,
    border-color 0.12s ease;
}

.protocol-wrapper::after {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

.protocol-select:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.7);
}

.protocol-select option {
  background: #1f2937;
  color: #fff;
}

.streams-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
  max-height: 360px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.5) rgba(255, 255, 255, 0.05);
}

.streams-list::-webkit-scrollbar {
  width: 6px;
}

.streams-list::-webkit-scrollbar-thumb {
  background-color: rgba(59, 130, 246, 0.6);
  border-radius: 4px;
}

.streams-list::-webkit-scrollbar-thumb:hover {
  background-color: rgba(37, 99, 235, 0.8);
}

.streams-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
}

.stream-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition:
    transform 0.08s ease,
    box-shadow 0.08s ease,
    background 0.08s ease;
  outline: none;
}

.stream-item:hover,
.stream-item:focus {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
  background: rgba(255, 255, 255, 0.03);
}

.stream-item.selected {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.06));
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.08);
}

.stream-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.stream-name {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stream-url {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 420px;
}

.stream-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 44px;
  height: 44px;
}

.delete-btn {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: rgba(59, 130, 246, 0.06);
  color: #3b82f6;
  cursor: pointer;
  transition:
    transform 0.08s ease,
    background 0.12s ease;
  padding: 0;
}

.delete-btn svg {
  display: block;
  width: 18px;
  height: 18px;
}

.delete-btn:hover {
  transform: translateY(-2px);
  background: rgba(37, 99, 235, 0.12);
}

.add-new {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.01);
}

.add-new input[type='text'] {
  flex: 1;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: #fff;
  box-sizing: border-box;
  font-size: 13px;
}

.add-btn {
  width: 44px;
  height: 44px;
  display: inline-grid;
  place-items: center;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: white;
  font-weight: 700;
  font-size: 20px;
  cursor: pointer;
  transition:
    transform 0.08s ease,
    background 0.12s ease;
}

.add-btn:disabled {
  background: rgba(59, 130, 246, 0.22);
  color: rgba(255, 255, 255, 0.92);
  cursor: not-allowed;
  opacity: 0.95;
}

.add-btn:not(:disabled):hover {
  transform: translateY(-2px);
  background: #2563eb;
}

button[type='button'] {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #3b82f6;
  color: white;
  font-weight: 500;
}

button[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

button:hover:not([disabled]) {
  background: #2563eb;
}

@media (max-width: 600px) {
  .dialog-content {
    padding: 12px;
  }

  .close-x {
    top: 8px;
    right: 8px;
    font-size: 22px;
    padding: 6px 8px;
  }

  .stream-url {
    max-width: 220px;
    font-size: 11px;
  }

  .add-new {
    flex-direction: column;
    align-items: stretch;
  }

  .add-btn {
    width: 100%;
    height: 40px;
  }
}
</style>

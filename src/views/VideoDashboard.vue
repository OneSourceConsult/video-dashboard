<template>
  <div class="video-dashboard">
    <v-container fluid class="grid-container">
      <v-row :class="['grid-wrapper', { scrollable: mdAndDown }]" :style="{ '--cols': effectiveCols, '--rows': rows }">
        <v-col v-for="cell in cellsArray" :key="cell" class="grid-col">
          <VideoCard :index="cell - 1" :stream="streams[cell - 1]" @open="openDialog" @edit="streamDialogVisible = true"
            @remove="removeStream" />
        </v-col>
      </v-row>
    </v-container>

    <header class="header">
      <!-- IPV LOGOS -->
      <div class="d-flex align-center flex-wrap" :class="$vuetify.display.xsOnly ? 'ml-2 mr-2' : 'ml-4 mr-1'"
        style="gap: 8px; flex-wrap: wrap; width: 100%">
        <img src="@/assets/logo_white_2.png" alt="" :width="$vuetify.display.xsOnly ? 90 : 147"
          :height="$vuetify.display.xsOnly ? 20 : 30" style="max-width: 100%; height: auto; margin-right: 32px" />
        <img src="@/assets/ipv_logo_white.png" alt="" :width="$vuetify.display.xsOnly ? 40 : 60"
          :height="$vuetify.display.xsOnly ? 15 : 20" style="max-width: 100%; height: auto; margin-right: 20px" />
        <img src="@/assets/ama-parceiros.png" alt="" :width="$vuetify.display.xsOnly ? 70 : 110"
          :height="$vuetify.display.xsOnly ? 15 : 20" style="max-width: 100%; height: auto; margin-right: 20px" />
        <img src="@/assets/logo_governo_pt.png" alt="" :width="$vuetify.display.xsOnly ? 45 : 75"
          :height="$vuetify.display.xsOnly ? 15 : 20" style="max-width: 100%; height: auto; margin-right: 20px" />
        <img src="@/assets/PRR_white.png" alt="" :width="$vuetify.display.xsOnly ? 35 : 55"
          :height="$vuetify.display.xsOnly ? 15 : 20" style="max-width: 100%; height: auto; margin-right: 20px" />
        <img src="@/assets/Flag_of_Europe.svg.png" alt="" :width="$vuetify.display.xsOnly ? 20 : 35"
          :height="$vuetify.display.xsOnly ? 18 : 25" style="max-width: 100%; height: auto" />
      </div>
      <!-- END OF IPV LOGOS -->

      <v-icon :color="isConnected ? 'green' : 'red'" class="header-icon"
        :title="isConnected ? 'MQTT: Connected' : 'MQTT: Disconnected'" :size="smAndDown ? 18 : 20"
        style="width:auto; height:auto; margin-right:12px;"
        @click="isConnected ? $store.dispatch('mqtt/disconnect') : $store.dispatch('mqtt/connect', { mqttUrl: mqttBrokerUrl })">
        <v-icon v-if="isConnected" :icon="mdiLanConnect" :size="smAndDown ? 18 : 20" />
        <v-icon v-else :icon="mdiLanDisconnect" :size="smAndDown ? 18 : 20" />
      </v-icon>
      <v-icon :icon="mdiCogOutline" class="header-icon" :size="headerIconSize" title="Settings"
        @click="settingsDialogVisible = true" />

      <v-icon :icon="mdiLogout" class="header-icon" :size="headerIconSize" title="Logout"
        @click="$store.dispatch('auth/logout')" />

      <v-dialog v-model="settingsDialogVisible" max-width="700">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="text-h5">
              Settings
            </div>
            <v-btn icon small @click="settingsDialogVisible = false" title="Close">
              <v-icon :icon="mdiClose" />
            </v-btn>
          </v-card-title>

          <v-card-text>
            <!-- Columns & Rows controls -->
            <v-row dense>
              <v-col cols="12" sm="7">
                <div class="d-flex align-center justify-space-between mb-3">
                  <div>
                    <div class="text-h6">Grid Layout</div>
                    <div class="caption">Adjust columns and rows for the video grid.</div>
                  </div>
                </div>

                <div class="subtitle-2 mb-1">Presets</div>
                <div class="d-flex" style="gap:8px; flex-wrap:wrap;">
                  <v-btn small outlined @click="cols = 1; rows = 1" title="1×1">1×1</v-btn>
                  <v-btn small outlined @click="cols = 2; rows = 1" title="2×1">2×1</v-btn>
                  <v-btn small outlined @click="cols = 2; rows = 2" title="2×2">2×2</v-btn>
                  <v-btn small outlined @click="cols = 3; rows = 2" title="3×2">3×2</v-btn>
                  <v-btn small outlined @click="cols = 4; rows = 3" title="4×3">4×3</v-btn>
                  <v-spacer />
                  <v-btn small text color="primary" @click="cols = 2; rows = 1" title="Reset to default"><v-icon>{{
                    mdiRestore }}</v-icon>
                    Reset
                  </v-btn>
                </div>
              </v-col>

              <v-col cols="12" sm="5">
                <div class="subtitle-2 mb-2">Live preview</div>
                <v-card outlined height="180">
                  <v-card-text class="pa-3" style="padding-bottom:12px;">
                    <div
                      style="width:100%; height:100%; display:grid; gap:8px; align-items:stretch; justify-items:stretch; overflow:hidden;"
                      :style="{
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        gridAutoRows: rows ? `minmax(${Math.max(30, Math.floor(160 / rows))}px, 1fr)` : 'minmax(40px,1fr)'
                      }">
                      <div v-for="cell in cellsArray" :key="cell"
                        style="background: rgba(0,0,0,0.45); border-radius:6px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px;">
                        <div style="text-align:center;">
                          <div style="font-weight:600;">{{ cell }}</div>
                          <div style="font-size:10px; opacity:0.85;">{{ cols }} × {{ rows }}</div>
                        </div>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- MQTT Broker URL -->
            <v-row dense class="mt-4">
              <v-col cols="12" sm="12">
                <div class="text-h6">MQTT Broker</div>
                <div class="caption mb-2">Set the MQTT broker URL</div>
                <v-text-field v-model="mqttBrokerUrl" label="Broker URL" dense outlined clearable
                  placeholder="mqtt://localhost:1883" class="w-100" />
              </v-col>
            </v-row>

            <!-- Transcription WebSocket URL -->
            <v-row dense class="mt-4">
              <v-col cols="12" sm="12">
                <div class="text-h6">Transcription WebSocket</div>
                <div class="caption mb-2">Set the transcription WebSocket URL</div>
                <v-text-field v-model="transcriptionWebSocketUrl" label="WebSocket URL" dense outlined clearable
                  placeholder="ws://localhost:10331" class="w-100" />
              </v-col>
            </v-row>

          </v-card-text>

          <!-- Actions -->
          <v-divider />
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="settingsDialogVisible = false">Cancel</v-btn>
            <v-btn color="primary" @click="applySettings">Apply</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </header>

    <StreamDialog :visible="streamDialogVisible" @update:visible="streamDialogVisible = $event"
      @add:stream="addStream" />

  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import { useDisplay } from "vuetify";
import { mdiFilterSettings, mdiCogOutline, mdiClose, mdiRestore, mdiLanConnect, mdiLanDisconnect, mdiLogout } from "@mdi/js";
import VideoCard from "../components/VideoCard.vue";
import StreamDialog from "@/components/StreamDialog.vue";
import store from "@/store";

export default {
  name: "VideoDashboard",
  components: {
    VideoCard,
    StreamDialog,
  },
  computed: {
    isConnected() {
      return this.$store.getters['mqtt/isConnected']
    }
  },
  methods: {
    applySettings() {
      store.dispatch('mqtt/disconnect');
      try {
        localStorage.setItem('mqtt:brokerUrl', this.mqttBrokerUrl || '');
        localStorage.setItem('mqtt:transcriptionWebSocketUrl', this.transcriptionWebSocketUrl || '');
      } catch (e) {
        console.warn('Failed to save mqtt broker URL to localStorage', e);
      }
      store.dispatch('mqtt/connect', { mqttUrl: this.mqttBrokerUrl });
      this.settingsDialogVisible = false;
    },
  },
  setup() {
    const STORAGE_KEYS = {
      cols: "videoGrid:cols",
      rows: "videoGrid:rows",
    };

    const cols = ref(2);
    const rows = ref(1);
    const path = mdiFilterSettings;

    const dialogVisible = ref(false);
    const streamDialogVisible = ref(false);
    const activeIndex = ref(null);
    const streams = ref([]);

    const { smAndDown, mdAndDown } = useDisplay();

    const total = computed(() => Math.max(1, cols.value * rows.value));
    const cellsArray = computed(() =>
      Array.from({ length: total.value }, (_, i) => i + 1)
    );

    const effectiveCols = computed(() => {
      const requested = cols.value;
      if (smAndDown.value) return Math.min(requested, 1);
      if (mdAndDown.value) return Math.min(requested, 2);
      return requested;
    });

    const headerIconSize = computed(() => (smAndDown.value ? 24 : 28));

    function ensureStreamsSize() {
      const needed = total.value;
      while (streams.value.length < needed) streams.value.push(null);
      while (streams.value.length > needed) streams.value.pop();
    }

    watch(total, ensureStreamsSize, { immediate: true });

    function saveGridToStorage() {
      try {
        localStorage.setItem(STORAGE_KEYS.cols, String(cols.value));
        localStorage.setItem(STORAGE_KEYS.rows, String(rows.value));
      } catch (e) {
        console.warn("Failed to save grid to localStorage", e);
      }
    }

    function loadGridFromStorage() {
      try {
        const sc = localStorage.getItem(STORAGE_KEYS.cols);
        const sr = localStorage.getItem(STORAGE_KEYS.rows);
        if (sc !== null) {
          const parsed = parseInt(sc, 10);
          if (!Number.isNaN(parsed) && parsed > 0) cols.value = parsed;
        }
        if (sr !== null) {
          const parsed = parseInt(sr, 10);
          if (!Number.isNaN(parsed) && parsed > 0) rows.value = parsed;
        }
      } catch (e) {
        console.warn("Failed to load grid from localStorage", e);
      }
    }

    watch([cols, rows], saveGridToStorage);

    function updateGrid({ cols: newCols, rows: newRows }) {
      cols.value = newCols;
      rows.value = newRows;
    }

    function openDialog(index) {
      activeIndex.value = index;
      streamDialogVisible.value = true;
    }

    function addStream(stream) {
      try {
        if (activeIndex.value === null) return;
        if (stream.protocol === "webrtc") {
          const webrtcObj = {
            ...stream,
            timestampSend: stream.timestampSend || Date.now(),
            muted: typeof stream.muted === "boolean" ? stream.muted : true,
          };
          streams.value.splice(activeIndex.value, 1, webrtcObj);
        } else {
          streams.value.splice(activeIndex.value, 1, stream);
        }
        streamDialogVisible.value = false;
        activeIndex.value = null;
      } catch (e) {
        console.error("Error adding stream", e);
      }
    }

    function removeStream(index) {
      try {
        streams.value.splice(index, 1, null);
      } catch (e) {
        console.error("Error removing stream at index", index, e);
      }
    }

    onMounted(() => {
      loadGridFromStorage();
      ensureStreamsSize();
    });

    return {
      cols,
      rows,
      path,
      dialogVisible,
      streamDialogVisible,
      mdAndDown,
      smAndDown,
      headerIconSize,
      effectiveCols,
      cellsArray,
      streams,
      updateGrid,
      openDialog,
      addStream,
      removeStream,
      mdiCogOutline,
      settingsDialogVisible: ref(false),
      mdiClose,
      mdiRestore,
      mqttBrokerUrl: ref(localStorage.getItem('mqtt:brokerUrl') || import.meta.env.VITE_APP_MQTT_URL),
      transcriptionWebSocketUrl: ref(localStorage.getItem('mqtt:transcriptionWebSocketUrl') || import.meta.env.VITE_APP_TRANSCRIPTION_URL),
      mdiLanConnect,
      mdiLanDisconnect,
      mdiLogout,
    };
  },
};
</script>

<style scoped>
.video-dashboard {
  width: 100%;
  max-width: none;
  flex: 1 1 auto;
  min-height: calc(100vh - var(--header-height, 0px) - var(--footer-height, 0px));
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.grid-container {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}

.grid-wrapper {
  display: grid;
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  grid-template-columns: repeat(var(--cols), 1fr);
  grid-template-rows: repeat(var(--rows), 1fr);
  align-items: stretch;
  justify-items: stretch;
  gap: 10px;
  margin: 0;
  overflow-x: hidden;
  padding: 10px;
  padding-bottom: 75px;
}

.grid-col {
  display: contents;
}

.grid-wrapper.scrollable {
  grid-template-rows: none;
  grid-auto-rows: minmax(auto, auto);
  overflow-y: auto;
}

.video-card {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 0px;
}

.header {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 8px 0;
  background: #1f2937;
}

.header-icon {
  width: 28px;
  height: 28px;
  color: #ffffff;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    color 0.2s ease;
  margin-right: 16px;
}

.header-icon:hover {
  transform: scale(1.15);
  color: var(--color-primary, #00bfff);
}
</style>

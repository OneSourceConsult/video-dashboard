<template>
  <v-card :style="{ minHeight: cardMinHeight }" class="video-card" elevation="1" @click="onClick"
    @mouseenter="hovered = true" @mouseleave="hovered = false">
    <template v-if="!localStream">
      <v-card-text class="content d-flex flex-column align-center justify-center">
        <v-icon size="large" :icon="icons.mdiPlusCircle" :style="{ width: iconSize + 'px', height: iconSize + 'px' }" />
        <div class="text-body-1 mt-2">Add Camera</div>
      </v-card-text>
    </template>

    <template v-else>
      <!-- Stream Info -->
      <div
        style="position:absolute; top:0px; left:0px; right:0px; z-index:15; display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.45); backdrop-filter: blur(6px); pointer-events:auto;">
        <!-- Left: stream + video info -->
        <v-row class="ma-0 pa-0" align="center" style="flex:1; min-width:0; gap:8px;">
          <v-col cols="auto" class="pa-0"
            style="min-width:0; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
            :title="stream.name || 'Unnamed stream'">
            <div style="color:#fff; padding:4px 8px;">{{ stream.name || 'Unnamed stream' }}</div>
          </v-col>

          <v-col cols="auto" class="pa-0" v-if="videoStatus && typeof videoStatus.readyState !== 'undefined'">
            <div
              style="color:#fff; border:1px solid rgba(255,255,255,0.08); padding:4px 8px; border-radius:4px; font-size:0.85rem; white-space:nowrap;">
              Ready: {{ videoStatus.readyState }}
            </div>
          </v-col>

        </v-row>

        <!-- Right: actions -->
        <div style="display:flex; align-items:center; gap:6px; pointer-events:auto;">
          <!-- Closed Captions -->
          <v-btn icon variant="text" size="medium"
            :style="{ width: iconSize + 'px', height: iconSize + 'px', color: '#fff' }" title="Toggle closed captions"
            aria-label="Toggle closed captions" @click.stop="toggleClosedCaptions">
            <v-icon :icon="closedCaptionEnabled ? icons.mdiClosedCaption : icons.mdiClosedCaptionOutline" />
          </v-btn>

          <!-- Transcription -->
          <v-btn icon variant="text" size="medium"
            :style="{ width: iconSize + 'px', height: iconSize + 'px', color: '#fff' }" title="View transcription"
            aria-label="View transcription" @click.stop="getTranscription()">
            <v-icon :icon="icons.mdiScriptTextOutline" />
          </v-btn>

          <!-- Remove -->
          <v-btn icon variant="text" size="medium"
            :style="{ width: iconSize + 'px', height: iconSize + 'px', color: '#fff' }" title="Remove stream"
            aria-label="Remove stream" @click.stop="closeStream()">
            <v-icon :icon="icons.mdiClose" />
          </v-btn>
        </div>
      </div>

      <div class="player-container">
        <!-- WebRTC video -->
        <video v-if="isWebrtc(localStream)" ref="webrtcVideoEl" autoplay playsinline :muted="localStream.muted"
          class="player" @play="startedWebrtc"></video>

        <!-- HLS video -->
        <video v-else-if="isHls(localStream)" ref="videoEl" class="player" controls muted playsinline></video>

        <!-- JOYSTICK OVERLAY (only visible when hovered) -->
        <div v-if="hovered" class="joystick-overlay" @mousedown.stop @touchstart.stop>
          <Joystick @joystick-up="joystickAction('up')" @joystick-down="joystickAction('down')"
            @joystick-left="joystickAction('left')" @joystick-right="joystickAction('right')"
            @joystick-stop="joystickAction('stop')" @a-start="joystickAction('a-start')"
            @a-stop="joystickAction('a-stop')" @b-start="joystickAction('b-start')"
            @b-stop="joystickAction('b-stop')" />
        </div>
      </div>
    </template>
  </v-card>
</template>

<script>
import Hls from "hls.js";
import Joystick from "@/components/Joystick.vue";
import {
  mdiPlusCircle,
  mdiAccountGroup,
  mdiCog,
  mdiClose,
  mdiClosedCaption,
  mdiClosedCaptionOutline,
  mdiScriptTextOutline
} from "@mdi/js";
import store from "@/store";

export default {
  name: "VideoCard",
  components: { Joystick },
  props: {
    stream: { type: Object, default: null },
    index: { type: Number, required: true },
    timestampSend: { type: Number, default: 0 },
  },
  emits: ["open", "edit", "remove"],
  data() {
    return {
      cardId: "video-card-" + Math.random().toString(36).slice(2, 11),
      transcriptionSocket: null,
      transcription: [],
      hls: null,
      hovered: false,
      statsInterval: null,
      startedVideo: false,
      webRtcStats: null,
      localStream: this.stream,
      pcRef: null,
      closedCaptionEnabled: false,
      icons: {
        mdiPlusCircle,
        mdiAccountGroup,
        mdiCog,
        mdiClose,
        mdiClosedCaption,
        mdiClosedCaptionOutline,
        mdiScriptTextOutline
      },
      smAndDown: window.matchMedia("(max-width: 600px)").matches,
      mqListener: null,
    };
  },
  computed: {
    iconSize() {
      return this.smAndDown ? 22 : 40;
    },
    cardMinHeight() {
      return this.smAndDown ? "140px" : "300px";
    },
    videoStatus() {
      const videoEl =
        this.isWebrtc(this.localStream) && this.$refs.webrtcVideoEl
          ? this.$refs.webrtcVideoEl
          : this.isHls(this.localStream) && this.$refs.videoEl
            ? this.$refs.videoEl
            : null;
      if (!videoEl) return "No video element";
      return {
        readyState: videoEl.readyState,
        videoWidth: videoEl.videoWidth,
        videoHeight: videoEl.videoHeight,
        paused: videoEl.paused,
        ended: videoEl.ended,
      };
    },
  },
  watch: {
    stream(newVal) {
      this.localStream = newVal;
      this.$nextTick(() => {
        if (this.isHls(this.localStream)) this.setupHls();
        if (this.isWebrtc(this.localStream)) this.setupWhepPlay();
      });
    },
  },
  methods: {
    closeStream() {
      this.$emit("remove", this.index);
      if (this.transcriptionSocket)
        this.transcriptionSocket.close();
      if (this.closedCaptionEnabled)
        this.closedCaptionEnabled = false;
      this.transcription = [];
    },
    onClick() {
      if (!this.localStream) this.$emit("open", this.index);
    },
    isHls(stream) {
      return stream?.protocol === "hls";
    },
    isWebrtc(stream) {
      return stream?.protocol === "webrtc";
    },
    setupHls() {
      if (!this.localStream || !this.$refs.videoEl) return;
      this.destroyHls();
      const { url } = this.localStream;
      if (!url) {
        console.warn("setupHls: no URL provided for HLS stream", this.localStream);
        return;
      }
      if (Hls.isSupported()) {
        this.hls = new Hls();
        this.hls.loadSource(url);
        this.hls.attachMedia(this.$refs.videoEl);
        this.hls.on(Hls.Events.MANIFEST_PARSED, () =>
          this.$refs.videoEl.play().catch((err) => {
            console.warn("HLS: video play() failed after manifest parsed", err);
          })
        );
        this.hls.on(Hls.Events.ERROR, (event, data) =>
          console.error("HLS.js error event:", event, data)
        );
      } else if (this.$refs.videoEl.canPlayType("application/vnd.apple.mpegurl")) {
        this.$refs.videoEl.src = url;
        this.$refs.videoEl
          .play()
          .catch((err) => console.warn("Native HLS: video play() failed", err));
      } else {
        console.warn("setupHls: HLS not supported", { url });
      }
    },
    destroyHls() {
      if (this.hls) {
        try {
          this.hls.destroy();
        } catch {
          console.warn("destroyHls: failed to destroy");
        }
        this.hls = null;
      }
      const v = this.$refs.videoEl;
      if (v) {
        try {
          v.src = "";
        } catch {
          console.warn("destroyHls: failed to clear src");
        }
      }
    },
    waitIceGatheringComplete(pc, timeout = 5000) {
      if (!pc) return Promise.resolve();
      if (pc.iceGatheringState === "complete") return Promise.resolve();
      return new Promise((resolve) => {
        const handler = () => {
          if (pc.iceGatheringState === "complete") {
            try {
              pc.removeEventListener("icegatheringstatechange", handler);
            } catch {
              console.error("waitIceGatheringComplete: failed to remove event listener");
            }
            clearTimeout(timer);
            resolve();
          }
        };
        const timer = setTimeout(() => {
          try {
            pc.removeEventListener("icegatheringstatechange", handler);
          } catch {
            console.error("Error removing timer listener");
          }
          resolve();
        }, timeout);
        try {
          pc.addEventListener("icegatheringstatechange", handler);
        } catch {
          clearTimeout(timer);
          resolve();
        }
      });
    },
    async setupWhepPlay() {
      if (!this.localStream || !this.$refs.webrtcVideoEl) return false;
      this.destroyWhep();
      const mount =
        this.localStream.mount ||
        this.localStream.janusStreamID ||
        this.localStream.id;
      const explicitUrl = this.localStream.webrtcPlayUrl || null;
      const envBase = import.meta.env.VITE_APP_MEDIAMTX_BASE_URL || null;
      const streamBase =
        this.localStream.mediamtxBase ||
        this.localStream.janusServerURL ||
        (this.localStream.url && String(this.localStream.url).startsWith("http")
          ? this.localStream.url
          : null);
      const base = explicitUrl
        ? null
        : streamBase || envBase || window.location.origin;
      const endpoint = explicitUrl
        ? explicitUrl
        : `${String(base).replace(/\/+$/, "")}/${encodeURIComponent(mount)}/whep`;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      this.pcRef = pc;

      let gotTrack = false;
      const NO_TRACK_TIMEOUT_MS = 8000;
      let noTrackTimer = setTimeout(() => {
        if (!gotTrack) {
          this.destroyWhep();
        }
      }, NO_TRACK_TIMEOUT_MS);

      pc.ontrack = (ev) => {
        gotTrack = true;
        clearTimeout(noTrackTimer);
        const videoElRef = this.$refs.webrtcVideoEl;
        if (!videoElRef) return;
        try {
          videoElRef.srcObject =
            ev.streams && ev.streams[0]
              ? ev.streams[0]
              : new MediaStream(ev.track ? [ev.track] : []);
          videoElRef.play().catch((e) => {
            console.warn("[webrtc] videoEl.play() failed", e);
          });
        } catch {
          console.warn("[webrtc] failed to attach track");
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (["failed", "disconnected"].includes(pc.iceConnectionState))
          this.destroyWhep();
      };

      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState))
          this.destroyWhep();
      };

      try {
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });
      } catch {
        console.warn("[webrtc] addTransceiver failed");
      }

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await this.waitIceGatheringComplete(pc, 5000);

        const controller = new AbortController();
        const FETCH_TIMEOUT_MS = 8000;
        const fetchTimeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        let res;
        try {
          res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/sdp" },
            body: pc.localDescription ? pc.localDescription.sdp : offer.sdp,
            signal: controller.signal,
          });
        } catch {
          clearTimeout(fetchTimeout);
          this.destroyWhep();
          return false;
        }
        clearTimeout(fetchTimeout);

        if (!res.ok) {
          this.destroyWhep();
          return false;
        }

        const answerSdp = await res.text();
        if (!answerSdp || !answerSdp.trim()) {
          this.destroyWhep();
          return false;
        }

        try {
          await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
        } catch {
          this.destroyWhep();
          return false;
        }

        try {
          this.startStatsForPc(pc);
        } catch {
          console.warn("[webrtc] startStatsForPc failed");
        }
        return true;
      } catch {
        this.destroyWhep();
        return false;
      } finally {
        try {
          clearTimeout(noTrackTimer);
        } catch {
          console.error("Error clearing track timer");
        }
      }
    },
    startStatsForPc(pc) {
      if (!pc) return;
      if (this.statsInterval) clearInterval(this.statsInterval);
      this.statsInterval = setInterval(async () => {
        try {
          const stats = await pc.getStats();
          let inbound;
          stats.forEach((report) => {
            if (report.kind === "video" && report.type === "inbound-rtp")
              inbound = report;
          });
          if (inbound) {
            this.webRtcStats = {
              framesDecoded: inbound.framesDecoded,
              framesDropped: inbound.framesDropped,
              jitter: inbound.jitter,
              timestamp: inbound.timestamp,
            };
          }
        } catch {
          console.warn("startStatsForPc failed");
        }
      }, 1000);
    },
    destroyWhep() {
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
        this.statsInterval = null;
      }
      const pc = this.pcRef;
      if (pc) {
        try {
          pc.getSenders().forEach((s) => {
            if (s.track) {
              try {
                s.track.stop();
              } catch {
                console.error("Error stopping track");
              }
            }
          });
          pc.close();
        } catch {
          console.error("Error destroying WebRTC stream");
        }
        this.pcRef = null;
      }
      if (this.$refs.webrtcVideoEl) {
        try {
          this.$refs.webrtcVideoEl.srcObject = null;
        } catch {
          /* ignore */
        }
      }
      this.webRtcStats = null;
      this.startedVideo = false;
    },
    startedWebrtc() {
      if (this.startedVideo) return;
      this.startedVideo = true;
      if (!this.webRtcStats) return;
      const streamInfo = this.localStream;
      const deviceID =
        streamInfo?.deviceID ||
        streamInfo?.deviceId ||
        streamInfo?.driverDeviceID ||
        streamInfo?.mount;
      if (!deviceID) return;
      const payload = {
        type: "webrtc_latency",
        source: deviceID,
        unit: "ms",
        value: Math.round(Date.now() - (this.timestampSend || Date.now())),
      };
      try {
        // use Vuex store available as this.$store
        this.$store
          .dispatch("mqtt/publish", {
            topic: "kpi_manager/measured",
            message: JSON.stringify(payload),
          })
          .catch(() => { });
      } catch {
        console.error("Failed to send WebRTC latency KPIs");
      }
    },
    getTranscription() {
      const parts = Array.isArray(this.transcription)
        ? this.transcription.map((t) => (typeof t === "string" ? t : t?.text || "")).filter(Boolean)
        : [];
      const content = parts.join("\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = (this.stream && this.stream.name ? this.stream.name.replace(/\s+/g, "_") : "transcription") + ".txt";
      a.setAttribute("download", filename);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    toggleClosedCaptions() {
      this.closedCaptionEnabled = !this.closedCaptionEnabled;

      const ptzTopic = this.localStream?.ptzTopic || "";
      let streamId;
      if (ptzTopic) {
        const parts = ptzTopic.split("/").filter(Boolean);
        const deviceIndex = parts.indexOf("device");
        // prefer "device/<site>/<cam>" -> "<site>/<cam>"
        if (deviceIndex !== -1 && parts.length > deviceIndex + 2) {
          streamId = `${parts[deviceIndex + 1]}/${parts[deviceIndex + 2]}`;
        } else if (parts.length >= 3) {
          // fallback to second and third segments if present
          streamId = `${parts[1]}/${parts[2]}`;
        } else {
          // last-resort: join remaining or use full topic
          streamId = parts.slice(1).join("/") || parts[0] || ptzTopic;
        }
      } else {
        streamId =
          this.localStream?.mount ??
          this.localStream?.id ??
          this.localStream?.deviceID ??
          "unknown_stream";
      }

      // 1. Connect to WebSocket server if not connected else close connection
      if (this.closedCaptionEnabled) {
        const baseWs =
          (typeof window !== "undefined" && window.localStorage
            ? window.localStorage.getItem("mqtt:transcriptionWebSocketUrl")
            : null) || import.meta.env.VITE_APP_TRANSCRIPTION_URL;
        const wsUrl = `${String(baseWs).replace(/\/+$/, "")}/${streamId}`;
        this.transcriptionSocket = new WebSocket(wsUrl);
        this.transcriptionSocket.onopen = () => {
          console.log("Transcription WebSocket connected to", wsUrl);
        };
        this.transcriptionSocket.onmessage = (event) => {
          const data = event.data;
          // Handle incoming transcription data (e.g., display on video)
          console.log("Transcription data received:", data);

          // 2. Show captions on video
          try {
            // parse message payload safely
            let payload;
            if (typeof data === "string") {
              try {
                payload = JSON.parse(data);
              } catch {
                // not JSON, use raw string as text
                payload = { text: data };
              }
            } else {
              payload = data;
            }

            const rawText = (payload.text || payload.transcript || payload.message || "").trim();
            if (!rawText || rawText === "<UNK>") return;

            // ensure transcription storage exists on the component and append this item
            if (!Array.isArray(this.transcription)) this.transcription = [];
            const entry = {
              text: rawText,
              rawPayload: payload,
              receivedAt: new Date().toISOString(),
            };

            // determine sensible display duration:
            // - base on explicit start/end or duration_ms when available
            // - otherwise compute from word count (reading speed ~350ms/word)
            const parseHMS = (s) => {
              if (!s || typeof s !== "string") return null;
              const parts = s.split(":").map((p) => parseInt(p, 10));
              if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
              }
              return null;
            };
            const startSec = parseHMS(payload.start_str || payload.start_time);
            const endSec = parseHMS(payload.end_str || payload.end_time);

            const words = rawText.split(/\s+/).filter(Boolean).length || 1;
            const perWordMs = 350; // comfortable reading pace
            let durationMs = 1000 + words * perWordMs; // baseline

            // prefer explicit durations when provided
            if (startSec !== null && endSec !== null && endSec >= startSec) {
              durationMs = (endSec - startSec) * 1000;
            } else if (payload.duration_ms && Number(payload.duration_ms)) {
              durationMs = Number(payload.duration_ms);
            }

            // clamp to reasonable bounds and give a little extra so users can comfortably see it
            const MIN_MS = 2500;
            const MAX_MS = 20000;
            durationMs = Math.min(Math.max(durationMs, MIN_MS), MAX_MS);
            // add small buffer to avoid premature hiding on quick glances
            durationMs += 600;

            // store computed timing info on the transcription entry and push to the array
            entry.startSec = startSec;
            entry.endSec = endSec;
            entry.durationMs = durationMs;
            this.transcription.push(entry);
            // keep transcription array bounded to last 200 items
            if (this.transcription.length > 200) {
              this.transcription.splice(0, this.transcription.length - 200);
            }

            const container = this.$el?.querySelector?.(".player-container") || this.$el || document.body;

            // create or reuse caption element
            const CAPTION_ID = "transcription-caption";
            let el = container.querySelector("#" + CAPTION_ID);
            const smallScreen = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width:600px)").matches;
            const fontSize = smallScreen ? "13px" : "16px";

            if (!el) {
              el = document.createElement("div");
              el.id = CAPTION_ID;
              Object.assign(el.style, {
                position: "absolute",
                bottom: "40px",
                left: "50%",
                transform: "translateX(-50%) translateY(6px)",
                zIndex: "9999",
                pointerEvents: "none",
                background: "rgba(0,0,0,0.65)",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: fontSize,
                lineHeight: "1.3",
                maxWidth: "92%",
                whiteSpace: "normal",
                wordWrap: "break-word",
                textAlign: "center",
                textShadow: "0 1px 3px rgba(0,0,0,0.85)",
                opacity: "0",
                transition: "opacity 300ms ease, transform 300ms ease",
                transformOrigin: "center bottom",
                boxSizing: "border-box",
              });
              container.appendChild(el);
            } else {
              // update font size on reuse (responsive)
              el.style.fontSize = fontSize;
              // reset transition briefly to ensure reflow doesn't glitch
              el.style.transition = "none";
              void el.offsetWidth;
              el.style.transition = "opacity 300ms ease, transform 300ms ease";
            }

            // set text and clear prior timers
            el.textContent = rawText;
            if (el._hideTimer) {
              clearTimeout(el._hideTimer);
              el._hideTimer = null;
            }
            if (el._removeTimer) {
              clearTimeout(el._removeTimer);
              el._removeTimer = null;
            }

            // show caption
            void el.offsetWidth; // force reflow
            el.style.opacity = "1";
            el.style.transform = "translateX(-50%) translateY(0)";

            // schedule hide (if newer captions arrive, this will be cleared and rescheduled)
            el._hideTimer = setTimeout(() => {
              el.style.opacity = "0";
              el.style.transform = "translateX(-50%) translateY(6px)";
              // remove from DOM after transition to keep DOM clean
              el._removeTimer = setTimeout(() => {
                try {
                  if (el && el.parentNode) el.parentNode.removeChild(el);
                } catch {
                  /* ignore */
                }
              }, 350);
            }, durationMs);
          } catch (err) {
            console.error("Failed to display transcription caption:", err);
          }

        };
        this.transcriptionSocket.onerror = (error) => {
          console.error("Transcription WebSocket error:", error);
        };
        this.transcriptionSocket.onclose = () => {
          console.log("Transcription WebSocket closed");
        };
      } else {
        if (this.transcriptionSocket) {
          this.transcriptionSocket.close();
          this.transcriptionSocket = null;
        }
      }
    },
    async joystickAction(action) {
      const topic = await store.dispatch("mqtt/getTopicByStreamURL", {
        rawUrl: this.stream.url,
        suffix: "control_all_device"
      });
      switch (action) {
        case "up":
          store.dispatch("mqtt/publish", {
            topic: topic,
            message: JSON.stringify({ action: "up", type: "ptz_action" })
          });
          break;
        case "down":
          store.dispatch("mqtt/publish", {
            topic: topic,
            message: JSON.stringify({ action: "down", type: "ptz_action" })
          });
          break;
        case "left":
          store.dispatch("mqtt/publish", {
            topic: topic,
            message: JSON.stringify({ action: "left", type: "ptz_action" })
          });
          break;
        case "right":
          store.dispatch("mqtt/publish", {
            topic: topic,
            message: JSON.stringify({ action: "right", type: "ptz_action" })
          });
          break;
        case "stop":
          store.dispatch("mqtt/publish", {
            topic: topic,
            message: JSON.stringify({ action: "stop_movement", type: "ptz_action" })
          });
          break;
        case "a-start":
          store.dispatch("mqtt/publish", {
            topic: topic,
            message: JSON.stringify({ action: "zoom_in", type: "ptz_action" })
          });
          break;
        case "a-stop":
          store.dispatch("mqtt/publish", {
            topic: topic,
            message: JSON.stringify({ action: "stop_movement", type: "ptz_action" })
          });
          break;
        case "b-start":
          store.dispatch("mqtt/publish", {
            topic: topic,
            message: JSON.stringify({ action: "zoom_out", type: "ptz_action" })
          });
          break;
        case "b-stop":
          store.dispatch("mqtt/publish", {
            topic: topic,
            message: JSON.stringify({ action: "stop_movement", type: "ptz_action" })
          });
          break;
      }
    },
  },
  mounted() {
    try {
      const mq = window.matchMedia("(max-width: 600px)");
      this.mqListener = (ev) => {
        this.smAndDown = ev.matches;
      };
      if (mq.addEventListener) {
        mq.addEventListener("change", this.mqListener);
      } else if (mq.addListener) {
        mq.addListener(this.mqListener);
      }
      this.smAndDown = mq.matches;
    } catch {
      // ignore
    }

    if (this.isHls(this.localStream)) this.setupHls();
    if (this.isWebrtc(this.localStream)) this.setupWhepPlay();
  },
  beforeUnmount() {
    this.destroyHls();
    this.destroyWhep();
    try {
      const mq = window.matchMedia("(max-width: 600px)");
      if (mq.removeEventListener && this.mqListener) {
        mq.removeEventListener("change", this.mqListener);
      } else if (mq.removeListener && this.mqListener) {
        mq.removeListener(this.mqListener);
      }
    } catch {
      // ignore
    }
    if (this.transcriptionSocket) {
      try {
        this.transcriptionSocket.onmessage = null;
        this.transcriptionSocket.onopen = null;
        this.transcriptionSocket.onerror = null;
        this.transcriptionSocket.onclose = null;
        if (
          this.transcriptionSocket.readyState === WebSocket.OPEN ||
          this.transcriptionSocket.readyState === WebSocket.CONNECTING
        ) {
          this.transcriptionSocket.close();
        }
      } catch {
        // ignore
      } finally {
        this.transcriptionSocket = null;
      }
    }
  },
};
</script>

<style scoped>
.video-card {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #e5e7eb;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-sizing: border-box;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #1f2937;
  font-size: 1rem;
  text-align: center;
  user-select: none;
}

.player-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.player {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 8px;
  z-index: 10;
  padding: 6px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.actions .v-btn {
  color: white !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.actions-mobile {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 6px;
  display: flex;
  justify-content: center;
  gap: 12px;
}

.joystick-overlay {
  position: absolute;
  bottom: 50px;
  right: 0;
  pointer-events: auto;
}
</style>
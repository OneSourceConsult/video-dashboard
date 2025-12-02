<template>
  <v-col id="joystick" no-gutters>
    <!-- Direction pad -->
    <v-row no-gutters class="mt-2" justify="center">
      <div class="dpad">
        <v-btn
          icon
          size="small"
          class="joystick-btn"
          :color="up ? 'primary' : 'grey-darken-3'"
          @pointerdown="press('up', true)"
          @pointerup="press('up', false)"
        >
          <v-icon :icon="icons.mdiArrowUpBold" />
        </v-btn>

        <div class="dpad-row">
          <v-btn
            icon
            size="small"
            class="joystick-btn"
            :color="left ? 'primary' : 'grey-darken-3'"
            @pointerdown="press('left', true)"
            @pointerup="press('left', false)"
          >
            <v-icon :icon="icons.mdiArrowLeftBold" />
          </v-btn>

          <v-btn icon size="small" class="joystick-btn center-btn" disabled>
            <v-icon :icon="icons.mdiCircleSmall" />
          </v-btn>

          <v-btn
            icon
            size="small"
            class="joystick-btn"
            :color="right ? 'primary' : 'grey-darken-3'"
            @pointerdown="press('right', true)"
            @pointerup="press('right', false)"
          >
            <v-icon :icon="icons.mdiArrowRightBold" />
          </v-btn>
        </div>

        <v-btn
          icon
          size="small"
          class="joystick-btn"
          :color="down ? 'primary' : 'grey-darken-3'"
          @pointerdown="press('down', true)"
          @pointerup="press('down', false)"
        >
          <v-icon :icon="icons.mdiArrowDownBold" />
        </v-btn>
      </div>
    </v-row>

    <!-- Action buttons -->
    <v-row no-gutters justify="center" class="mt-3">
      <v-btn
        icon
        size="small"
        elevation="3"
        class="mx-2 joystick-action"
        :class="{ pressed: a }"
        :color="a ? 'primary' : 'grey-darken-3'"
        @pointerdown="press('a', true)"
        @pointerup="press('a', false)"
      >
        <v-icon :icon="icons.mdiMagnifyPlus" />
      </v-btn>

      <v-btn
        icon
        size="small"
        elevation="3"
        class="mx-2 joystick-action"
        :class="{ pressed: b }"
        :color="b ? 'primary' : 'grey-darken-3'"
        @pointerdown="press('b', true)"
        @pointerup="press('b', false)"
      >
        <v-icon :icon="icons.mdiMagnifyMinus" />
      </v-btn>
    </v-row>
  </v-col>
</template>

<script>
import {
  mdiMagnifyPlus,
  mdiMagnifyMinus,
  mdiCircleSmall,
  mdiArrowLeftBold,
  mdiArrowRightBold,
  mdiArrowUpBold,
  mdiArrowDownBold,
} from "@mdi/js";

export default {
  name: "Joystick",
  props: {
    id: [String, Number],
  },
  data() {
    return {
      up: false,
      down: false,
      left: false,
      right: false,
      a: false,
      b: false,
      activeColor: "rgba(33,33,33,0.8)",
      icons: {
        mdiMagnifyPlus,
        mdiMagnifyMinus,
        mdiCircleSmall,
        mdiArrowLeftBold,
        mdiArrowRightBold,
        mdiArrowUpBold,
        mdiArrowDownBold,
      },
      gamepadIndex: null,
      animationFrame: null,
      buttonMap: {
        up: 12,
        down: 13,
        left: 14,
        right: 15,
        a: 0,
        b: 1,
      },
      prevState: {},
    };
  },
  mounted() {
    window.addEventListener("gamepadconnected", this.onGamepadConnected);
    window.addEventListener("gamepaddisconnected", this.onGamepadDisconnected);

    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (gp) {
        this.onGamepadConnected({ gamepad: gp });
        break;
      }
    }
  },
  beforeUnmount() {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("gamepadconnected", this.onGamepadConnected);
    window.removeEventListener(
      "gamepaddisconnected",
      this.onGamepadDisconnected
    );
  },
  methods: {
    onGamepadConnected(e) {
      if (this.gamepadIndex === null) {
        this.gamepadIndex = e.gamepad.index;
        this.pollGamepad();
      }
    },
    onGamepadDisconnected(e) {
      if (e.gamepad.index === this.gamepadIndex) {
        this.gamepadIndex = null;
        cancelAnimationFrame(this.animationFrame);
      }
    },
    pollGamepad() {
      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (gp) {
        Object.entries(this.buttonMap).forEach(([key, btnIndex]) => {
          const pressed = gp.buttons[btnIndex]?.pressed || false;
          if (pressed !== this.prevState[key]) {
            this.press(key, pressed);
            this.prevState[key] = pressed;
          }
        });
      }
      this.animationFrame = requestAnimationFrame(this.pollGamepad);
    },
    press(key, val) {
      this[key] = val;
      const event = val ? `${key}-start` : `${key}-stop`;
      this.$emit(event, this.id);

      if (["up", "down", "left", "right"].includes(key) && !val) {
        if (!(this.up || this.down || this.left || this.right)) {
          this.$emit("joystick-stop", this.id);
        }
      } else if (val) {
        this.$emit(`joystick-${key}`, this.id);
      }
    },
  },
};
</script>

<style scoped>
#joystick {
  width: 150px;
  text-align: center;
  user-select: none;
}

.joystick-dir {
  transition: fill 0.15s ease;
}

.joystick-dir:hover path {
  fill: rgba(80, 80, 80, 0.3);
}

.joystick-action {
  transition: transform 0.15s ease;
}

.joystick-action:active {
  transform: scale(0.9);
}
</style>

let _intervalHandle = null
let _keydownHandler = null
let _keyupHandler = null
let _pressedKeys = new Set()

const joystickStore = {
  namespaced: true,
  state: {
    isControllerConnected: false,
    isListening: false,
    up: false,
    down: false,
    left: false,
    right: false,
    l1: false,
    l2: false,
    l3: false,
    r1: false,
    r2: false,
    r3: false,
    x: false,
    y: false,
    a: false,
    b: false,
    share: false,
    options: false,
  },
  getters: {
    getConnected: (state) => state.isControllerConnected,
    getUp: (state) => state.up,
    getDown: (state) => state.down,
    getLeft: (state) => state.left,
    getRight: (state) => state.right,
    getL1: (state) => state.l1,
    getL2: (state) => state.l2,
    getL3: (state) => state.l3,
    getR1: (state) => state.r1,
    getR2: (state) => state.r2,
    getR3: (state) => state.r3,
    getX: (state) => state.x,
    getY: (state) => state.y,
    getA: (state) => state.a,
    getB: (state) => state.b,
    getShare: (state) => state.share,
    getOptions: (state) => state.options,
  },
  mutations: {
    setControllerConnected(state, payload) {
      state.isControllerConnected = payload
    },
    setListening(state, payload) {
      state.isListening = payload
    },
    setUp(state, payload) { state.up = payload },
    setDown(state, payload) { state.down = payload },
    setLeft(state, payload) { state.left = payload },
    setRight(state, payload) { state.right = payload },
    setL1(state, payload) { state.l1 = payload },
    setL2(state, payload) { state.l2 = payload },
    setL3(state, payload) { state.l3 = payload },
    setR1(state, payload) { state.r1 = payload },
    setR2(state, payload) { state.r2 = payload },
    setR3(state, payload) { state.r3 = payload },
    setX(state, payload) { state.x = payload },
    setY(state, payload) { state.y = payload },
    setA(state, payload) { state.a = payload },
    setB(state, payload) { state.b = payload },
    setShare(state, payload) { state.share = payload },
    setOptions(state, payload) { state.options = payload },
  },
  actions: {
    initJoystick({ commit, dispatch }) {
      window.addEventListener('gamepadconnected', (e) => {
        commit('setControllerConnected', true)
        dispatch('listenToInputs')
      })

      window.addEventListener('gamepaddisconnected', (e) => {
        commit('setControllerConnected', false)
        dispatch('stopJoystick')
      })

      // Keyboard support
      _keydownHandler = (e) => {
        if (_pressedKeys.has(e.key)) return
        _pressedKeys.add(e.key)

        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            commit('setUp', true)
            break
          case 'ArrowDown':
          case 's':
          case 'S':
            commit('setDown', true)
            break
          case 'ArrowLeft':
          case 'a':
          case 'A':
            commit('setLeft', true)
            break
          case 'ArrowRight':
          case 'd':
          case 'D':
            commit('setRight', true)
            break
          case 'q':
          case 'Q':
            commit('setL1', true)
            break
          case 'e':
          case 'E':
            commit('setR1', true)
            break
        }
      }

      _keyupHandler = (e) => {
        _pressedKeys.delete(e.key)

        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            commit('setUp', false)
            break
          case 'ArrowDown':
          case 's':
          case 'S':
            commit('setDown', false)
            break
          case 'ArrowLeft':
          case 'a':
          case 'A':
            commit('setLeft', false)
            break
          case 'ArrowRight':
          case 'd':
          case 'D':
            commit('setRight', false)
            break
          case 'q':
          case 'Q':
            commit('setL1', false)
            break
          case 'e':
          case 'E':
            commit('setR1', false)
            break
        }
      }

      window.addEventListener('keydown', _keydownHandler)
      window.addEventListener('keyup', _keyupHandler)
    },

    stopJoystick({ commit, state }) {
      if (_intervalHandle) {
        clearInterval(_intervalHandle)
        _intervalHandle = null
      }

      if (_keydownHandler) {
        window.removeEventListener('keydown', _keydownHandler)
        _keydownHandler = null
      }

      if (_keyupHandler) {
        window.removeEventListener('keyup', _keyupHandler)
        _keyupHandler = null
      }

      _pressedKeys.clear()
      commit('setListening', false)
    },

    listenToInputs({ state, commit }) {
      if (state.isListening) return
      commit('setListening', true)

      _intervalHandle = setInterval(() => {
        const gamepads = navigator.getGamepads()
        if (!gamepads) return

        const gp = gamepads[0]
        if (!gp) return

        const upPressed = gp.buttons[12]?.pressed || gp.axes[1] < -0.5
        const downPressed = gp.buttons[13]?.pressed || gp.axes[1] > 0.5
        const leftPressed = gp.buttons[14]?.pressed || gp.axes[0] < -0.5
        const rightPressed = gp.buttons[15]?.pressed || gp.axes[0] > 0.5

        commit('setUp', upPressed)
        commit('setDown', downPressed)
        commit('setLeft', leftPressed)
        commit('setRight', rightPressed)

        commit('setA', gp.buttons[0]?.pressed || false)
        commit('setB', gp.buttons[1]?.pressed || false)
        commit('setX', gp.buttons[2]?.pressed || false)
        commit('setY', gp.buttons[3]?.pressed || false)

        commit('setL1', gp.buttons[4]?.pressed || false)
        commit('setR1', gp.buttons[5]?.pressed || false)
        commit('setL2', gp.buttons[6]?.pressed || false)
        commit('setR2', gp.buttons[7]?.pressed || false)

        commit('setL3', gp.buttons[10]?.pressed || false)
        commit('setR3', gp.buttons[11]?.pressed || false)

        commit('setShare', gp.buttons[8]?.pressed || false)
        commit('setOptions', gp.buttons[9]?.pressed || false)
      }, 50)
    },
  },
}

export default joystickStore
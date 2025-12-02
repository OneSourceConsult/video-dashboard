<template>
  <v-app>
    <v-main class="main-content">
      <Login v-if="!isAuthenticated" />
      <VideoDashboard v-else />
    </v-main>
  </v-app>
</template>

<script>
import { computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import Login from './views/Login.vue'
import VideoDashboard from './views/VideoDashboard.vue'

export default {
  name: 'App',
  components: { Login, VideoDashboard },
  setup() {
    const store = useStore()
    const isAuthenticated = computed(() => store.getters['auth/isAuthenticated'])

    onMounted(() => {
      // Only connect MQTT if authenticated
      if (isAuthenticated.value) {
        store.dispatch('mqtt/connect')
      }
    })

    return { isAuthenticated }
  }
}
</script>

<style scoped>
.main-content {
  flex: 1 1 auto;
  display: flex;
  justify-content: stretch;
  align-items: stretch;
  height: 100%;
  overflow: hidden;
}
</style>

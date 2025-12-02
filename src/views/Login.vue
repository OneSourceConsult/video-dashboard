<template>
    <v-container class="fill-height d-flex align-center justify-center">
        <v-card width="400" class="pa-6" style="background-color: #1f4b6b;" dark elevation="10">
            <v-card-title class="d-flex flex-column align-center">
                <img src="@/assets/logo_white_2.png" alt="" :width="$vuetify.display.xsOnly ? 90 : 147"
                    :height="$vuetify.display.xsOnly ? 20 : 30"
                    style="max-width: 100%; height: auto; margin-right: 32px;" />
            </v-card-title>
            <v-card-text>
                <v-form @submit.prevent="handleLogin" class="white--text">
                    <v-text-field v-model="username" placeholder="Username" :input-style="{ color: '#FFF' }" outlined
                        dense required color="white" class="white--text">
                        <template #label>
                            <span class="white--text">Username</span>
                        </template>
                    </v-text-field>

                    <v-text-field v-model="password" type="password" placeholder="Password"
                        :input-style="{ color: '#FFF' }" outlined dense required color="white" class="white--text">
                        <template #label>
                            <span class="white--text">Password</span>
                        </template>
                    </v-text-field>

                    <v-btn :loading="loading" type="submit" color="white" outlined block class="mt-4">
                        Login
                    </v-btn>

                    <v-alert v-if="error" type="error" class="mt-3" dense text>
                        {{ error }}
                    </v-alert>
                </v-form>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script>
import { ref } from 'vue'
import { useStore } from 'vuex'

export default {
    name: 'LoginView',
    setup() {
        const store = useStore()
        const username = ref('')
        const password = ref('')
        const error = ref('')
        const loading = ref(false)

        const handleLogin = async () => {
            error.value = ''
            loading.value = true
            try {
                await store.dispatch('auth/login', { username: username.value, password: password.value })
            } catch (err) {
                error.value = 'Invalid username or password'
            } finally {
                loading.value = false
            }
        }

        return { username, password, error, loading, handleLogin }
    }
}
</script>
<style scoped>
.white--text{
    color: #FFFFFF !important;
}
</style>

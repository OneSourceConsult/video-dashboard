import "@/assets/styles.css";
import { createApp } from "vue";
import App from "./App.vue";
import { store } from "@/store";
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';

const vuetify = createVuetify({
    components,
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi,
        }
    },
    directives,
});

const app = createApp(App);
app.use(store);
app.use(vuetify);

app.mount("#app");
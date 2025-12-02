const STORAGE_KEY = 'auth';

const STATIC_USER = {
    username: 'ipv',
    password: '5geventos'
};

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { user: null, token: null, isAuthenticated: false };
        const parsed = JSON.parse(raw);
        return {
            user: parsed.user || null,
            token: parsed.token || null,
            isAuthenticated: !!parsed.token
        };
    } catch (e) {
        return { user: null, token: null, isAuthenticated: false };
    }
}

function saveToStorage(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user: state.user,
        token: state.token
    }));
}

const initial = loadFromStorage();

export default {
    namespaced: true,
    state: {
        user: initial.user,
        token: initial.token,
        isAuthenticated: initial.isAuthenticated
    },
    getters: {
        isAuthenticated: s => s.isAuthenticated,
        user: s => s.user,
        token: s => s.token
    },
    mutations: {
        SET_AUTH(state, { user, token }) {
            state.user = user;
            state.token = token;
            state.isAuthenticated = true;
            saveToStorage(state);
        },
        CLEAR_AUTH(state) {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            localStorage.removeItem(STORAGE_KEY);
        }
    },
    actions: {
        login({ commit }, { username, password }) {
            return new Promise((resolve, reject) => {
                // simple static check
                if (username === STATIC_USER.username && password === STATIC_USER.password) {
                    // create a simple token (not secure; for dev/static use only)
                    const token = btoa(`${username}:${Date.now()}`);
                    const user = { username };
                    commit('SET_AUTH', { user, token });
                    return resolve({ user, token });
                }
                return reject(new Error('Invalid credentials'));
            });
        },
        logout({ commit }) {
            commit('CLEAR_AUTH');
        }
    }
};
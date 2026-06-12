// Set up Supabase Client
const SUPABASE_URL = 'https://loovtbdzjgpqamhssnue.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvb3Z0YmR6amdwcWFtaHNzbnVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDI3MTcsImV4cCI6MjA5MDc3ODcxN30.StgTqDRbsasnEq7gfnkF4P1bZTaV8pf3BmPIhUPFI4Q';
// Ensure Supabase JS CDN is loaded in HTML before app.js
let supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Local Query Builder Helper for Local Fallback Mode
const makeLocalQueryBuilder = (table, userId) => {
    let selectFields = '*';
    let eqFilters = {};
    let orderField = null;
    let orderAscending = true;
    let inFilters = {};
    let isSingle = false;
    let operation = 'select'; // 'select', 'insert', 'update', 'delete', 'upsert'
    let opPayload = null;

    const builder = {
        select(fields) {
            selectFields = fields;
            return this;
        },
        eq(field, value) {
            eqFilters[field] = value;
            return this;
        },
        order(field, options = {}) {
            orderField = field;
            orderAscending = options.ascending !== false;
            return this;
        },
        in(field, values) {
            inFilters[field] = values;
            return this;
        },
        single() {
            isSingle = true;
            return this;
        },
        insert(payload) {
            operation = 'insert';
            opPayload = payload;
            return this;
        },
        update(payload) {
            operation = 'update';
            opPayload = payload;
            return this;
        },
        delete() {
            operation = 'delete';
            return this;
        },
        upsert(payload) {
            operation = 'upsert';
            opPayload = payload;
            return this;
        },
        async then(onfulfilled) {
            try {
                const result = await executeLocalQuery(table, userId, {
                    operation,
                    opPayload,
                    eqFilters,
                    inFilters,
                    orderField,
                    orderAscending,
                    isSingle
                });
                return onfulfilled(result);
            } catch (err) {
                return onfulfilled({ data: null, error: err });
            }
        }
    };
    return builder;
};

// Execute Local Operations on localStorage Mock Data
async function executeLocalQuery(table, userId, query) {
    if (table === 'profiles') {
        const localUsers = JSON.parse(localStorage.getItem('local_users') || '[]');
        const targetUserId = query.eqFilters.id || userId;
        const matchedUser = localUsers.find(u => u.id === targetUserId);

        if (query.operation === 'select') {
            if (!matchedUser) {
                return { data: null, error: { message: 'Profile not found' } };
            }
            const data = {
                id: matchedUser.id,
                full_name: matchedUser.user_metadata.full_name || 'Local User',
                username: matchedUser.user_metadata.username || 'localuser',
                email: matchedUser.email,
                avatar_url: matchedUser.user_metadata.avatar_url || ''
            };
            return { data: query.isSingle ? data : [data], error: null };
        } else if (query.operation === 'update') {
            if (matchedUser) {
                matchedUser.user_metadata = {
                    ...matchedUser.user_metadata,
                    ...query.opPayload
                };
                localStorage.setItem('local_users', JSON.stringify(localUsers));
                // Update local session
                const localSession = JSON.parse(localStorage.getItem('local_session') || '{}');
                if (localSession.user && localSession.user.id === matchedUser.id) {
                    localSession.user.user_metadata = matchedUser.user_metadata;
                    localStorage.setItem('local_session', JSON.stringify(localSession));
                }
            }
            return { data: query.opPayload, error: null };
        }
    }

    if (table === 'user_habits') {
        const habitsKey = `local_habits_${userId}`;
        let habits = JSON.parse(localStorage.getItem(habitsKey) || '[]');

        if (query.operation === 'select') {
            habits.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
            return { data: habits, error: null };
        } else if (query.operation === 'insert') {
            const payloads = Array.isArray(query.opPayload) ? query.opPayload : [query.opPayload];
            const inserted = [];
            payloads.forEach(p => {
                const newHabit = {
                    id: 'habit-' + Math.random().toString(36).substring(2, 15),
                    user_id: userId,
                    created_at: new Date().toISOString(),
                    ...p
                };
                habits.push(newHabit);
                inserted.push(newHabit);
            });
            localStorage.setItem(habitsKey, JSON.stringify(habits));
            return { data: query.isSingle ? inserted[0] : inserted, error: null };
        } else if (query.operation === 'update') {
            const targetHabitId = query.eqFilters.id;
            habits = habits.map(h => {
                if (h.id === targetHabitId) {
                    return { ...h, ...query.opPayload, updated_at: new Date().toISOString() };
                }
                return h;
            });
            localStorage.setItem(habitsKey, JSON.stringify(habits));
            return { data: query.opPayload, error: null };
        } else if (query.operation === 'delete') {
            const targetIds = query.inFilters.id || [];
            habits = habits.filter(h => !targetIds.includes(h.id));
            localStorage.setItem(habitsKey, JSON.stringify(habits));
            return { data: null, error: null };
        }
    }

    if (table === 'habit_logs') {
        const logsKey = `local_logs_${userId}`;
        let logs = JSON.parse(localStorage.getItem(logsKey) || '[]');

        if (query.operation === 'select') {
            return { data: logs, error: null };
        } else if (query.operation === 'upsert') {
            const payload = query.opPayload;
            const existingIdx = logs.findIndex(l => l.habit_id === payload.habit_id && l.log_date === payload.log_date);
            if (existingIdx !== -1) {
                logs[existingIdx] = { ...logs[existingIdx], ...payload, updated_at: new Date().toISOString() };
            } else {
                logs.push({
                    id: 'log-' + Math.random().toString(36).substring(2, 15),
                    created_at: new Date().toISOString(),
                    ...payload
                });
            }
            localStorage.setItem(logsKey, JSON.stringify(logs));
            return { data: payload, error: null };
        }
    }

    return { data: [], error: null };
}

// If Supabase failed to initialize, create a local mock client
if (!supabaseClient) {
    console.warn("Supabase client is null. Creating a mock local client.");
    supabaseClient = {
        auth: {
            async signUp(credentials) { return { data: { user: null, session: null }, error: { message: "Signups not allowed" } }; },
            async signInWithPassword(credentials) { return { data: { user: null, session: null }, error: { message: "Supabase not loaded" } }; },
            async getSession() { return { data: { session: null }, error: null }; },
            async getUser() { return { data: { user: null }, error: null }; },
            async signOut() { return { error: null }; },
            async updateUser() { return { data: { user: null }, error: null }; },
            onAuthStateChange() { return { data: { subscription: { unsubscribe: () => {} } } }; }
        },
        from(table) {
            const localSession = localStorage.getItem('local_session') ? JSON.parse(localStorage.getItem('local_session')) : null;
            const userId = localSession ? localSession.user.id : 'anonymous';
            return makeLocalQueryBuilder(table, userId);
        }
    };
}

// Setup global listener callback for local logins
let localAuthListenerCallback = null;

// Patch supabaseClient.auth to handle local fallback seamlessly
if (supabaseClient) {
    const originalSignUp = supabaseClient.auth.signUp.bind(supabaseClient.auth);
    const originalSignIn = supabaseClient.auth.signInWithPassword.bind(supabaseClient.auth);
    const originalGetSession = supabaseClient.auth.getSession.bind(supabaseClient.auth);
    const originalGetUser = supabaseClient.auth.getUser.bind(supabaseClient.auth);
    const originalSignOut = supabaseClient.auth.signOut.bind(supabaseClient.auth);
    const originalUpdateUser = supabaseClient.auth.updateUser.bind(supabaseClient.auth);

    const getLocalSession = () => {
        const sessionStr = localStorage.getItem('local_session');
        if (sessionStr) {
            try {
                return JSON.parse(sessionStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    };

    const getLocalUsers = () => {
        const usersStr = localStorage.getItem('local_users');
        if (usersStr) {
            try {
                return JSON.parse(usersStr);
            } catch (e) {
                return [];
            }
        }
        return [];
    };

    supabaseClient.auth.signUp = async (credentials) => {
        try {
            const res = await originalSignUp(credentials);
            if (res.error && (res.error.message.includes("Signups not allowed") || res.error.status === 403 || res.error.status === 400)) {
                console.warn("Supabase signup disabled/failed. Falling back to local signup.", res.error);
                
                const localUsers = getLocalUsers();
                const email = credentials.email.toLowerCase().trim();
                
                if (localUsers.some(u => u.email === email)) {
                    return {
                        data: { user: null, session: null },
                        error: { message: "This email is already registered. Please log in." }
                    };
                }
                
                const newUser = {
                    id: 'local-' + Math.random().toString(36).substring(2, 15),
                    email: email,
                    password: credentials.password,
                    user_metadata: credentials.options?.data || {}
                };
                
                localUsers.push(newUser);
                localStorage.setItem('local_users', JSON.stringify(localUsers));
                
                return {
                    data: {
                        user: {
                            id: newUser.id,
                            email: newUser.email,
                            user_metadata: newUser.user_metadata,
                            app_metadata: { provider: 'email' }
                        },
                        session: null
                    },
                    error: null
                };
            }
            return res;
        } catch (e) {
            return { data: { user: null, session: null }, error: e };
        }
    };

    supabaseClient.auth.signInWithPassword = async (credentials) => {
        try {
            const res = await originalSignIn(credentials);
            if (res.error) {
                const email = credentials.email.toLowerCase().trim();
                const password = credentials.password;
                const localUsers = getLocalUsers();
                const matchedUser = localUsers.find(u => u.email === email && u.password === password);
                
                if (matchedUser) {
                    const localSession = {
                        access_token: 'local-token-' + Math.random().toString(36).substring(2, 15),
                        user: {
                            id: matchedUser.id,
                            email: matchedUser.email,
                            user_metadata: matchedUser.user_metadata,
                            app_metadata: { provider: 'email' }
                        }
                    };
                    localStorage.setItem('local_session', JSON.stringify(localSession));
                    
                    if (localAuthListenerCallback) {
                        localAuthListenerCallback('SIGNED_IN', localSession);
                    }
                    
                    return { data: { user: localSession.user, session: localSession }, error: null };
                }
            }
            return res;
        } catch (e) {
            return { data: { user: null, session: null }, error: e };
        }
    };

    supabaseClient.auth.getSession = async () => {
        const localSession = getLocalSession();
        if (localSession) {
            return { data: { session: localSession }, error: null };
        }
        return originalGetSession();
    };

    supabaseClient.auth.getUser = async () => {
        const localSession = getLocalSession();
        if (localSession) {
            return { data: { user: localSession.user }, error: null };
        }
        return originalGetUser();
    };

    supabaseClient.auth.signOut = async () => {
        const localSession = getLocalSession();
        if (localSession) {
            localStorage.removeItem('local_session');
            if (localAuthListenerCallback) {
                localAuthListenerCallback('SIGNED_OUT', null);
            }
            return { error: null };
        }
        return originalSignOut();
    };

    supabaseClient.auth.updateUser = async (attributes) => {
        const localSession = getLocalSession();
        if (localSession) {
            if (attributes.data) {
                localSession.user.user_metadata = {
                    ...localSession.user.user_metadata,
                    ...attributes.data
                };
                localStorage.setItem('local_session', JSON.stringify(localSession));
                
                const localUsers = getLocalUsers();
                const userIdx = localUsers.findIndex(u => u.id === localSession.user.id);
                if (userIdx !== -1) {
                    localUsers[userIdx].user_metadata = localSession.user.user_metadata;
                    localStorage.setItem('local_users', JSON.stringify(localUsers));
                }
            }
            return { data: { user: localSession.user }, error: null };
        }
        return originalUpdateUser(attributes);
    };

    const originalOnAuthStateChange = supabaseClient.auth.onAuthStateChange.bind(supabaseClient.auth);
    supabaseClient.auth.onAuthStateChange = (callback) => {
        localAuthListenerCallback = callback;
        const localSession = getLocalSession();
        if (localSession) {
            setTimeout(() => callback('SIGNED_IN', localSession), 0);
            return {
                data: {
                    subscription: {
                        unsubscribe: () => { localAuthListenerCallback = null; }
                    }
                }
            };
        }
        return originalOnAuthStateChange(callback);
    };

    const originalFrom = supabaseClient.from.bind(supabaseClient);
    supabaseClient.from = (table) => {
        const localSession = getLocalSession();
        if (localSession) {
            return makeLocalQueryBuilder(table, localSession.user.id);
        }
        return originalFrom(table);
    };
}

// Assign to window for other scripts to access
window.supabaseClient = supabaseClient;

// Initialize theme
function initTheme() {
    // Default to light if not set
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Setup background gradient immediately
    setupBackgroundGradient(savedTheme);

    // Dispatch event for other scripts
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: savedTheme } }));
}

// Global dynamic background gradient setup setup
function setupBackgroundGradient(theme) {
    if (window.location.pathname.includes('admin_dashboard.html')) return;
    let container = document.querySelector('main.flex-1.overflow-y-auto') || document.querySelector('main');
    if (!container) {
        container = document.body;
        // make sure body is relative so absolute positioning works if it's the scroll container
        if(getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
    }
    
    // Check if it already exists
    let bgGradient = document.getElementById('theme-bg-gradient');
    if (!bgGradient) {
        bgGradient = document.createElement('div');
        bgGradient.id = 'theme-bg-gradient';
        bgGradient.className = 'absolute top-0 left-0 right-0 h-[400px] z-0 pointer-events-none transition-all duration-700';
        container.insertBefore(bgGradient, container.firstChild);
    } else {
        // Update classes if it exists (override legacy fixed inset-0)
        bgGradient.className = 'absolute top-0 left-0 right-0 h-[400px] z-0 pointer-events-none transition-all duration-700';
        if (bgGradient.parentElement !== container) {
            container.insertBefore(bgGradient, container.firstChild);
        }
    }
    
    updateGradientColor(theme || document.documentElement.getAttribute('data-theme') || 'green');
}

function updateGradientColor(theme) {
    const bgGradient = document.getElementById('theme-bg-gradient');
    if (bgGradient) {
         if (theme === 'dark') {
             bgGradient.style.background = 'linear-gradient(180deg, #064E3B 0%, #111827 50%, rgba(255,255,255,0) 100%)'; 
         } else if (theme === 'blue') {
             bgGradient.style.background = 'linear-gradient(180deg, #4480ba 0%, #acc9e6 50%, rgba(255,255,255,0) 100%)';
         } else {
             bgGradient.style.background = 'linear-gradient(180deg, #10B981 0%, #6ee7b7 50%, rgba(255,255,255,0) 100%)';
         }
    }
}

// Toggle theme between light and dark
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    let newTheme;
    
    if (currentTheme === 'light') {
        newTheme = 'dark';
    } else {
        newTheme = 'light';
    }
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateGradientColor(newTheme);
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
}

// Ripple effect for interactive elements
function createRipple(event) {
    const button = event.currentTarget;
    
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    
    // Get click coordinates relative to button
    const rect = button.getBoundingClientRect();
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');
    
    // Remove existing ripples
    const ripple = button.querySelector('.ripple');
    if (ripple) {
        ripple.remove();
    }
    
    button.appendChild(circle);
    
    // Clean up
    setTimeout(() => {
        circle.remove();
    }, 600);
}

// Check habit interaction
function toggleHabit(btn) {
    const isChecked = btn.querySelector('.visible') !== null;
    const icon = btn.querySelector('i');
    
    if (isChecked) {
        // Uncheck
        btn.classList.add('opacity-50');
        btn.classList.remove('bg-white', 'text-[var(--primary)]');
        icon.classList.remove('visible');
        icon.classList.add('invisible');
    } else {
        // Check
        btn.classList.remove('opacity-50');
        btn.classList.add('bg-white', 'text-[var(--primary)]');
        icon.classList.remove('invisible');
        icon.classList.add('visible');
        
        // Add popping animation
        btn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            btn.style.transform = 'scale(1)';
        }, 150);
    }
}

function initApp() {
    initTheme();
    renderDynamicDateSlider();
    
    // Add ripple effect for a satisfying click animation to all interactive elements
    const rippleButtons = document.querySelectorAll('.fab, .nav-item, .date-card, .check-btn, button, .account-btn, .cal-day');
    rippleButtons.forEach(btn => {
        // Ensure relative positioning
        if (getComputedStyle(btn).position === 'static') {
            btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
        }
        btn.addEventListener('mousedown', createRipple);
        // Also support touch
        btn.addEventListener('touchstart', (e) => {
            if(e.touches.length > 0) {
                // Mock a click event for the ripple
                const touch = e.touches[0];
                e.clientX = touch.clientX;
                e.clientY = touch.clientY;
                createRipple(e);
            }
        }, {passive: true});
    });
    
    // Setup check buttons
    const checkBtns = document.querySelectorAll('.check-btn');
    checkBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent ripple from firing twice if parent has it
            toggleHabit(btn);
        });
    });
    
    // Setup Supabase Auth Listener
    if (supabaseClient) {
        setupAuthListener();
    }
}

// initHeroSlider removed — Swiper.js handles the hero slider in index.html

// === Custom Toast Notification System ===
window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-safe pt-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-3 pointer-events-none w-full px-4 max-w-md';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const isError = type === 'error';
    
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const isDark = theme === 'dark';
    const iconClass = isError ? 'fa-circle-exclamation text-red-500' : 'fa-circle-check ' + (isDark ? 'text-[#34D399]' : (theme === 'blue' ? 'text-[#5BA4C9]' : 'text-[#10B981]'));
    
    toast.className = 'bg-white shadow-[0_8px_24px_-4px_rgba(0,0,0,0.15)] rounded-2xl px-5 py-3.5 flex items-start gap-3.5 transform -translate-y-12 opacity-0 transition-all duration-400 cubic-bezier(0.16, 1, 0.3, 1) pointer-events-auto border border-gray-100 w-full animate-slide-down';
    
    toast.innerHTML = `
        <div class="mt-0.5"><i class="fa-solid ${iconClass} text-xl shrink-0"></i></div>
        <p class="text-sm font-semibold text-gray-700 leading-snug flex-1">${message}</p>
        <button class="text-gray-400 hover:text-gray-600 transition-colors ml-1" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        if (!toast.isConnected) return;
        toast.style.transform = 'translateY(-12px) scale(0.95)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400); 
    }, 4000); 
};

// === Global Confirm Modal System ===
window.showConfirmModal = function(title, message, confirmText, confirmClass, onConfirm, cancelText = 'Cancel') {
    let modal = document.getElementById('global-confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'global-confirm-modal';
        modal.className = 'fixed inset-0 bg-gray-900/40 z-[110] flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300 px-6 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transform scale-95 transition-transform duration-300 popup-content" id="g-confirm-box">
                <div class="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-4 mx-auto" id="g-confirm-icon">
                    <i class="fa-solid fa-circle-question"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-900 text-center mb-2" id="g-confirm-title"></h3>
                <p class="text-gray-500 text-center text-sm mb-6" id="g-confirm-msg"></p>
                <div class="flex gap-3">
                    <button class="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors" id="g-confirm-cancel"></button>
                    <button class="flex-1 py-3.5 font-bold rounded-xl transition-colors text-white shadow-md focus:outline-none" id="g-confirm-btn"></button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('g-confirm-title').textContent = title;
    document.getElementById('g-confirm-msg').textContent = message;
    
    const iconContainer = document.getElementById('g-confirm-icon');
    const confirmBtn = document.getElementById('g-confirm-btn');
    const cancelBtn = document.getElementById('g-confirm-cancel');
    
    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `flex-1 py-3.5 font-bold rounded-xl transition-colors text-white shadow-md focus:outline-none ${confirmClass}`;
    
    if (confirmClass.includes('red')) {
        iconContainer.className = 'w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-2xl mb-4 mx-auto';
        iconContainer.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const isDark = theme === 'dark';
        let bgCls = isDark ? 'bg-gray-800 text-[#34D399]' : 'bg-green-50 text-[#10B981]';
        if (theme === 'blue') bgCls = 'bg-blue-50 text-[#5BA4C9]';
        iconContainer.className = `w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-4 mx-auto ${bgCls}`;
        iconContainer.innerHTML = '<i class="fa-solid fa-circle-question"></i>';
        
        if (!confirmClass.includes('bg-')) {
            confirmBtn.classList.add('theme-bg-update');
            confirmBtn.style.backgroundColor = theme === 'blue' ? '#5BA4C9' : '#10B981';
        }
    }
    
    modal.classList.remove('opacity-0', 'pointer-events-none');
    document.getElementById('g-confirm-box').classList.remove('scale-95');
    document.getElementById('g-confirm-box').classList.add('scale-100');
    
    const close = () => {
        modal.classList.add('opacity-0', 'pointer-events-none');
        document.getElementById('g-confirm-box').classList.remove('scale-100');
        document.getElementById('g-confirm-box').classList.add('scale-95');
    };
    
    cancelBtn.onclick = () => close();
    confirmBtn.onclick = () => {
        close();
        if (onConfirm) onConfirm();
    };
};

// Ensure initApp runs reliably whether script loads before or after DOM parse
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// --- Supabase Authentication Logic --- //

async function setupAuthListener() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    handleRouteProtection(session);

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            console.log('User signed in');
            handleRouteProtection(session);
        } else if (event === 'SIGNED_OUT') {
            console.log('User signed out');
            handleRouteProtection(null);
        }
    });
}

function handleRouteProtection(session) {
    const currentPath = window.location.pathname.toLowerCase();
    const isPublicRoute = currentPath.includes('login.html') || currentPath.includes('register.html') || currentPath.includes('forgot_password.html');
    const isAdminRoute = currentPath.includes('admin_dashboard.html');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (isAdminRoute) {
        if (!isAdmin) {
            window.location.href = 'login.html';
        }
        return;
    }

    if (!session && !isPublicRoute && !isAdmin) {
        // Not logged in and on protected page -> redirect to login
        window.location.href = 'login.html';
    } else if (session && isPublicRoute) {
        // Logged in but on login/register page -> redirect to index
        window.location.href = 'index.html';
    } else if (isAdmin && isPublicRoute) {
        // Admin logged in but on login page
        window.location.href = 'admin_dashboard.html';
    }
}

async function handleEmailLogin(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;

    // === Rate Limit Check ===
    if (typeof loginRateLimiter !== 'undefined') {
        const lockStatus = loginRateLimiter.isLocked();
        if (lockStatus.isLocked) {
            const warningEl = document.getElementById('rate-limit-warning');
            if (warningEl) {
                loginRateLimiter.startCountdown(warningEl, () => {
                    btn.disabled = false;
                    btn.innerText = originalText;
                });
            }
            showToast('Account temporarily locked. Wait for countdown to finish.', 'error');
            return;
        }
    }

    const emailRaw = document.getElementById('email').value;
    const passwordRaw = document.getElementById('password').value;

    // === Input Sanitization ===
    if (typeof sanitizeInput === 'function') {
        const emailCheck = sanitizeInput(emailRaw, 'Email');
        if (!emailCheck.isSafe) {
            showToast('Invalid input: ' + emailCheck.threats.join(', '), 'error');
            return;
        }

        // Validate email format
        if (typeof isValidEmail === 'function' && !isValidEmail(emailRaw.trim())) {
            showToast('Invalid email format.', 'error');
            return;
        }

        // Check password for obvious injection attempts (but allow special chars for passwords)
        const pwdThreatCheck = detectThreats(passwordRaw);
        if (!pwdThreatCheck.isSafe) {
            showToast('Password input contains suspicious characters.', 'error');
            return;
        }
    }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    const email = emailRaw.trim();
    const password = passwordRaw;

    // === Admin Bypass (Hash-based) ===
    if (typeof verifyAdminCredentials === 'function') {
        const isAdmin = await verifyAdminCredentials(email, password);
        if (isAdmin) {
            localStorage.setItem('isAdmin', 'true');
            if (typeof loginRateLimiter !== 'undefined') loginRateLimiter.reset();
            showToast('Admin login successful!');
            setTimeout(() => window.location.href = 'admin_dashboard.html', 500);
            return;
        }
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        // === Record failed attempt for rate limiting ===
        if (typeof loginRateLimiter !== 'undefined') {
            const result = loginRateLimiter.recordFailedAttempt();
            const warningEl = document.getElementById('rate-limit-warning');

            if (result.isLocked) {
                showToast('Too many failed attempts. Account locked for 30 seconds.', 'error');
                if (warningEl) {
                    loginRateLimiter.startCountdown(warningEl, () => {
                        btn.disabled = false;
                        btn.innerText = originalText;
                    });
                }
            } else {
                const warningMsg = loginRateLimiter.getWarningMessage();
                showToast("Login failed: " + error.message + (warningMsg ? '\n' + warningMsg : ''), 'error');
            }
        } else {
            showToast("Login failed: " + error.message, 'error');
        }

        btn.innerText = originalText;
        btn.disabled = false;
    } else {
        // Successful login — reset rate limiter
        if (typeof loginRateLimiter !== 'undefined') loginRateLimiter.reset();
    }
}

async function handleEmailRegister(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;

    const usernameRaw = document.getElementById('username').value;
    const nameRaw = document.getElementById('name').value;
    const emailRaw = document.getElementById('email').value;
    const passwordRaw = document.getElementById('password').value;
    const confirmPasswordEl = document.getElementById('confirm-password');
    const confirmPasswordRaw = confirmPasswordEl ? confirmPasswordEl.value : passwordRaw;

    // === Input Sanitization ===
    if (typeof sanitizeInput === 'function') {
        const usernameCheck = sanitizeInput(usernameRaw, 'Username');
        const nameCheck = sanitizeInput(nameRaw, 'Nama');
        const emailCheck = sanitizeInput(emailRaw, 'Email');

        const allThreats = [
            ...usernameCheck.threats,
            ...nameCheck.threats,
            ...emailCheck.threats
        ];

        if (allThreats.length > 0) {
            showToast('Invalid input: ' + allThreats.join(', '), 'error');
            return;
        }

        // Validate email format
        if (typeof isValidEmail === 'function' && !isValidEmail(emailRaw.trim())) {
            showToast('Invalid email format.', 'error');
            return;
        }
    }

    // === Password Strength Validation ===
    if (typeof validatePassword === 'function') {
        const pwdResult = validatePassword(passwordRaw);
        if (!pwdResult.isValid) {
            showToast('Password does not meet security requirements:\n• ' + pwdResult.errors.join('\n• '), 'error');
            return;
        }
    }

    // === Confirm Password Match ===
    if (passwordRaw !== confirmPasswordRaw) {
        showToast('Password and confirm password do not match!', 'error');
        return;
    }

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
    btn.disabled = true;

    const username = usernameRaw.trim();
    const name = nameRaw.trim();
    const email = emailRaw.trim();
    const password = passwordRaw;

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: name,
                username: username
            }
        }
    });

    if (error) {
        showToast("Registration failed: " + error.message, 'error');
        btn.innerText = originalText;
        btn.disabled = false;
    } else if (data.user && !data.session && !data.user.id.startsWith('local-')) {
        // Supabase returns user but no session when email already exists (repeated signup)
        // or when email confirmation is pending
        showToast("This email is already registered. Please log in or use 'Forgot Password'.", 'error');
        btn.innerText = originalText;
        btn.disabled = false;
        setTimeout(() => window.location.href = 'login.html', 2000);
    } else {
        // Successful registration — user is auto-confirmed or local fallback
        if (data.user && !data.user.id.startsWith('local-')) {
            try {
                await supabaseClient
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        full_name: name,
                        username: username,
                        email: email
                    }, { onConflict: 'id' });
            } catch (profileErr) {
                console.error('Profile save error:', profileErr);
            }
        }
        showToast('Account created successfully! Please log in.');
        btn.innerText = originalText;
        btn.disabled = false;
        window.location.href = 'login.html';
    }
}

// Google OAuth removed — currently disabled in the UI

async function handleSignOut() {
    showConfirmModal(
        'Log Out', 
        'Are you sure you want to log out of your account?', 
        'Log Out', 
        'bg-red-500 hover:bg-red-600', 
        async () => {
            try {
                document.body.style.opacity = '0';
                document.body.style.transition = 'opacity 0.5s ease';
                localStorage.removeItem('isAdmin');
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout error:', error);
                document.body.style.opacity = '1';
                showToast("Failed to log out. Please try again.", "error");
            }
        }
    );
}

// Dynamic Date rendering for horizontal scroll
function renderDynamicDateSlider() {
    const monthContainer = document.getElementById('mobile-month-selector');
    const dateContainer = document.getElementById('mobile-date-selector');
    
    if (!monthContainer || !dateContainer) return;
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDate = today.getDate();
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Render Months
    let monthHtml = '';
    months.forEach((m, i) => {
        if (i === currentMonth) {
            monthHtml += `<button class="shrink-0 text-sm font-medium text-white bg-[var(--primary)] px-4 py-1.5 rounded-full whitespace-nowrap shadow-md focus:outline-none theme-bg-update" id="active-month-btn">${m}</button>`;
        } else {
            monthHtml += `<button class="shrink-0 text-sm font-medium text-gray-500 whitespace-nowrap focus:outline-none" onclick="changeSliderMonth(${i})">${m}</button>`;
        }
    });
    monthContainer.innerHTML = monthHtml;
    
    // Smooth scroll month container to active month
    setTimeout(() => {
        const activeMonthBtn = document.getElementById('active-month-btn');
        if (activeMonthBtn) {
            monthContainer.scrollTo({
                left: activeMonthBtn.offsetLeft - 24,
                behavior: 'smooth'
            });
        }
    }, 50);

    // Render Dates for current month
    renderDatesForMonth(currentYear, currentMonth, currentDate, true);
    
    // Listen for theme change to update the dynamic element colors
    document.addEventListener('themeChanged', (e) => {
        const currentTheme = e.detail.theme || document.documentElement.getAttribute('data-theme') || 'light';
        const pColor = currentTheme === 'blue' ? '#5BA4C9' : '#10B981';
        document.querySelectorAll('.theme-bg-update').forEach(el => {
            if(el.classList.contains('active')) {
                el.style.backgroundColor = pColor;
            }
        });
        const activeMonth = document.getElementById('active-month-btn');
        if (activeMonth) {
            activeMonth.style.backgroundColor = pColor;
        }
    });
}

function renderDatesForMonth(year, monthIndex, activeDateToSet = null, scroll = false) {
    const dateContainer = document.getElementById('mobile-date-selector');
    const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    let dateHtml = '';
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const primaryColor = theme === 'blue' ? '#5BA4C9' : '#10B981';
    
    let activeId = '';
    
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, monthIndex, i);
        const dayName = days[d.getDay()];
        const dateStr = d.toISOString().slice(0, 10);
        
        let isActive = '';
        let style = '';
        
        // Either set the specific active date, or default to the 1st if switching months
        if ((activeDateToSet && i === activeDateToSet) || (!activeDateToSet && i === 1)) {
            isActive = 'active theme-bg-update shadow-md text-white';
            style = `background-color: ${primaryColor}; transform: translateY(-2px);`;
            activeId = `slider-date-${i}`;
        } else {
            isActive = 'bg-white shadow-sm';
            style = `background-color: var(--card-bg);`;
        }
        
        dateHtml += `
            <button id="slider-date-${i}" class="date-card ${isActive} min-w-[60px] h-[75px] rounded-2xl flex flex-col items-center justify-center shrink-0 focus:outline-none" style="${style}" data-date="${dateStr}" onclick="selectSliderDate(this, ${i})">
                <span class="text-xl font-bold">${i}</span>
                <span class="text-xs font-medium mt-1">${dayName}</span>
            </button>
        `;
    }
    
    dateContainer.innerHTML = dateHtml;
    
    // Add ripple effect to new buttons
    const newCards = dateContainer.querySelectorAll('.date-card');
    newCards.forEach(btn => {
        if (getComputedStyle(btn).position === 'static') {
            btn.style.position = 'relative';
        }
        btn.style.overflow = 'visible';
        btn.addEventListener('mousedown', createRipple);
        btn.addEventListener('touchstart', (e) => {
            if(e.touches.length > 0) {
                const touch = e.touches[0];
                e.clientX = touch.clientX;
                e.clientY = touch.clientY;
                createRipple(e);
            }
        }, {passive: true});
    });
    
    if (scroll && activeId) {
        setTimeout(() => {
            const activeEl = document.getElementById(activeId);
            if(activeEl) {
                dateContainer.scrollTo({
                    left: activeEl.offsetLeft - 24,
                    behavior: 'smooth'
                });
            }
        }, 50);
    }
}

function changeSliderMonth(monthIndex) {
    const today = new Date();
    // Assuming current year for simplicity
    const currentYear = today.getFullYear();
    
    // If selecting current month, auto-select today, otherwise 1st
    const dateToSelect = (monthIndex === today.getMonth()) ? today.getDate() : 1;
    
    renderDatesForMonth(currentYear, monthIndex, dateToSelect, true);
    
    // Easy way to rebuild month slider
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthContainer = document.getElementById('mobile-month-selector');
    let monthHtml = '';
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const primaryColor = theme === 'blue' ? '#5BA4C9' : '#10B981';
    
    months.forEach((m, i) => {
        if (i === monthIndex) {
            monthHtml += `<button class="shrink-0 text-sm font-medium text-white px-4 py-1.5 rounded-full whitespace-nowrap shadow-md focus:outline-none theme-bg-update" id="active-month-btn" style="background-color: ${primaryColor}">${m}</button>`;
        } else {
            monthHtml += `<button class="shrink-0 text-sm font-medium text-gray-500 whitespace-nowrap focus:outline-none" onclick="changeSliderMonth(${i})">${m}</button>`;
        }
    });
    monthContainer.innerHTML = monthHtml;
    
    setTimeout(() => {
        const activeMonthBtn = document.getElementById('active-month-btn');
        if (activeMonthBtn) {
            monthContainer.scrollTo({
                left: activeMonthBtn.offsetLeft - 24,
                behavior: 'smooth'
            });
        }
    }, 50);

    // Let the current page know the month slider rebuilt the dates
    document.dispatchEvent(new CustomEvent('monthChanged'));
}

function selectSliderDate(el, dateNum) {
    const container = document.getElementById('mobile-date-selector');
    const cards = container.querySelectorAll('.date-card');
    
    // Reset all
    cards.forEach(card => {
        card.classList.remove('active', 'theme-bg-update', 'shadow-md', 'text-white');
        card.classList.add('bg-white', 'shadow-sm');
        card.style.backgroundColor = 'var(--card-bg)';
        card.style.transform = 'none';
        card.style.color = 'var(--text-main)';
    });
    
    // Set active
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const primaryColor = theme === 'blue' ? '#5BA4C9' : '#10B981';
    
    el.classList.add('active', 'theme-bg-update', 'shadow-md', 'text-white');
    el.classList.remove('bg-white', 'shadow-sm');
    el.style.backgroundColor = primaryColor;
    el.style.transform = 'translateY(-2px)';
    el.style.color = 'white';
}

function openAddModal() {
    window.location.href = 'add_habit.html';
}

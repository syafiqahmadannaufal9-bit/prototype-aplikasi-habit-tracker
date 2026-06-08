// =============================================
// NOTIFICATION SYSTEM MODULE
// =============================================

// --- Default Settings ---
const NOTIF_STORAGE_KEY = 'notificationSettings';
const NOTIF_DEFAULTS = {
    enabled: false,
    time: '08:00',
    selectedHabits: [], // empty = all (will be populated on first enable)
    lastNotifiedDate: ''
};

// --- Get / Save Settings ---
function getNotificationSettings() {
    try {
        const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.error('Error reading notification settings:', e);
    }
    return { ...NOTIF_DEFAULTS };
}

function saveNotificationSettings(settings) {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(settings));
}

// --- Browser Notification Permission ---
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('Browser does not support notifications');
        return 'denied';
    }
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    
    const permission = await Notification.requestPermission();
    return permission;
}

// --- Send Browser Native Notification ---
function sendBrowserNotification(title, body, icon) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    
    try {
        const notif = new Notification(title, {
            body: body,
            icon: icon || '../assets/icon-192.png',
            badge: '../assets/icon-192.png',
            tag: 'habit-reminder-' + new Date().toISOString().slice(0, 10),
            renotify: true,
            requireInteraction: true
        });
        
        notif.onclick = function() {
            window.focus();
            notif.close();
        };
        
        // Auto close after 15 seconds
        setTimeout(() => notif.close(), 15000);
    } catch (e) {
        console.error('Error sending browser notification:', e);
    }
}

// --- In-App Notification Popup ---
function showNotificationPopup(incompleteHabits, quote = "Don't forget to complete them today") {
    // Remove existing popup if any
    const existing = document.getElementById('notif-reminder-popup');
    if (existing) existing.remove();
    
    const habitListHtml = incompleteHabits.map(h => 
        `<div class="flex items-center gap-2 py-1.5">
            <div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm shrink-0">${h.iconHtml || '<i class="fa-solid fa-star"></i>'}</div>
            <span class="text-sm font-medium text-white/95 truncate">${h.name}</span>
        </div>`
    ).join('');
    
    const popup = document.createElement('div');
    popup.id = 'notif-reminder-popup';
    popup.className = 'fixed inset-0 z-[200] flex items-center justify-center px-6';
    popup.innerHTML = `
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="closeNotificationPopup()"></div>
        
        <!-- Card -->
        <div class="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl transform scale-95 opacity-0 transition-all duration-500 ease-out" id="notif-popup-card" style="animation: notifPopIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
            <!-- Gradient Header -->
            <div class="p-6 pb-4" style="background: linear-gradient(135deg, var(--primary) 0%, var(--accent, var(--primary)) 100%);">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <i class="fa-solid fa-bell text-white text-xl animate-bounce"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white">Habit Time! ⏰</h3>
                        <p class="text-xs text-white/80 font-medium">${quote}</p>
                    </div>
                </div>
                
                <!-- Habit List -->
                <div class="mt-2 space-y-0.5 max-h-[200px] overflow-y-auto no-scrollbar pr-1">
                    ${habitListHtml}
                </div>
            </div>
            
            <!-- Footer -->
            <div class="bg-white p-4 flex gap-3">
                <button onclick="closeNotificationPopup()" class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">
                    Later
                </button>
                <button onclick="closeNotificationPopup(); window.scrollTo({top: document.getElementById('habit-list')?.offsetTop - 100, behavior: 'smooth'});" class="flex-1 py-3 text-white font-bold rounded-xl transition-colors text-sm shadow-md" style="background-color: var(--primary);">
                    Do It Now
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Add animation keyframes if not exists
    if (!document.getElementById('notif-popup-styles')) {
        const style = document.createElement('style');
        style.id = 'notif-popup-styles';
        style.textContent = `
            @keyframes notifPopIn {
                0% { transform: scale(0.8) translateY(20px); opacity: 0; }
                100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            @keyframes notifPopOut {
                0% { transform: scale(1) translateY(0); opacity: 1; }
                100% { transform: scale(0.8) translateY(20px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

window.closeNotificationPopup = function() {
    const popup = document.getElementById('notif-reminder-popup');
    if (!popup) return;
    
    const card = document.getElementById('notif-popup-card');
    if (card) {
        card.style.animation = 'notifPopOut 0.3s ease-in forwards';
    }
    const backdrop = popup.querySelector('.absolute');
    if (backdrop) backdrop.style.opacity = '0';
    
    setTimeout(() => popup.remove(), 350);
};

// --- Core: Check & Fire Notifications ---
function checkAndFireNotifications() {
    const settings = getNotificationSettings();
    if (!settings.enabled) return;
    
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    // Already notified today?
    if (settings.lastNotifiedDate === todayStr) return;
    
    // Is it past the scheduled time?
    if (currentTimeStr < settings.time) return;
    
    // Get habits and check which are incomplete
    if (typeof getHabits !== 'function') return;
    const allHabits = getHabits();
    if (allHabits.length === 0) return;
    
    // Filter to only selected habits
    let habitsToCheck = allHabits;
    if (settings.selectedHabits && settings.selectedHabits.length > 0) {
        habitsToCheck = allHabits.filter(h => settings.selectedHabits.includes(h.id));
    }
    
    // Check which ones are NOT completed today
    const incompleteHabits = habitsToCheck.filter(h => {
        if (typeof isHabitCompleted === 'function') {
            return !isHabitCompleted(h.id, todayStr);
        }
        return true;
    });
    
    if (incompleteHabits.length === 0) {
        // All done! Mark as notified so we don't check again
        settings.lastNotifiedDate = todayStr;
        saveNotificationSettings(settings);
        return;
    }
    
    // Mark as notified for today
    settings.lastNotifiedDate = todayStr;
    saveNotificationSettings(settings);
    
    // Generate random motivational quote (shuffle without replacement)
    const quotes = [
        "Small steps every day lead to big results! 🌟",
        "Don't break the chain! You can do this. 💪",
        "A little progress each day adds up to big results. 🚀",
        "Consistency is key. Time to crush your habits! 🔥",
        "Your future self will thank you for doing this today. ✨",
        "It's time to invest in yourself! 💎",
        "Almost there! Just a few more habits to complete today. 🎯",
        "Stay on track! Your goals are within reach. 🏆",
        "Make today count. Finish your habits! ⚡",
        "You're doing great! Keep the momentum going. 🌊"
    ];
    
    let quotesPool = JSON.parse(localStorage.getItem('notifQuotesPool') || '[]');
    if (quotesPool.length === 0) {
        // Refill the pool with all indices
        quotesPool = quotes.map((_, i) => i);
    }
    
    // Pick a random index from the pool
    const randomPoolIndex = Math.floor(Math.random() * quotesPool.length);
    const selectedQuoteIndex = quotesPool[randomPoolIndex];
    
    // Remove the selected index from the pool and save
    quotesPool.splice(randomPoolIndex, 1);
    localStorage.setItem('notifQuotesPool', JSON.stringify(quotesPool));
    
    const randomQuote = quotes[selectedQuoteIndex];
    
    // Build message
    const habitNames = incompleteHabits.map(h => h.name).join(', ');
    const bodyText = `${randomQuote}\n\nYou haven't completed: ${habitNames}`;
    
    // 1. Send browser native notification
    sendBrowserNotification('⏰ Habit Time!', bodyText);
    
    // 2. Show in-app popup
    showNotificationPopup(incompleteHabits, randomQuote);
}

// --- On-Entry Check (when user opens the app / page loads) ---
function checkNotificationsOnEntry() {
    const settings = getNotificationSettings();
    if (!settings.enabled) return;
    
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    // If already notified today, skip
    if (settings.lastNotifiedDate === todayStr) return;
    
    // If it's past the scheduled time, fire
    if (currentTimeStr >= settings.time) {
        // Slight delay to let the page render first
        setTimeout(() => checkAndFireNotifications(), 1500);
    }
}

// --- Periodic Checker (every 30 seconds) ---
let _notifCheckerInterval = null;
function startNotificationChecker() {
    if (_notifCheckerInterval) clearInterval(_notifCheckerInterval);
    _notifCheckerInterval = setInterval(() => {
        checkAndFireNotifications();
    }, 30000); // Check every 30 seconds
}

// --- Notification Settings Modal ---
function openNotificationModal() {
    let modal = document.getElementById('notification-settings-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notification-settings-modal';
        modal.className = 'fixed inset-0 bg-gray-900/40 z-[120] flex items-end justify-center opacity-0 pointer-events-none transition-opacity duration-300 backdrop-blur-sm';
        modal.innerHTML = `
            <div class="bg-white rounded-t-3xl p-6 w-full max-w-md shadow-2xl transform translate-y-full transition-transform duration-300 popup-content" id="notif-modal-box" onclick="event.stopPropagation()">
                <!-- Drag handle -->
                <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5 cursor-pointer" onclick="closeNotificationModal()"></div>
                
                <!-- Header -->
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-full flex items-center justify-center text-lg" style="background-color: rgba(var(--primary-rgb, 16, 185, 129), 0.1); color: var(--primary);">
                            <i class="fa-solid fa-bell"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-gray-900">Notification Settings</h3>
                            <p class="text-xs text-gray-500 font-medium">Set daily habit reminders</p>
                        </div>
                    </div>
                </div>
                
                <!-- Enable Toggle -->
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl mb-4 border border-gray-100">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-power-off text-gray-500"></i>
                        <div>
                            <span class="text-sm font-bold text-gray-900">Enable Notifications</span>
                            <p class="text-[10px] text-gray-400 font-medium mt-0.5">Allow daily habit reminders</p>
                        </div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="notif-toggle" class="sr-only peer" onchange="onNotifToggleChange()">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-[var(--primary)]"></div>
                    </label>
                </div>
                
                <!-- Time Picker -->
                <div id="notif-time-section" class="mb-4 opacity-50 pointer-events-none transition-opacity duration-300">
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div class="flex items-center gap-3">
                            <i class="fa-regular fa-clock text-gray-500"></i>
                            <div>
                                <span class="text-sm font-bold text-gray-900">Reminder Time</span>
                                <p class="text-[10px] text-gray-400 font-medium mt-0.5">What time to remind you</p>
                            </div>
                        </div>
                        <input type="time" id="notif-time-input" value="08:00" class="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-[var(--primary)] transition-colors cursor-pointer">
                    </div>
                </div>
                
                <!-- Habit Selection -->
                <div id="notif-habits-section" class="mb-5 opacity-50 pointer-events-none transition-opacity duration-300">
                    <div class="flex items-center justify-between mb-3 px-1">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-list-check text-gray-400 text-xs"></i>
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Habit</span>
                        </div>
                        <button onclick="toggleAllNotifHabits()" class="text-xs font-bold hover:underline transition-colors" style="color: var(--primary);" id="notif-select-all-btn">Deselect All</button>
                    </div>
                    <div class="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden max-h-[250px] overflow-y-auto no-scrollbar" id="notif-habit-list">
                        <!-- Dynamically populated -->
                    </div>
                </div>
                
                <!-- Permission Status -->
                <div id="notif-permission-status" class="mb-4 hidden">
                    <div class="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Browser notification permission denied. Enable it in browser settings to receive notifications outside the app.</span>
                    </div>
                </div>
                
                <!-- Save Button -->
                <button onclick="saveNotifSettingsFromModal()" class="w-full py-3.5 text-white font-bold rounded-xl transition-all text-sm shadow-md hover:-translate-y-0.5 active:translate-y-0" style="background-color: var(--primary);">
                    <i class="fa-solid fa-check mr-2"></i>Save Settings
                </button>
            </div>
        `;
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeNotificationModal();
        });
        
        document.body.appendChild(modal);
    }
    
    // Populate current settings
    const settings = getNotificationSettings();
    const toggle = document.getElementById('notif-toggle');
    const timeInput = document.getElementById('notif-time-input');
    
    if (toggle) toggle.checked = settings.enabled;
    if (timeInput) timeInput.value = settings.time || '08:00';
    
    // Update sections enabled state
    updateNotifSectionsState(settings.enabled);
    
    // Render habit checklist
    renderNotifHabitChecklist(settings);
    
    // Check permission status
    updatePermissionStatus();
    
    // Open modal with animation
    modal.classList.remove('opacity-0', 'pointer-events-none');
    const box = document.getElementById('notif-modal-box');
    if (box) {
        box.classList.remove('translate-y-full');
        box.classList.add('translate-y-0');
    }
}

window.openNotificationModal = openNotificationModal;

function closeNotificationModal() {
    const modal = document.getElementById('notification-settings-modal');
    if (!modal) return;
    
    modal.classList.add('opacity-0', 'pointer-events-none');
    const box = document.getElementById('notif-modal-box');
    if (box) {
        box.classList.remove('translate-y-0');
        box.classList.add('translate-y-full');
    }
}

window.closeNotificationModal = closeNotificationModal;

function updateNotifSectionsState(enabled) {
    const timeSection = document.getElementById('notif-time-section');
    const habitsSection = document.getElementById('notif-habits-section');
    
    if (timeSection) {
        timeSection.classList.toggle('opacity-50', !enabled);
        timeSection.classList.toggle('pointer-events-none', !enabled);
    }
    if (habitsSection) {
        habitsSection.classList.toggle('opacity-50', !enabled);
        habitsSection.classList.toggle('pointer-events-none', !enabled);
    }
}

async function onNotifToggleChange() {
    const toggle = document.getElementById('notif-toggle');
    const enabled = toggle ? toggle.checked : false;
    
    updateNotifSectionsState(enabled);
    
    // If enabling, request browser notification permission
    if (enabled) {
        const permission = await requestNotificationPermission();
        updatePermissionStatus();
        
        // If first time enabling and no habits selected yet, select all
        const settings = getNotificationSettings();
        if (!settings.selectedHabits || settings.selectedHabits.length === 0) {
            if (typeof getHabits === 'function') {
                const allHabits = getHabits();
                settings.selectedHabits = allHabits.map(h => h.id);
                settings.enabled = true;
                saveNotificationSettings(settings);
                renderNotifHabitChecklist(settings);
            }
        }
    }
}

window.onNotifToggleChange = onNotifToggleChange;

function updatePermissionStatus() {
    const statusEl = document.getElementById('notif-permission-status');
    if (!statusEl) return;
    
    if ('Notification' in window && Notification.permission === 'denied') {
        statusEl.classList.remove('hidden');
    } else {
        statusEl.classList.add('hidden');
    }
}

function renderNotifHabitChecklist(settings) {
    const listEl = document.getElementById('notif-habit-list');
    if (!listEl) return;
    
    if (typeof getHabits !== 'function') {
        listEl.innerHTML = '<div class="p-4 text-center text-sm text-gray-400">No habits yet</div>';
        return;
    }
    
    const habits = getHabits();
    if (habits.length === 0) {
        listEl.innerHTML = '<div class="p-4 text-center text-sm text-gray-400">No habits yet. Create a habit first.</div>';
        return;
    }
    
    const selectedIds = settings.selectedHabits || [];
    // If selectedHabits is empty and we're enabling, default to all selected
    const useAll = selectedIds.length === 0;
    
    let html = '';
    habits.forEach((habit, idx) => {
        const isChecked = useAll || selectedIds.includes(habit.id);
        const borderClass = idx < habits.length - 1 ? 'border-b border-gray-100' : '';
        
        html += `
            <label class="flex items-center gap-3 p-3.5 hover:bg-gray-100/50 transition-colors cursor-pointer ${borderClass}">
                <input type="checkbox" class="notif-habit-checkbox sr-only peer" value="${habit.id}" ${isChecked ? 'checked' : ''}>
                <div class="w-5 h-5 rounded-md border-2 border-gray-300 flex items-center justify-center shrink-0 peer-checked:bg-[var(--primary)] peer-checked:border-[var(--primary)] transition-all">
                    <i class="fa-solid fa-check text-white text-[10px] opacity-0 peer-checked:opacity-100 transition-opacity"></i>
                </div>
                <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm shrink-0" style="color: var(--primary);">
                    ${habit.iconHtml || '<i class="fa-solid fa-star"></i>'}
                </div>
                <div class="flex-1 min-w-0">
                    <span class="text-sm font-semibold text-gray-900 truncate block">${habit.name}</span>
                    ${habit.goals ? `<span class="text-[10px] text-gray-400 font-medium">${habit.goals}</span>` : ''}
                </div>
            </label>
        `;
    });
    
    listEl.innerHTML = html;
    
    // Fix: The peer-checked CSS for the checkmark icon needs a proper structure
    // Let's use JS to handle the visual state instead
    listEl.querySelectorAll('.notif-habit-checkbox').forEach(cb => {
        updateCheckboxVisual(cb);
        cb.addEventListener('change', () => updateCheckboxVisual(cb));
    });
    
    updateSelectAllBtnText();
}

function updateCheckboxVisual(checkbox) {
    const container = checkbox.closest('label');
    if (!container) return;
    const box = container.querySelector('.w-5.h-5');
    const icon = box ? box.querySelector('i') : null;
    
    if (checkbox.checked) {
        if (box) {
            box.style.backgroundColor = 'var(--primary)';
            box.style.borderColor = 'var(--primary)';
        }
        if (icon) icon.style.opacity = '1';
    } else {
        if (box) {
            box.style.backgroundColor = 'transparent';
            box.style.borderColor = '#D1D5DB';
        }
        if (icon) icon.style.opacity = '0';
    }
    
    updateSelectAllBtnText();
}

function updateSelectAllBtnText() {
    const btn = document.getElementById('notif-select-all-btn');
    if (!btn) return;
    const checkboxes = document.querySelectorAll('.notif-habit-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    btn.textContent = allChecked ? 'Deselect All' : 'Select All';
}

function toggleAllNotifHabits() {
    const checkboxes = document.querySelectorAll('.notif-habit-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        updateCheckboxVisual(cb);
    });
    
    updateSelectAllBtnText();
}

window.toggleAllNotifHabits = toggleAllNotifHabits;

function saveNotifSettingsFromModal() {
    const toggle = document.getElementById('notif-toggle');
    const timeInput = document.getElementById('notif-time-input');
    const checkboxes = document.querySelectorAll('.notif-habit-checkbox');
    
    const settings = getNotificationSettings();
    settings.enabled = toggle ? toggle.checked : false;
    settings.time = timeInput ? timeInput.value : '08:00';
    settings.selectedHabits = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    // Reset lastNotifiedDate if time changed so it can re-trigger today
    const oldSettings = getNotificationSettings();
    if (oldSettings.time !== settings.time) {
        settings.lastNotifiedDate = '';
    }
    
    saveNotificationSettings(settings);
    
    // Start/stop the checker
    if (settings.enabled) {
        startNotificationChecker();
    } else {
        if (_notifCheckerInterval) {
            clearInterval(_notifCheckerInterval);
            _notifCheckerInterval = null;
        }
    }
    
    closeNotificationModal();
    
    // Update bell icon indicator
    updateBellIndicator();
    
    if (typeof showToast === 'function') {
        showToast(settings.enabled ? 'Notifications enabled! 🔔' : 'Notifications disabled');
    }
}

window.saveNotifSettingsFromModal = saveNotifSettingsFromModal;

// --- Bell Indicator (small dot on bell icon if notifications are active) ---
function updateBellIndicator() {
    const bellBtn = document.getElementById('bell-notification-btn');
    if (!bellBtn) return;
    
    let dot = bellBtn.querySelector('.notif-active-dot');
    if (dot) dot.remove();
}

// --- Initialize on Page Load ---
function initNotificationSystem() {
    const settings = getNotificationSettings();
    
    // Update bell indicator
    updateBellIndicator();
    
    // Start checker if enabled
    if (settings.enabled) {
        startNotificationChecker();
        // Also check on entry (when user opens/refreshes the page)
        checkNotificationsOnEntry();
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Delay slightly to let habits load first
        setTimeout(initNotificationSystem, 2000);
    });
} else {
    setTimeout(initNotificationSystem, 2000);
}

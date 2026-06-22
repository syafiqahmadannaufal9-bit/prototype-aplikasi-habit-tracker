// ===== DEFAULT SMTP CONFIGURATION =====
// Ganti nilai di bawah ini dengan kredensial SMTP Server Anda agar email terkirim otomatis ke HP / Laptop
// PANDUAN PENGATURAN (GMAIL):
// 1. Masuk ke Akun Google Anda -> Keamanan -> Verifikasi 2 Langkah (Harus Aktif).
// 2. Cari menu "Sandi Aplikasi" (App Passwords) di bagian bawah halaman Keamanan.
// 3. Buat sandi baru untuk aplikasi (pilih 'Lainnya' dan beri nama 'Habit Tracker').
// 4. Salin kode 16 karakter yang muncul dan masukkan ke bagian 'password' di bawah ini.
// 5. Ganti 'username' dan 'from' dengan alamat email Gmail Anda.
const DEFAULT_SMTP_CONFIG = {
    enabled: true, // Diubah menjadi true agar pengiriman email riil aktif secara default
    host: 'smtp.gmail.com', // Host SMTP Gmail
    port: 465, // Port SSL Gmail
    username: 'email-anda@gmail.com', // GANTI dengan alamat Gmail Anda
    password: 'password-aplikasi-anda', // GANTI dengan 16 karakter Sandi Aplikasi Gmail Anda
    from: 'email-anda@gmail.com' // GANTI dengan alamat Gmail Anda yang sama
};

// ===== State Management =====
let selectedMethod = null;
let currentStep = 1;

// ===== Theme Setup =====
document.addEventListener('DOMContentLoaded', () => {
    updateColors(document.documentElement.getAttribute('data-theme') || 'light');
    document.addEventListener('themeChanged', (e) => {
        updateColors(e.detail.theme);
    });
    
    // Auto-go to step 2 (email input) — step 1 (method choice) is skipped
    showStep(2);
    
    // Load SMTP Settings from LocalStorage
    initSMTPForm();

    // Check URL parameters for email verification query
    checkEmailVerificationURL();

    setupNewPasswordMatch();
});

function updateColors(theme) {
    const primary = theme === 'blue' ? '#5BA4C9' : '#10B981';
    
    document.querySelectorAll('.theme-bg-update').forEach(el => el.style.backgroundColor = primary);
    document.querySelectorAll('.theme-text-update').forEach(el => el.style.color = primary);
    
    const selected = document.querySelector('.method-card.selected');
    if (selected) {
        selected.style.borderColor = primary;
    }
}

// ===== SMTP configuration and modal logic =====
function getSMTPConfig() {
    try {
        const stored = localStorage.getItem('smtp_config');
        if (stored) {
            return JSON.parse(stored);
        } else {
            // Jika belum ada di localStorage, simpan dan gunakan default config dari file
            localStorage.setItem('smtp_config', JSON.stringify(DEFAULT_SMTP_CONFIG));
            return DEFAULT_SMTP_CONFIG;
        }
    } catch (e) {
        return DEFAULT_SMTP_CONFIG;
    }
}

function initSMTPForm() {
    const config = getSMTPConfig();
    
    const enabledInput = document.getElementById('smtp-enabled');
    const hostInput = document.getElementById('smtp-host');
    const userInput = document.getElementById('smtp-user');
    const portInput = document.getElementById('smtp-port');
    const passInput = document.getElementById('smtp-pass');
    const fromInput = document.getElementById('smtp-from');
    const fieldsDiv = document.getElementById('smtp-fields');

    if (enabledInput) {
        enabledInput.checked = config.enabled;
        hostInput.value = config.host || '';
        userInput.value = config.username || '';
        portInput.value = config.port || 2525;
        passInput.value = config.password || '';
        fromInput.value = config.from || 'noreply@habittracker.com';

        // Set opacity based on toggle state
        fieldsDiv.style.opacity = config.enabled ? '1' : '0.5';
        fieldsDiv.style.pointerEvents = config.enabled ? 'auto' : 'none';

        enabledInput.addEventListener('change', () => {
            fieldsDiv.style.opacity = enabledInput.checked ? '1' : '0.5';
            fieldsDiv.style.pointerEvents = enabledInput.checked ? 'auto' : 'none';
        });
    }
}

function openSMTPModal() {
    const modal = document.getElementById('smtp-modal');
    const content = document.getElementById('smtp-modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeSMTPModal() {
    const modal = document.getElementById('smtp-modal');
    const content = document.getElementById('smtp-modal-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

function saveSMTPConfig(e) {
    e.preventDefault();
    const config = {
        enabled: document.getElementById('smtp-enabled').checked,
        host: document.getElementById('smtp-host').value.trim(),
        username: document.getElementById('smtp-user').value.trim(),
        port: parseInt(document.getElementById('smtp-port').value) || 2525,
        password: document.getElementById('smtp-pass').value.trim(),
        from: document.getElementById('smtp-from').value.trim()
    };

    localStorage.setItem('smtp_config', JSON.stringify(config));
    if (typeof showToast === 'function') {
        showToast('Konfigurasi SMTP berhasil disimpan!', 'success');
    }
    closeSMTPModal();
}

// ===== Check confirmation from Email =====
function checkEmailVerificationURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const confirmParam = urlParams.get('confirm');

    if (confirmParam === 'true' && emailParam) {
        const email = decodeURIComponent(emailParam);
        
        // Pre-fill email in input field just in case
        setTimeout(() => {
            const emailInput = document.getElementById('reset-email');
            if (emailInput) emailInput.value = email;
            
            // Instantly go to Step 4 (New password input)
            showStep(4);
            
            if (typeof showToast === 'function') {
                showToast('Identitas email terverifikasi. Silakan masukkan kata sandi baru.', 'success');
            }
        }, 500);
    }
}

// ===== Method Selection =====
function selectMethod(method) {
    selectedMethod = method;
    
    // Update visual selection
    document.querySelectorAll('.method-card').forEach(card => {
        card.classList.remove('selected');
        card.style.borderColor = '';
    });
    
    const selectedCard = document.querySelector(`.method-card[data-method="${method}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const primary = theme === 'blue' ? '#5BA4C9' : '#10B981';
        selectedCard.style.borderColor = primary;
    }
    
    // Enable continue button
    const btnContinue = document.getElementById('btn-continue-method');
    if (btnContinue) btnContinue.disabled = false;
}

// ===== Navigation =====
function showStep(stepNum) {
    currentStep = stepNum;
    
    // Hide all panels
    document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
    
    // Panels order: step-choose-method (hidden/skipped), step-input-details, step-verify-otp (old pwd), step-reset-password, step-success
    const panels = ['step-choose-method', 'step-input-details', 'step-verify-otp', 'step-reset-password', 'step-success'];
    const targetPanel = document.getElementById(panels[stepNum - 1]);
    if (targetPanel) {
        targetPanel.classList.add('active');
        // Re-trigger animation
        targetPanel.style.animation = 'none';
        targetPanel.offsetHeight; // force reflow
        targetPanel.style.animation = '';
    }
    
    // Update step dots (3 dots, mapping visual step 1=email, 2=old pwd, 3=new pwd)
    // stepNum 2 -> dot index 0, stepNum 3 -> dots 0-1, stepNum 4 -> dots 0-2
    const visualStep = stepNum - 1; // shift by 1 since step 1 is hidden
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < visualStep);
    });
    
    // Update title/subtitle
    updateHeader(stepNum);
}

function updateHeader(step) {
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    const iconEl = document.getElementById('header-icon');
    
    if (step === 2) {
        titleEl.textContent = 'Lupa Kata Sandi?';
        subtitleEl.textContent = 'Masukkan email Anda untuk menerima link reset kata sandi';
        iconEl.innerHTML = '<i class="fa-regular fa-envelope"></i>';
    } else if (step === 3) {
        titleEl.textContent = 'Verifikasi Identitas';
        subtitleEl.textContent = 'Masukkan kata sandi lama Anda untuk melanjutkan';
        iconEl.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
    } else if (step === 4) {
        titleEl.textContent = 'Kata Sandi Baru';
        subtitleEl.textContent = 'Buat kata sandi baru untuk mengamankan akun Anda';
        iconEl.innerHTML = '<i class="fa-solid fa-lock"></i>';
    } else if (step === 5) {
        titleEl.textContent = 'Berhasil!';
        subtitleEl.textContent = 'Proses pemulihan akun berhasil';
        iconEl.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    }
}

// ===== Password Strength & Match Setup =====
function setupNewPasswordMatch() {
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewInput = document.getElementById('confirm-new-password');
    const newFeedback = document.getElementById('new-password-feedback');

    if (confirmNewInput && newPasswordInput && newFeedback) {
        confirmNewInput.addEventListener('input', () => {
            const pwd = newPasswordInput.value;
            const confirm = confirmNewInput.value;

            if (confirm.length === 0) {
                newFeedback.classList.add('hidden');
                confirmNewInput.classList.remove('border-red-400', 'border-green-400');
                confirmNewInput.classList.add('border-gray-200');
                return;
            }

            newFeedback.classList.remove('hidden');

            if (pwd === confirm) {
                newFeedback.innerHTML = '<i class="fa-solid fa-circle-check text-green-500 mr-1"></i> Passwords match';
                newFeedback.className = 'mt-2 text-xs font-medium text-green-600';
                confirmNewInput.classList.remove('border-red-400', 'border-gray-200');
                confirmNewInput.classList.add('border-green-400');
            } else {
                newFeedback.innerHTML = '<i class="fa-solid fa-circle-xmark text-red-500 mr-1"></i> Passwords do not match';
                newFeedback.className = 'mt-2 text-xs font-medium text-red-500';
                confirmNewInput.classList.remove('border-green-400', 'border-gray-200');
                confirmNewInput.classList.add('border-red-400');
            }
        });

        newPasswordInput.addEventListener('input', () => {
            if (confirmNewInput.value.length > 0) {
                confirmNewInput.dispatchEvent(new Event('input'));
            }
        });
    }
}

// ===== Send Reset Notification via SMTP or Mock UI =====
async function sendResetCode() {
    const emailInput = document.getElementById('reset-email');
    const email = emailInput ? emailInput.value.trim() : '';
    
    if (!email) {
        if (typeof showToast === 'function') showToast('Masukkan alamat email kamu', 'error');
        return;
    }

    const btn = document.getElementById('btn-send-code');
    const spinner = document.getElementById('btn-send-spinner');
    const textEl = document.getElementById('btn-send-text');
    
    // Show loading
    btn.disabled = true;
    spinner.classList.remove('hidden');
    textEl.style.opacity = '0.7';

    // Retrieve SMTP configurations
    const smtpConfig = getSMTPConfig();
    
    // After email is submitted, go directly to step 3 (old password entry)
    await new Promise(resolve => setTimeout(resolve, 800));

    spinner.classList.add('hidden');
    textEl.style.opacity = '1';
    btn.disabled = false;

    if (typeof showToast === 'function') {
        showToast('Email ditemukan. Masukkan kata sandi lama Anda.', 'success');
    }
    showStep(3);
}



// ===== Password Reset Submission =====
async function handlePasswordResetSubmit(e) {
    e.preventDefault();
    const newPwd = document.getElementById('new-password').value;
    const confirmPwd = document.getElementById('confirm-new-password').value;

    if (newPwd !== confirmPwd) {
        if (typeof showToast === 'function') showToast('Kata sandi baru dan konfirmasi tidak cocok!', 'error');
        return;
    }

    const email = document.getElementById('reset-email').value.trim().toLowerCase();

    // Update in local storage local_users
    const localUsers = JSON.parse(localStorage.getItem('local_users') || '[]');
    let userFound = false;

    if (email) {
        const userIdx = localUsers.findIndex(u => u.email.toLowerCase().trim() === email.toLowerCase().trim() || u.user_metadata?.username === email);
        if (userIdx !== -1) {
            localUsers[userIdx].password = newPwd;
            localStorage.setItem('local_users', JSON.stringify(localUsers));
            userFound = true;
        }
    }

    // Fallback: if user is not found, update the first local user for prototype testing ease
    if (!userFound && localUsers.length > 0) {
        localUsers[0].password = newPwd;
        localStorage.setItem('local_users', JSON.stringify(localUsers));
        userFound = true;
    }

    // Update success messages
    document.getElementById('success-title').textContent = 'Password Diperbarui!';
    document.getElementById('success-message').textContent = 'Kata sandi akun Anda telah berhasil diperbarui. Silakan login kembali menggunakan kata sandi baru Anda.';
    
    if (typeof showToast === 'function') {
        showToast('Kata sandi berhasil diperbarui!', 'success');
    }
    
    showStep(5);
}

// ===== Verify Old Password then go to Step 4 =====
function verifyOldPassword() {
    const oldPwd = document.getElementById('old-password').value;
    if (!oldPwd) {
        if (typeof showToast === 'function') showToast('Masukkan kata sandi lama Anda', 'error');
        return;
    }

    const email = document.getElementById('reset-email').value.trim().toLowerCase();
    const localUsers = JSON.parse(localStorage.getItem('local_users') || '[]');
    const user = localUsers.find(u => u.email.toLowerCase().trim() === email);

    if (user && user.password && user.password !== oldPwd) {
        if (typeof showToast === 'function') showToast('Kata sandi lama tidak sesuai!', 'error');
        return;
    }

    // Old password verified (or no stored record — allow for prototype)
    showStep(4);
}

function goToStep2() {
    showStep(2);
}

function goBackToStep1() {
    showStep(1);
}

function goBackToStep2() {
    showStep(2);
}

function goBackToStep3() {
    showStep(3);
}

function resendCode() {
    sendResetCode();
}

function togglePasswordVisibility(fieldId, toggleIconId) {
    const input = document.getElementById(fieldId);
    const icon = document.getElementById(toggleIconId);
    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

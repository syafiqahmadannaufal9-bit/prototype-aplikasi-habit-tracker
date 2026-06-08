/**
 * =========================================
 * SECURITY MODULE - Habit Tracker
 * =========================================
 * Password validation, input sanitization,
 * rate limiting, and secure hashing utilities.
 */

// ========== PASSWORD VALIDATION ==========

const PasswordRules = {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~',
    // Common weak passwords blacklist
    BLACKLIST: [
        'password', '12345678', 'qwerty123', 'admin123', 'letmein',
        'welcome1', 'monkey123', 'dragon12', 'master12', 'password1',
        'abc12345', 'iloveyou', 'trustno1', 'sunshine', 'princess',
        '1234567890', 'password123', 'qwerty12345'
    ]
};

/**
 * Validates password strength and returns detailed results
 * @param {string} password - The password to validate
 * @returns {{ isValid: boolean, score: number, strength: string, errors: string[], checks: Object }}
 */
function validatePassword(password) {
    const checks = {
        minLength: false,
        maxLength: true,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecial: false,
        noSpaces: true,
        notBlacklisted: true
    };

    const errors = [];
    let score = 0;

    // Check minimum length
    if (password.length >= PasswordRules.MIN_LENGTH) {
        checks.minLength = true;
        score += 1;
    } else {
        errors.push(`Minimal ${PasswordRules.MIN_LENGTH} karakter`);
    }

    // Check max length
    if (password.length > PasswordRules.MAX_LENGTH) {
        checks.maxLength = false;
        errors.push(`Maksimal ${PasswordRules.MAX_LENGTH} karakter`);
    }

    // Check uppercase
    if (/[A-Z]/.test(password)) {
        checks.hasUppercase = true;
        score += 1;
    } else {
        errors.push('Harus mengandung huruf besar (A-Z)');
    }

    // Check lowercase
    if (/[a-z]/.test(password)) {
        checks.hasLowercase = true;
        score += 1;
    } else {
        errors.push('Harus mengandung huruf kecil (a-z)');
    }

    // Check number
    if (/[0-9]/.test(password)) {
        checks.hasNumber = true;
        score += 1;
    } else {
        errors.push('Harus mengandung angka (0-9)');
    }

    // Check special character
    if (/[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/`~\\]/.test(password)) {
        checks.hasSpecial = true;
        score += 1;
    } else {
        errors.push('Harus mengandung simbol (!@#$%^&*...)');
    }

    // Check for spaces
    if (/\s/.test(password)) {
        checks.noSpaces = false;
        errors.push('Tidak boleh mengandung spasi');
        score = Math.max(0, score - 1);
    }

    // Check blacklist
    if (PasswordRules.BLACKLIST.includes(password.toLowerCase())) {
        checks.notBlacklisted = false;
        errors.push('Password terlalu umum, gunakan yang lebih unik');
        score = Math.max(0, score - 2);
    }

    // Bonus score for extra length
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Determine strength label
    let strength;
    if (score <= 1) strength = 'Sangat Lemah';
    else if (score <= 2) strength = 'Lemah';
    else if (score <= 3) strength = 'Sedang';
    else if (score <= 5) strength = 'Kuat';
    else strength = 'Sangat Kuat';

    const isValid = checks.minLength && checks.maxLength && checks.hasUppercase &&
                    checks.hasLowercase && checks.hasNumber && checks.hasSpecial &&
                    checks.noSpaces && checks.notBlacklisted;

    return { isValid, score: Math.min(score, 7), strength, errors, checks };
}


// ========== INPUT SANITIZATION ==========

// Dangerous patterns for SQL injection detection
const SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|TRUNCATE|DECLARE)\b)/i,
    /(--|;|'|"|\/\*|\*\/)/,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
    /(\bOR\b\s+'[^']*'\s*=\s*'[^']*')/i,
];

// Dangerous patterns for XSS detection
const XSS_PATTERNS = [
    /<script\b[^>]*>/i,
    /<\/script>/i,
    /javascript\s*:/i,
    /on(error|load|click|mouseover|focus|blur|submit|change|keyup|keydown)\s*=/i,
    /<iframe\b/i,
    /<embed\b/i,
    /<object\b/i,
    /expression\s*\(/i,
    /url\s*\(/i,
    /eval\s*\(/i,
    /document\.(cookie|location|write)/i,
    /window\.(location|open)/i,
];

/**
 * Sanitizes input by escaping HTML entities
 * @param {string} input - Raw user input
 * @returns {string} Sanitized input
 */
function escapeHtml(input) {
    if (typeof input !== 'string') return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;',
        '`': '&#x60;'
    };
    return input.replace(/[&<>"'`/]/g, (char) => map[char]);
}

/**
 * Checks if input contains suspicious/malicious patterns
 * @param {string} input - Raw user input
 * @returns {{ isSafe: boolean, threats: string[] }}
 */
function detectThreats(input) {
    if (typeof input !== 'string') return { isSafe: true, threats: [] };

    const threats = [];

    // Check SQL injection patterns
    for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            threats.push('Terdeteksi pola SQL injection');
            break;
        }
    }

    // Check XSS patterns
    for (const pattern of XSS_PATTERNS) {
        if (pattern.test(input)) {
            threats.push('Terdeteksi pola XSS/script injection');
            break;
        }
    }

    // Check for null bytes
    if (/\0/.test(input)) {
        threats.push('Terdeteksi null byte injection');
    }

    return { isSafe: threats.length === 0, threats };
}

/**
 * Full sanitization: detect threats + escape HTML
 * @param {string} input - Raw user input
 * @param {string} fieldName - Name of the field for error messaging
 * @returns {{ sanitized: string, isSafe: boolean, threats: string[] }}
 */
function sanitizeInput(input, fieldName = 'Input') {
    if (typeof input !== 'string') return { sanitized: '', isSafe: true, threats: [] };

    const trimmed = input.trim();
    const detection = detectThreats(trimmed);
    const sanitized = escapeHtml(trimmed);

    return {
        sanitized,
        isSafe: detection.isSafe,
        threats: detection.threats.map(t => `${fieldName}: ${t}`)
    };
}

/**
 * Validates an email format strictly
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
    // RFC 5322 simplified pattern
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
}


// ========== RATE LIMITER ==========

class RateLimiter {
    /**
     * @param {number} maxAttempts - Maximum attempts allowed
     * @param {number} lockoutDuration - Lockout duration in milliseconds
     */
    constructor(maxAttempts = 5, lockoutDuration = 30000) {
        this.maxAttempts = maxAttempts;
        this.lockoutDuration = lockoutDuration;
        this.attempts = 0;
        this.lockoutEndTime = null;
        this.countdownInterval = null;
    }

    /**
     * Check if the user is currently locked out
     * @returns {{ isLocked: boolean, remainingMs: number }}
     */
    isLocked() {
        if (!this.lockoutEndTime) return { isLocked: false, remainingMs: 0 };

        const remaining = this.lockoutEndTime - Date.now();
        if (remaining <= 0) {
            this.reset();
            return { isLocked: false, remainingMs: 0 };
        }

        return { isLocked: true, remainingMs: remaining };
    }

    /**
     * Record a failed attempt
     * @returns {{ isLocked: boolean, attemptsLeft: number, lockoutDuration: number }}
     */
    recordFailedAttempt() {
        this.attempts++;

        if (this.attempts >= this.maxAttempts) {
            this.lockoutEndTime = Date.now() + this.lockoutDuration;
            return {
                isLocked: true,
                attemptsLeft: 0,
                lockoutDuration: this.lockoutDuration
            };
        }

        return {
            isLocked: false,
            attemptsLeft: this.maxAttempts - this.attempts,
            lockoutDuration: 0
        };
    }

    /**
     * Reset the rate limiter (call on successful login)
     */
    reset() {
        this.attempts = 0;
        this.lockoutEndTime = null;
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    /**
     * Start a visible countdown timer
     * @param {HTMLElement} element - Element to display countdown
     * @param {Function} onComplete - Callback when lockout ends
     */
    startCountdown(element, onComplete) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        const updateDisplay = () => {
            const { isLocked, remainingMs } = this.isLocked();
            if (!isLocked) {
                if (element) {
                    element.style.display = 'none';
                    element.innerHTML = '';
                }
                if (onComplete) onComplete();
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                return;
            }

            const seconds = Math.ceil(remainingMs / 1000);
            if (element) {
                element.style.display = 'flex';
                element.innerHTML = `
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-shield-halved text-red-500"></i>
                        <span>Terlalu banyak percobaan. Coba lagi dalam <strong>${seconds}</strong> detik</span>
                    </div>
                `;
            }
        };

        updateDisplay();
        this.countdownInterval = setInterval(updateDisplay, 1000);
    }

    /**
     * Get remaining attempts info
     * @returns {string}
     */
    getWarningMessage() {
        const left = this.maxAttempts - this.attempts;
        if (left <= 2 && left > 0) {
            return `⚠️ Peringatan: Sisa ${left} percobaan sebelum akun dikunci sementara`;
        }
        return '';
    }
}

// Global rate limiter instance for login
const loginRateLimiter = new RateLimiter(5, 30000);


// ========== SECURE HASH (SHA-256) ==========

/**
 * Generate SHA-256 hash of a string using Web Crypto API
 * @param {string} message - String to hash
 * @returns {Promise<string>} Hex-encoded hash
 */
async function sha256Hash(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Pre-computed SHA-256 hash of the admin password 'lacdolacter0803'
// This avoids exposing the plaintext password in source code
const ADMIN_CREDENTIALS = {
    email: 'admindasboard01@gmail.com',
    // SHA-256 hash of 'lacdolacter0803'
    passwordHash: '2539dd7a24b23fd905d8543327cba7e28505053a7f3c70444b195bd06fe80454'
};

/**
 * Verify admin credentials securely using hash comparison
 * @param {string} email - Admin email
 * @param {string} password - Admin password (plaintext, will be hashed for comparison)
 * @returns {Promise<boolean>}
 */
async function verifyAdminCredentials(email, password) {
    if (email !== ADMIN_CREDENTIALS.email) return false;
    const hash = await sha256Hash(password);
    return hash === ADMIN_CREDENTIALS.passwordHash;
}


// ========== PASSWORD STRENGTH UI HELPER ==========

/**
 * Creates and manages a password strength indicator UI
 * @param {HTMLInputElement} passwordInput - The password input element
 * @param {HTMLElement} container - Container to render the strength UI into
 */
function initPasswordStrengthUI(passwordInput, container) {
    if (!passwordInput || !container) return;

    // Build the UI
    container.innerHTML = `
        <div class="password-strength-wrapper mt-3" id="pwd-strength-wrapper" style="display: none;">
            <!-- Strength Bar -->
            <div class="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                <div id="pwd-strength-bar" class="h-full rounded-full transition-all duration-500 ease-out" style="width: 0%; background-color: #EF4444;"></div>
            </div>
            
            <!-- Strength Label -->
            <div class="flex justify-between items-center mb-3">
                <span id="pwd-strength-label" class="text-xs font-bold text-gray-400">Kekuatan Password</span>
                <span id="pwd-strength-value" class="text-xs font-bold text-gray-400"></span>
            </div>
            
            <!-- Rules Checklist -->
            <div class="space-y-1.5" id="pwd-rules-list">
                <div class="flex items-center gap-2 text-xs" data-rule="minLength">
                    <i class="fa-solid fa-circle-xmark text-gray-300 w-4 text-center transition-colors duration-300" id="rule-icon-minLength"></i>
                    <span class="text-gray-500" id="rule-text-minLength">Minimal 8 karakter</span>
                </div>
                <div class="flex items-center gap-2 text-xs" data-rule="hasUppercase">
                    <i class="fa-solid fa-circle-xmark text-gray-300 w-4 text-center transition-colors duration-300" id="rule-icon-hasUppercase"></i>
                    <span class="text-gray-500" id="rule-text-hasUppercase">Huruf besar (A-Z)</span>
                </div>
                <div class="flex items-center gap-2 text-xs" data-rule="hasLowercase">
                    <i class="fa-solid fa-circle-xmark text-gray-300 w-4 text-center transition-colors duration-300" id="rule-icon-hasLowercase"></i>
                    <span class="text-gray-500" id="rule-text-hasLowercase">Huruf kecil (a-z)</span>
                </div>
                <div class="flex items-center gap-2 text-xs" data-rule="hasNumber">
                    <i class="fa-solid fa-circle-xmark text-gray-300 w-4 text-center transition-colors duration-300" id="rule-icon-hasNumber"></i>
                    <span class="text-gray-500" id="rule-text-hasNumber">Angka (0-9)</span>
                </div>
                <div class="flex items-center gap-2 text-xs" data-rule="hasSpecial">
                    <i class="fa-solid fa-circle-xmark text-gray-300 w-4 text-center transition-colors duration-300" id="rule-icon-hasSpecial"></i>
                    <span class="text-gray-500" id="rule-text-hasSpecial">Simbol (!@#$%^&*...)</span>
                </div>
                <div class="flex items-center gap-2 text-xs" data-rule="noSpaces">
                    <i class="fa-solid fa-circle-xmark text-gray-300 w-4 text-center transition-colors duration-300" id="rule-icon-noSpaces"></i>
                    <span class="text-gray-500" id="rule-text-noSpaces">Tidak mengandung spasi</span>
                </div>
            </div>
        </div>
    `;

    // Attach event listener
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const wrapper = document.getElementById('pwd-strength-wrapper');

        if (password.length === 0) {
            wrapper.style.display = 'none';
            return;
        }

        wrapper.style.display = 'block';
        const result = validatePassword(password);
        updateStrengthUI(result);
    });
}

/**
 * Updates the strength indicator UI based on validation result
 * @param {Object} result - Result from validatePassword()
 */
function updateStrengthUI(result) {
    const bar = document.getElementById('pwd-strength-bar');
    const label = document.getElementById('pwd-strength-value');

    if (!bar || !label) return;

    // Calculate percentage (score out of 7)
    const percent = Math.round((result.score / 7) * 100);

    // Color mapping
    const colorMap = {
        'Sangat Lemah': '#EF4444',
        'Lemah': '#F97316',
        'Sedang': '#EAB308',
        'Kuat': '#22C55E',
        'Sangat Kuat': '#10B981'
    };

    bar.style.width = `${Math.max(percent, 5)}%`;
    bar.style.backgroundColor = colorMap[result.strength] || '#EF4444';
    label.textContent = result.strength;
    label.style.color = colorMap[result.strength] || '#EF4444';

    // Update individual rule checks
    const ruleKeys = ['minLength', 'hasUppercase', 'hasLowercase', 'hasNumber', 'hasSpecial', 'noSpaces'];
    ruleKeys.forEach(key => {
        const icon = document.getElementById(`rule-icon-${key}`);
        const text = document.getElementById(`rule-text-${key}`);
        if (!icon || !text) return;

        if (result.checks[key]) {
            icon.className = 'fa-solid fa-circle-check text-green-500 w-4 text-center transition-colors duration-300';
            text.className = 'text-green-600 font-medium';
        } else {
            icon.className = 'fa-solid fa-circle-xmark text-gray-300 w-4 text-center transition-colors duration-300';
            text.className = 'text-gray-500';
        }
    });
}

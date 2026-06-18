document.addEventListener('DOMContentLoaded', () => {
    updateColors(document.documentElement.getAttribute('data-theme') || 'green');
    
    document.addEventListener('themeChanged', (e) => {
        updateColors(e.detail.theme);
    });

    document.getElementById('register-form').addEventListener('submit', handleEmailRegister);

    // Initialize password strength indicator
    const passwordInput = document.getElementById('password');
    const strengthContainer = document.getElementById('password-strength-container');
    initPasswordStrengthUI(passwordInput, strengthContainer);

    // Confirm password match validation
    const confirmInput = document.getElementById('confirm-password');
    const feedback = document.getElementById('confirm-password-feedback');

    confirmInput.addEventListener('input', () => {
        const pwd = passwordInput.value;
        const confirm = confirmInput.value;

        if (confirm.length === 0) {
            feedback.classList.add('hidden');
            confirmInput.classList.remove('border-red-400', 'border-green-400');
            confirmInput.classList.add('border-gray-200');
            return;
        }

        feedback.classList.remove('hidden');

        if (pwd === confirm) {
            feedback.innerHTML = '<i class="fa-solid fa-circle-check text-green-500 mr-1"></i> Passwords match';
            feedback.className = 'mt-2 text-xs font-medium text-green-600';
            confirmInput.classList.remove('border-red-400', 'border-gray-200');
            confirmInput.classList.add('border-green-400');
        } else {
            feedback.innerHTML = '<i class="fa-solid fa-circle-xmark text-red-500 mr-1"></i> Passwords do not match';
            feedback.className = 'mt-2 text-xs font-medium text-red-500';
            confirmInput.classList.remove('border-green-400', 'border-gray-200');
            confirmInput.classList.add('border-red-400');
        }
    });

    // Also recheck when main password changes
    passwordInput.addEventListener('input', () => {
        if (confirmInput.value.length > 0) {
            confirmInput.dispatchEvent(new Event('input'));
        }
    });
});

function updateColors(theme) {
    const primary = theme === 'blue' ? '#5BA4C9' : '#10B981';
    
    document.querySelectorAll('.theme-bg-update').forEach(el => el.style.backgroundColor = primary);
    document.querySelectorAll('.theme-text-update').forEach(el => el.style.color = primary);
    
    document.querySelectorAll('.theme-focus-ring').forEach(el => {
        el.classList.remove('focus:ring-green-500', 'focus:ring-blue-500');
        el.classList.add(theme === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-green-500');
    });
}

function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
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

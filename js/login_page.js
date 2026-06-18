document.addEventListener('DOMContentLoaded', () => {
    // Apply initial theme dynamically to style attributes
    updateColors(document.documentElement.getAttribute('data-theme') || 'light');
    
    document.addEventListener('themeChanged', (e) => {
        updateColors(e.detail.theme);
    });

    document.getElementById('login-form').addEventListener('submit', handleEmailLogin);
});

function updateColors(theme) {
    const primary = '#10B981';
    const primaryLight = theme === 'dark' ? '#064E3B' : '#D1FAE5';
    
    document.querySelectorAll('.theme-bg-update').forEach(el => el.style.backgroundColor = primary);
    document.querySelectorAll('.theme-text-update').forEach(el => el.style.color = primary);
    document.querySelectorAll('.theme-bg-light').forEach(el => el.style.backgroundColor = primaryLight);
    
    // For focus ring (tailwind)
    document.querySelectorAll('.theme-focus-ring').forEach(el => {
        el.classList.remove('focus:ring-green-500', 'focus:ring-blue-500');
        el.classList.add('focus:ring-green-500');
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

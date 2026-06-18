// Update box shadow based on theme
function updateShadows(theme) {
    const cards = document.querySelectorAll('.habit-card');
    cards.forEach(card => {
        if (theme === 'blue') {
            card.style.boxShadow = '0 4px 14px 0 rgba(91, 164, 201, 0.39)';
        } else {
            card.style.boxShadow = '0 4px 14px 0 rgba(16, 185, 129, 0.39)';
        }
    });
    // Update shadow on the hero container to match theme
    const heroShadow = document.getElementById('hero-shadow-container');
    if (heroShadow) {
        if (theme === 'blue') {
            heroShadow.style.boxShadow = '0 20px 25px -5px rgba(91, 164, 201, 0.25), 0 8px 10px -6px rgba(91, 164, 201, 0.25)';
        } else {
            heroShadow.style.boxShadow = '0 20px 25px -5px rgba(16, 185, 129, 0.25), 0 8px 10px -6px rgba(16, 185, 129, 0.25)';
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Set login date on first visit
    getLoginDate();

    // Load dynamic user info
    if (supabaseClient) {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (user && !userError) {
            const name = user.user_metadata?.full_name || 'User';
            const usernameEl = document.getElementById('dashboard-username');
            const avatarEl = document.getElementById('dashboard-avatar');
            
            if (usernameEl) usernameEl.textContent = name;
            
            // Load avatar dari Supabase profiles table
            if (avatarEl) {
                try {
                    const { data: profile, error: profileError } = await supabaseClient
                        .from('profiles')
                        .select('avatar_url')
                        .eq('id', user.id)
                        .single();

                    if (profile?.avatar_url && !profileError) {
                        avatarEl.src = profile.avatar_url;
                    } else {
                        // Fallback ke UI avatars jika belum ada foto
                        avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10B981&color=fff&bold=true`;
                    }
                } catch (err) {
                    console.error('Error loading avatar:', err);
                    // Gunakan default avatar jika ada error
                    avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10B981&color=fff&bold=true`;
                }
            }
        }
    }

    // Sync habits from Supabase, then render
    await syncHabitsFromSupabase();
    renderHomeHabits();
    updateShadows(document.documentElement.getAttribute('data-theme') || 'green');
    // Red dots on date slider
    setTimeout(() => renderHomeDateRedDots(), 300);
    
    // Update Hero Status Card
    function updateHeroCard() {
        const stats = getStatsData('daily'); 
        const streakBadge = document.getElementById('hero-streak-badge');
        const consistencyBadge = document.getElementById('hero-consistency-badge');
        const title = document.getElementById('hero-status-title');
        const desc = document.getElementById('hero-status-desc');
        const starsContainer = document.getElementById('hero-rating-stars');
        
        if (streakBadge) streakBadge.textContent = `${stats.longestStreak} Days`;
        if (consistencyBadge) consistencyBadge.textContent = `${stats.completionRate}% Today`;
        
        // Determine Level & Stars based on Streak
        let level = "ROOKIE";
        let starsHTML = '';
        let description = "Curious researcher ready to build new habits with boundless enthusiasm. Let's make today count!";
        
        if (stats.longestStreak >= 30) {
            level = "LEGEND";
            description = "An absolute legend. Unstoppable consistency and dedication to self-improvement.";
            starsHTML = '<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>';
        } else if (stats.longestStreak >= 14) {
            level = "MASTER";
            description = "Mastering the flow of daily rituals. You've clearly proven your boundless discipline.";
            starsHTML = '<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i>';
        } else if (stats.longestStreak >= 7) {
            level = "EXPERT";
            description = "Hitting a solid stride. Keep your streak alive to reach the ultimate master rank!";
            starsHTML = '<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i>';
        } else if (stats.longestStreak >= 3) {
            level = "APPRENTICE";
            description = "Building momentum. You've proven you can chain multiple days together. Don't stop!";
            starsHTML = '<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i>';
        } else {
            starsHTML = '<i class="fa-solid fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i><i class="fa-regular fa-star"></i>';
        }
        
        if (title) title.textContent = level;
        if (desc) desc.textContent = description;
        if (starsContainer) starsContainer.innerHTML = starsHTML;

        // Update achievements progress
        if (typeof getAchievementsData === 'function') {
            const achData = getAchievementsData();
            const countEl = document.getElementById('hero-achievements-count');
            const progressEl = document.getElementById('hero-achievements-progress');
            if (countEl) countEl.textContent = `${achData.unlockedCount}/${achData.totalCount}`;
            if (progressEl) progressEl.style.width = `${(achData.unlockedCount / achData.totalCount) * 100}%`;
        }
    }
    
    updateHeroCard();
});

// Listen to theme changes from app.js
document.addEventListener('themeChanged', (e) => {
    updateShadows(e.detail.theme);
    renderHomeDateRedDots();
});

// Re-render dots when slider rebuilds the dates
document.addEventListener('monthChanged', () => {
    renderHomeDateRedDots();
});

// Modal Logic for Achievements
function openAchievementsModal() {
    const modal = document.getElementById('achievements-modal');
    if (modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        const content = modal.querySelector('.popup-content');
        if (content) {
            content.classList.remove('translate-y-full');
            content.classList.add('translate-y-0');
        }
        renderModalAchievements();
    }
}

function closeAchievementsModal(e) {
    const modal = document.getElementById('achievements-modal');
    if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        const content = modal.querySelector('.popup-content');
        if (content) {
            content.classList.remove('translate-y-0');
            content.classList.add('translate-y-full');
        }
    }
}

function renderModalAchievements() {
    if (typeof getAchievementsData !== 'function') return;
    const achData = getAchievementsData();
    
    const countEl = document.getElementById('modal-achievements-count');
    if (countEl) countEl.innerText = `${achData.unlockedCount}/${achData.totalCount}`;
    
    const listEl = document.getElementById('modal-achievements-list');
    if (!listEl) return;
    
    let html = '';
    achData.achievements.forEach(ach => {
        const opacity = ach.isUnlocked ? 'opacity-100' : 'opacity-60 grayscale';
        const badgeColor = ach.isUnlocked ? 'bg-[var(--primary)]' : 'bg-gray-200';
        const textColor = ach.isUnlocked ? 'text-gray-900' : 'text-gray-500';
        const progressPercent = Math.min((ach.progress / ach.target) * 100, 100);
        
        html += `
            <div class="flex items-center gap-4 p-3 rounded-2xl border border-gray-100 bg-gray-50/50 ${opacity} transition-all">
                <div class="w-14 h-14 rounded-full ${badgeColor} theme-bg-update flex items-center justify-center border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                    <img src="https://placehold.co/100x100/e2e8f0/e2e8f0.png" alt="Badge" class="w-full h-full object-cover mix-blend-multiply">
                </div>
                <div class="flex-1">
                    <h4 class="text-sm font-bold ${textColor}">${ach.name}</h4>
                    <p class="text-xs font-medium text-gray-500 mt-0.5 mb-2">${ach.description}</p>
                    <!-- Achievement Progress Bar -->
                    <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-[var(--primary)] theme-bg-update h-1.5 rounded-full transition-all duration-1000" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="text-[9px] font-bold text-gray-400 mt-1 text-right">${ach.progress} / ${ach.target}</div>
                </div>
                ${ach.isUnlocked ? '<div class="flex-shrink-0 ml-1"><i class="fa-solid fa-circle-check text-[var(--primary)] theme-text-update text-xl drop-shadow-sm"></i></div>' : ''}
            </div>
        `;
    });
    listEl.innerHTML = html;
}

// 3D Tilt & Glare Effect for Hero Card
const heroCard = document.getElementById('hero-card');
const heroSection = heroCard ? heroCard.parentElement : null;
const heroGlare = document.getElementById('hero-card-glare');

if (heroSection && heroCard) {
    // Apply effect on mousemove
    heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate rotation based on cursor position (max 8 degrees tilt)
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
        
        heroCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        
        // Update glare position
        if (heroGlare) {
            heroGlare.style.opacity = '1';
            heroGlare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.4), transparent 50%)`;
        }
    });
    
    // Reset effect when mouse leaves
    heroSection.addEventListener('mouseleave', () => {
        heroCard.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        if (heroGlare) {
            heroGlare.style.opacity = '0';
        }
    });
    
    // For mobile touch devices
    let touchTimeout;
    heroSection.addEventListener('touchmove', (e) => {
        if(e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = heroSection.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Slightly less rotation for touch
            const rotateX = ((y - centerY) / centerY) * -5;
            const rotateY = ((x - centerX) / centerX) * 5;
            
            heroCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            
            if (heroGlare) {
                heroGlare.style.opacity = '1';
                heroGlare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.4), transparent 50%)`;
            }
        }
    });
    
    heroSection.addEventListener('touchend', () => {
        clearTimeout(touchTimeout);
        touchTimeout = setTimeout(() => {
            heroCard.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            if (heroGlare) {
                heroGlare.style.opacity = '0';
            }
        }, 150);
    });
}

let activityChartInstance = null;
let categoryChartInstance = null;

function getThemeColors() {
    const style = getComputedStyle(document.body);
    return {
        primary: style.getPropertyValue('--primary').trim() || '#10B981',
        primaryLight: style.getPropertyValue('--primary-light').trim() || '#D1FAE5',
        accent: style.getPropertyValue('--accent').trim() || '#34D399'
    };
}

function initCharts(period = 'daily') {
    const colors = getThemeColors();
    const stats = getStatsData(period);
    
    // Adjust Completion Icon color Based on Theme
    const completionWrapper = document.getElementById('completion-icon-wrapper');
    if (completionWrapper) {
         completionWrapper.style.backgroundColor = colors.primaryLight;
         completionWrapper.style.color = colors.primary;
    }

    // Update overview cards with real data
    document.getElementById('streak-value').textContent = `${stats.longestStreak} Days`;
    document.getElementById('completion-value').textContent = `${stats.completionRate}%`;
    
    // Account opening date
    const loginDate = getLoginDate();
    const loginObj = new Date(loginDate);
    document.getElementById('activity-subtitle').innerText = `Since ${loginObj.toLocaleString('default', { month: 'short', year: 'numeric' })}`;

    // Activity Bar Chart
    const ctxActivity = document.getElementById('activityChart').getContext('2d');
    
    if (activityChartInstance) activityChartInstance.destroy();
    
    activityChartInstance = new Chart(ctxActivity, {
        type: 'bar',
        data: {
            labels: stats.labels,
            datasets: [{
                label: 'Completion',
                data: stats.data,
                backgroundColor: colors.primary,
                borderRadius: 6,
                borderSkipped: false,
                barThickness: period === 'monthly' ? 16 : 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111827',
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) { return context.raw + '%'; }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: '#F3F4F6', drawBorder: false },
                    border: { display: false },
                    ticks: { display: false }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    border: { display: false },
                    ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 11, weight: '500' } }
                }
            }
        }
    });

    // Category Doughnut Chart — from real data
    const ctxCategory = document.getElementById('categoryChart').getContext('2d');
    
    if (categoryChartInstance) categoryChartInstance.destroy();

    const catEntries = Object.entries(stats.catCounts);
    const catLabels = catEntries.length > 0 ? catEntries.map(e => e[0]) : ['No data'];
    const catData = catEntries.length > 0 ? catEntries.map(e => e[1]) : [1];
    
    // Generate colors for each category
    const paletteColors = [colors.primary, colors.accent, '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#6366F1', '#E5E7EB'];
    const catColors = catLabels.map((_, i) => paletteColors[i % paletteColors.length]);

    // Update legend
    const legendContainer = document.getElementById('category-legend');
    if (legendContainer) {
        legendContainer.innerHTML = catLabels.map((label, i) => `
            <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${catColors[i]}"></span>
                <span class="text-sm font-medium text-gray-700 truncate">${label}</span>
            </div>
        `).join('');
    }
    
    categoryChartInstance = new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
            labels: catLabels,
            datasets: [{
                data: catData,
                backgroundColor: catColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111827',
                    padding: 10,
                    displayColors: true
                }
            }
        }
    });
    
    // Generate Insights
    generateInsights(stats, period);
}

function generateInsights(stats, period) {
    const list = document.getElementById('insights-list');
    if (!list) return;
    list.innerHTML = '';
    
    const theme = document.documentElement.getAttribute('data-theme') || 'green';
    const isBlue = theme === 'blue';
    
    // 1. Trend Insight
    if (stats.data.length > 1) {
        const last = stats.data[stats.data.length - 1];
        const prev = stats.data[stats.data.length - 2];
        let diff = last - prev;
        let trendMsg = diff >= 0 
            ? `<span class="${isBlue ? 'text-[#5BA4C9]' : 'text-[#10B981]'} font-bold"><i class="fa-solid fa-arrow-trend-up mr-1"></i> Up ${diff}%</span> from previous period.`
            : `<span class="text-red-500 font-bold"><i class="fa-solid fa-arrow-trend-down mr-1"></i> Down ${Math.abs(diff)}%</span> from previous period. Keep pushing!`;
        addInsight(list, "Performance Trend", trendMsg, 'fa-chart-line', 'primary');
    }

    // 2. Category Focus
    const catEntries = Object.entries(stats.catCounts);
    if (catEntries.length > 0) {
        catEntries.sort((a,b) => b[1] - a[1]);
        const bestCat = catEntries[0][0];
        addInsight(list, "Primary Focus Area", `Most of your habits belong to the <b>${bestCat}</b> category.`, 'fa-bullseye', 'orange');
    }
    
    // 3. Consistency
    if (stats.longestStreak > 2) {
        addInsight(list, "Strong Consistency", `You reached a ${stats.longestStreak}-day perfect streak. Outstanding!`, 'fa-fire', 'red');
    } else {
        addInsight(list, "Building Consistency", "Try linking a new habit to an existing routine to build a streak.", 'fa-lightbulb', 'yellow');
    }
}

function addInsight(list, title, msg, iconClass, colorMode) {
    const theme = document.documentElement.getAttribute('data-theme') || 'green';
    let iconBg = theme === 'blue' ? 'bg-blue-50 text-[#5BA4C9]' : 'bg-green-50 text-[#10B981]';
    if(colorMode === 'orange') iconBg = 'bg-orange-50 text-orange-500';
    if(colorMode === 'yellow') iconBg = 'bg-yellow-50 text-yellow-500';
    if(colorMode === 'red') iconBg = 'bg-red-50 text-red-500';

    list.innerHTML += `
        <li class="flex gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 items-start shadow-sm transition-transform hover:-translate-y-0.5">
            <div class="w-10 h-10 rounded-full flex shrink-0 items-center justify-center text-lg ${iconBg}">
                <i class="fa-solid ${iconClass}"></i>
            </div>
            <div>
                <h4 class="text-gray-900 font-bold mb-1 text-sm">${title}</h4>
                <p class="text-xs text-gray-500 leading-snug">${msg}</p>
            </div>
        </li>
    `;
}

// Handle Tab Swapping
let currentPeriod = 'daily';
function setStatPeriod(newPeriod) {
    currentPeriod = newPeriod;
    
    // Update UI tabs
    const tabs = document.getElementById('period-tabs').querySelectorAll('button');
    const themeColors = getThemeColors();
    
    tabs.forEach(tab => {
        if(tab.innerText.toLowerCase() === newPeriod) {
            tab.className = `flex-1 py-2 text-sm font-semibold rounded-full bg-white shadow-sm transition-all active-tab`;
            tab.style.color = themeColors.primary;
        } else {
            tab.className = `flex-1 py-2 text-sm font-medium rounded-full text-white/80 hover:text-white transition-all`;
            tab.style.color = '';
        }
    });
    
    // Re-init chart with new data
    initCharts(newPeriod);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Sync habits from Supabase before rendering charts
    await syncHabitsFromSupabase();
    initCharts(currentPeriod);
    
    // Re-render charts when theme changes
    document.addEventListener('themeChanged', () => {
        setTimeout(() => {
            const activeTab = document.querySelector('.active-tab');
            if (activeTab) {
                const themeColors = getThemeColors();
                activeTab.style.color = themeColors.primary;
            }
            initCharts(currentPeriod);
        }, 100);
    });
});

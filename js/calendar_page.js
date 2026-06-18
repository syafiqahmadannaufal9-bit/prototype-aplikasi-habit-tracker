let calYear, calMonth, calSelectedDay;

document.addEventListener('DOMContentLoaded', async () => {
    getLoginDate();
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
    calSelectedDay = now.getDate();

    // Sync habits from Supabase before rendering
    await syncHabitsFromSupabase();
    renderCalendarFull();

    // Month navigation
    document.getElementById('cal-prev').addEventListener('click', () => {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        calSelectedDay = null;
        renderCalendarFull();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        calSelectedDay = null;
        renderCalendarFull();
    });

    document.addEventListener('themeChanged', () => {
        renderCalendarFull();
    });
});

function renderCalendarFull() {
    const theme = document.documentElement.getAttribute('data-theme') || 'green';
    const primaryColor = theme === 'blue' ? '#5BA4C9' : '#10B981';
    const lightColor = theme === 'blue' ? '#E0F2FE' : '#D1FAE5';
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Month title
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('cal-month-title').textContent = `${monthNames[calMonth]} ${calYear}`;

    // Calendar grid
    const grid = document.getElementById('calendar-grid');
    const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const habits = getHabits();
    const completions = getCompletions();
    const loginDate = getLoginDate();

    let html = '';
    // Empty cells
    for (let i = 0; i < firstDay; i++) {
        html += '<div></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(calYear, calMonth, d);
        const dateStr = dateObj.toISOString().slice(0, 10);
        const isToday = dateStr === todayStr;
        const isSelected = d === calSelectedDay;
        const isPast = dateObj <= today;
        const isFuture = dateStr > todayStr;

        let classes = 'calendar-day w-8 h-8 rounded-full flex items-center justify-center mx-auto text-sm font-medium transition-all cursor-pointer hover:scale-110 relative';

        let style = '';
        if (isSelected) {
            classes += ' text-white shadow-md';
            style = `background-color: ${primaryColor};`;
        } else if (isToday) {
            classes += ' text-white';
            style = `background-color: ${primaryColor}; opacity: 0.7;`;
        } else if (isFuture) {
            classes += ' text-gray-400';
        } else {
            classes += ' text-gray-700 bg-gray-50';
        }

        // Red dot for dates with incomplete habits
        let dotHtml = '';
        if (habits.length > 0 && dateStr >= loginDate && dateStr <= todayStr) {
            const allCompleted = habits.every(h => completions[dateStr] && completions[dateStr][h.id]);
            if (!allCompleted) {
                dotHtml = '<span class="cal-red-dot absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>';
            }
        }

        html += `<div class="${classes}" style="${style}" data-date="${dateStr}" data-day="${d}" onclick="selectCalDate(${d})">${d}${dotHtml}</div>`;
    }

    grid.innerHTML = html;

    // Render selected date habits
    if (calSelectedDay) {
        const selDateStr = new Date(calYear, calMonth, calSelectedDay).toISOString().slice(0, 10);
        const selDate = new Date(calYear, calMonth, calSelectedDay);
        document.getElementById('selected-date-text').textContent = selDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        renderCalendarHabits(selDateStr);
    } else {
        document.getElementById('selected-date-text').textContent = `${monthNames[calMonth]} ${calYear}`;
        document.getElementById('calendar-habit-list').innerHTML = `
            <div class="text-center py-6">
                <p class="text-gray-400 text-sm">Select a date to view habits</p>
            </div>`;
    }
}

function selectCalDate(day) {
    calSelectedDay = day;
    renderCalendarFull();
}

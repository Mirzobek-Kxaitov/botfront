// Telegram WebApp initialization
let tg = window.Telegram.WebApp;
tg.expand();

// Global variables
let selectedDate = null;
let selectedTime = null;
const API_BASE_URL = 'https://overluscious-unbusily-ralph.ngrok-free.app'; // Production da o'zgartiriladi

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    generateCalendar();
    setupEventListeners();
});

// Generate calendar for current and next month
function generateCalendar() {
    const calendarDates = document.getElementById('calendar-dates');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get first day of current month and number of days
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();
    
    // Clear calendar
    calendarDates.innerHTML = '';
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'p-2';
        calendarDates.appendChild(emptyCell);
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = formatDate(date);
        const isToday = date.toDateString() === today.toDateString();
        const isPastDate = date < today && !isToday;
        
        const dayElement = document.createElement('div');
        dayElement.className = `p-2 text-center cursor-pointer rounded-lg transition ${
            isPastDate 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-700 hover:bg-blue-100'
        } ${isToday ? 'bg-blue-100 font-semibold' : ''}`;
        
        dayElement.textContent = day;
        dayElement.dataset.date = dateStr;
        
        if (!isPastDate) {
            dayElement.addEventListener('click', () => selectDate(dateStr, dayElement));
        }
        
        calendarDates.appendChild(dayElement);
    }
    
    // Add days of next month to fill the calendar
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const firstDayOfNextMonth = new Date(nextYear, nextMonth, 1);
    const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    
    for (let day = 1; day <= Math.min(14, daysInNextMonth); day++) {
        const date = new Date(nextYear, nextMonth, day);
        const dateStr = formatDate(date);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'p-2 text-center cursor-pointer rounded-lg transition text-gray-700 hover:bg-blue-100';
        dayElement.textContent = day;
        dayElement.dataset.date = dateStr;
        
        dayElement.addEventListener('click', () => selectDate(dateStr, dayElement));
        calendarDates.appendChild(dayElement);
        
        // Stop if we have filled 6 weeks (42 cells)
        if (calendarDates.children.length >= 42) break;
    }
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
}

// Select date
function selectDate(dateStr, element) {
    // Remove previous selection
    document.querySelectorAll('[data-date]').forEach(el => {
        el.classList.remove('bg-blue-600', 'text-white');
    });
    
    // Add selection to clicked element
    element.classList.add('bg-blue-600', 'text-white');
    
    selectedDate = dateStr;
    selectedTime = null;
    
    // Update UI
    document.getElementById('selected-date').textContent = formatDateForDisplay(dateStr);
    
    // Show time selection and load available times
    loadAvailableTimes(dateStr);
    showTimeSection();
}

// Format date for display
function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long' 
    };
    return date.toLocaleDateString('uz-UZ', options);
}

// Load available times for selected date
async function loadAvailableTimes(date) {
    const loading = document.getElementById('loading');
    const timeSlots = document.getElementById('time-slots');
    
    loading.style.display = 'block';
    timeSlots.innerHTML = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/available-times/${date}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.available_times && data.available_times.length > 0) {
            data.available_times.forEach(time => {
                const timeButton = document.createElement('button');
                timeButton.className = 'p-3 text-center border border-gray-300 rounded-lg hover:bg-blue-100 transition';
                timeButton.textContent = time;
                timeButton.addEventListener('click', () => selectTime(time, timeButton));
                timeSlots.appendChild(timeButton);
            });
        } else {
            timeSlots.innerHTML = '<p class="col-span-3 text-center text-gray-500 p-4">Bu kun uchun mavjud vaqt yo\'q</p>';
        }
    } catch (error) {
        console.error('Error loading times:', error);
        console.error('API URL:', `${API_BASE_URL}/available-times/${date}`);
        
        let errorMessage = 'Xatolik yuz berdi';
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Serverga ulanib bo\'lmadi. Internet aloqasini tekshiring.';
        } else if (error.message.includes('500')) {
            errorMessage = 'Server xatoligi. Iltimos, keyinroq urinib ko\'ring.';
        } else if (error.message.includes('404')) {
            errorMessage = 'API topilmadi. URL ni tekshiring.';
        }
        
        timeSlots.innerHTML = `<p class="col-span-3 text-center text-red-500 p-4">${errorMessage}</p>`;
        
        // Show error in Telegram if available
        if (tg && tg.showAlert) {
            tg.showAlert(`Xatolik: ${error.message}`);
        }
    } finally {
        loading.style.display = 'none';
    }
}

// Select time
function selectTime(time, element) {
    // Remove previous selection
    document.querySelectorAll('#time-slots button').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('border-gray-300');
    });
    
    // Add selection to clicked element
    element.classList.add('bg-blue-600', 'text-white');
    element.classList.remove('border-gray-300');
    
    selectedTime = time;
    
    // Update UI
    document.getElementById('selected-time').textContent = time;
    
    showSelectedInfo();
    showConfirmButton();
}

// Show time section
function showTimeSection() {
    document.getElementById('time-section').style.display = 'block';
}

// Show selected info
function showSelectedInfo() {
    document.getElementById('selected-info').style.display = 'block';
}

// Show confirm button
function showConfirmButton() {
    document.getElementById('confirm-btn').style.display = 'block';
}

// Setup event listeners
function setupEventListeners() {
    const confirmBtn = document.getElementById('confirm-btn');
    confirmBtn.addEventListener('click', confirmBooking);
}

// Confirm booking
function confirmBooking() {
    if (!selectedDate || !selectedTime) {
        tg.showAlert('Iltimos, sana va vaqtni tanlang!');
        return;
    }
    
    const bookingData = {
        date: selectedDate,
        time: selectedTime
    };
    
    // Send data to Telegram bot
    tg.sendData(JSON.stringify(bookingData));
}
// Telegram WebApp initialization
let tg = window.Telegram.WebApp;
tg.expand();

// Set theme colors
if (tg.themeParams) {
    document.documentElement.style.setProperty('--tg-theme-bg-color', '#1a1a1a');
    document.documentElement.style.setProperty('--tg-theme-text-color', '#f5f5f5');
    document.documentElement.style.setProperty('--tg-theme-button-color', '#D4AF37');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', '#1a1a1a');
}

// Global variables
let selectedDate = null;
let selectedTime = null;
const API_BASE_URL = 'https://172b092a207c.ngrok-free.app'; // Ngrok tunnel

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    generateCalendar();
    setupEventListeners();
    setupQuickDateButtons();
    setupAdminPanel();
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
        dayElement.className = `calendar-day p-3 text-center cursor-pointer rounded-lg font-medium ${
            isPastDate ? 'disabled' : ''
        } ${isToday ? 'ring-2 ring-gold' : ''}`;
        
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
        dayElement.className = 'calendar-day p-3 text-center cursor-pointer rounded-lg font-medium opacity-60';
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
        el.classList.remove('selected');
    });
    
    // Add selection to clicked element
    element.classList.add('selected');
    
    selectedDate = dateStr;
    selectedTime = null;
    
    // Update UI
    const selectedDateEl = document.getElementById('selected-date');
    const selectedDateDisplayEl = document.getElementById('selected-date-display');
    
    if (selectedDateEl) {
        selectedDateEl.textContent = formatDateForDisplay(dateStr);
    }
    
    // Update time section date display
    if (selectedDateDisplayEl) {
        selectedDateDisplayEl.textContent = formatDateForDisplay(dateStr);
    }
    
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
            data.available_times.forEach((time, index) => {
                const timeButton = document.createElement('button');
                timeButton.className = 'time-slot p-4 text-center rounded-lg font-medium shine-effect';
                timeButton.style.animationDelay = `${index * 0.1}s`;
                timeButton.innerHTML = `
                    <div class="text-sm opacity-80">⏰</div>
                    <div class="font-semibold">${time}</div>
                `;
                timeButton.addEventListener('click', () => selectTime(time, timeButton));
                timeSlots.appendChild(timeButton);
            });
            
            // Add fade-in animation to time slots
            timeSlots.classList.add('fade-in-up');
        } else {
            timeSlots.innerHTML = `
                <div class="col-span-3 text-center p-6">
                    <div class="text-4xl mb-2">😔</div>
                    <p class="text-text-light font-medium">Bu kun uchun mavjud vaqt yo'q</p>
                    <p class="text-text-gray text-sm mt-1">Boshqa kun tanlang</p>
                </div>
            `;
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
        
        timeSlots.innerHTML = `
            <div class="col-span-3 text-center p-6">
                <div class="text-4xl mb-2">⚠️</div>
                <p class="text-red-400 font-medium">${errorMessage}</p>
                <p class="text-text-gray text-sm mt-1">Iltimos, qayta urinib ko'ring</p>
            </div>
        `;
        
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
        btn.classList.remove('selected');
    });
    
    // Add selection to clicked element
    element.classList.add('selected');
    
    selectedTime = time;
    
    // Update UI with animation
    document.getElementById('selected-time').textContent = time;
    
    showSelectedInfo();
    showConfirmButton();
    
    // Add success haptic feedback
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
    }
}

// Show time section
function showTimeSection() {
    const timeSection = document.getElementById('time-section');
    if (timeSection) {
        timeSection.style.display = 'block';
        // Smooth scroll to time section
        setTimeout(() => {
            timeSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }, 100);
    }
}

// Show selected info
function showSelectedInfo() {
    const selectedInfo = document.getElementById('selected-info');
    if (selectedInfo) {
        selectedInfo.style.display = 'block';
        // Smooth scroll to selected info
        setTimeout(() => {
            selectedInfo.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }, 200);
    }
}

// Show confirm button
function showConfirmButton() {
    const confirmBtn = document.getElementById('confirm-btn');
    if (confirmBtn) {
        confirmBtn.style.display = 'block';
        // Smooth scroll to confirm button
        setTimeout(() => {
            confirmBtn.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }, 400);
    }
}

// Setup quick date buttons
function setupQuickDateButtons() {
    const todayBtn = document.getElementById('today-btn');
    const tomorrowBtn = document.getElementById('tomorrow-btn');
    
    if (todayBtn) {
        todayBtn.addEventListener('click', function() {
            const today = new Date();
            const dateStr = formatDate(today);
            selectQuickDate(dateStr, 'Bugun');
        });
    }
    
    if (tomorrowBtn) {
        tomorrowBtn.addEventListener('click', function() {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = formatDate(tomorrow);
            selectQuickDate(dateStr, 'Ertaga');
        });
    }
}

// Select quick date (today/tomorrow)
function selectQuickDate(dateStr, displayText) {
    // Clear calendar selection
    document.querySelectorAll('[data-date]').forEach(el => {
        el.classList.remove('selected');
    });
    
    selectedDate = dateStr;
    selectedTime = null;
    
    // Update UI
    const selectedDateEl = document.getElementById('selected-date');
    const selectedDateDisplayEl = document.getElementById('selected-date-display');
    
    if (selectedDateEl) {
        selectedDateEl.textContent = displayText + ' (' + formatDateForDisplay(dateStr) + ')';
    }
    
    // Update time section date display
    if (selectedDateDisplayEl) {
        selectedDateDisplayEl.textContent = displayText + ' (' + formatDateForDisplay(dateStr) + ')';
    }
    
    // Load available times and show time section
    loadAvailableTimes(dateStr);
    showTimeSection();
    
    // Add haptic feedback
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
    }
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

// Admin panel functionality
function setupAdminPanel() {
    const adminBtn = document.getElementById('admin-btn');
    const closeAdminBtn = document.getElementById('close-admin-btn');
    const loadBookingsBtn = document.getElementById('load-bookings-btn');
    const adminDate = document.getElementById('admin-date');

    // Set default date to today
    if (adminDate) {
        const today = new Date();
        adminDate.value = formatDate(today);
    }

    // Show admin panel with password check
    if (adminBtn) {
        adminBtn.addEventListener('click', function() {
            // Simple admin authentication
            const password = prompt('Admin parolini kiriting:');
            if (password === 'admin123') {
                showAdminPanel();
            } else {
                tg.showAlert('Noto\'g\'ri parol!');
            }
        });
    }

    // Close admin panel
    if (closeAdminBtn) {
        closeAdminBtn.addEventListener('click', function() {
            hideAdminPanel();
        });
    }

    // Load bookings for selected date
    if (loadBookingsBtn) {
        loadBookingsBtn.addEventListener('click', function() {
            const selectedDate = adminDate.value;
            if (selectedDate) {
                loadBookingsForDate(selectedDate);
            } else {
                tg.showAlert('Iltimos, sanani tanlang!');
            }
        });
    }
}

function showAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    const dateSection = document.getElementById('date-section');
    const quickDateSection = document.getElementById('quick-date-section');
    const timeSection = document.getElementById('time-section');
    const selectedInfo = document.getElementById('selected-info');
    const confirmBtn = document.getElementById('confirm-btn');

    // Hide booking sections
    if (dateSection) dateSection.style.display = 'none';
    if (quickDateSection) quickDateSection.style.display = 'none';
    if (timeSection) timeSection.style.display = 'none';
    if (selectedInfo) selectedInfo.style.display = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';

    // Show admin panel
    if (adminPanel) {
        adminPanel.style.display = 'block';
    }
}

function hideAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    const dateSection = document.getElementById('date-section');
    const quickDateSection = document.getElementById('quick-date-section');

    // Show booking sections
    if (dateSection) dateSection.style.display = 'block';
    if (quickDateSection) quickDateSection.style.display = 'block';

    // Hide admin panel
    if (adminPanel) {
        adminPanel.style.display = 'none';
    }
}

async function loadBookingsForDate(date) {
    const bookingsList = document.getElementById('bookings-list');
    const loadBookingsBtn = document.getElementById('load-bookings-btn');

    try {
        // Show loading
        if (loadBookingsBtn) {
            loadBookingsBtn.textContent = '⏳ Yuklanmoqda...';
            loadBookingsBtn.disabled = true;
        }

        if (bookingsList) {
            bookingsList.innerHTML = '<div class="text-center text-text-gray py-4">Yuklanmoqda...</div>';
        }

        // Fetch bookings from API
        const response = await fetch(`${API_BASE_URL}/bookings/${date}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (!response.ok) {
            throw new Error('Ma\'lumotlarni yuklashda xatolik');
        }

        const bookings = await response.json();
        displayBookings(bookings, date);

    } catch (error) {
        console.error('Error loading bookings:', error);
        if (bookingsList) {
            bookingsList.innerHTML = `
                <div class="text-center text-red-400 py-4">
                    <div class="text-2xl mb-2">❌</div>
                    <div>Xatolik: ${error.message}</div>
                </div>
            `;
        }
    } finally {
        // Reset button
        if (loadBookingsBtn) {
            loadBookingsBtn.textContent = '📊 Bronlarni yuklash';
            loadBookingsBtn.disabled = false;
        }
    }
}

function displayBookings(bookings, date) {
    const bookingsList = document.getElementById('bookings-list');

    if (!bookingsList) return;

    const formattedDate = formatDateForDisplay(date);

    if (!bookings || bookings.length === 0) {
        bookingsList.innerHTML = `
            <div class="text-center text-text-gray py-8">
                <div class="text-3xl mb-2">📅</div>
                <div class="text-lg font-medium mb-2">${formattedDate}</div>
                <div>Bu sanada hech qanday bron yo'q</div>
            </div>
        `;
        return;
    }

    let bookingsHtml = `
        <div class="text-center mb-4">
            <div class="text-lg font-semibold text-text-light">${formattedDate}</div>
            <div class="text-text-gray">Jami ${bookings.length} ta bron</div>
        </div>
    `;

    bookings.forEach((booking, index) => {
        bookingsHtml += `
            <div class="glass-effect p-4 rounded-xl border border-gold/20">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-full bg-gold text-primary-dark flex items-center justify-center font-bold text-sm">
                            ${index + 1}
                        </div>
                        <div>
                            <div class="text-text-light font-medium">${booking.user_name || 'Noma\'lum'}</div>
                            <div class="text-text-gray text-sm">${booking.user_phone || 'Telefon ko\'rsatilmagan'}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-gold font-bold">${booking.time}</div>
                        <div class="text-text-gray text-xs">ID: ${booking.id}</div>
                    </div>
                </div>
            </div>
        `;
    });

    bookingsList.innerHTML = bookingsHtml;
}

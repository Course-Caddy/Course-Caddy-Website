/**
 * Course Caddy Tournament - Admin Page
 * Supports multi-day tournaments and auto weather fetching
 */

let tournaments = [];
let selectedTournamentId = null;
let tournamentDays = []; // Array of dates for current tournament being created
let currentUser = null;
let editMode = false; // Track if we're editing an existing tournament
let editingTournamentId = null; // ID of tournament being edited

document.addEventListener('DOMContentLoaded', async function() {
    // Set up login form
    setupLoginForm();

    // Set up sign out button
    setupSignOutButton();

    // Listen for auth state changes
    onAuthStateChanged(async (user) => {
        currentUser = user;

        if (user) {
            // User is signed in - show admin content
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('admin-content').style.display = 'block';
            document.getElementById('user-email').textContent = user.email;

            // Initialize admin functionality
            await initializeAdmin();
        } else {
            // User is signed out - show login form
            document.getElementById('login-container').style.display = 'flex';
            document.getElementById('admin-content').style.display = 'none';
            document.getElementById('user-email').textContent = '';
        }
    });
});

/**
 * Initialize admin functionality after authentication
 */
async function initializeAdmin() {
    // Set up tabs
    setupTabs();

    // Load tournaments
    await loadTournaments();

    // Set up tournament select
    setupTournamentSelect();

    // Set up create form
    setupCreateForm();

    // Set up download button
    setupDownloadButton();

    // Set up date change listeners
    setupDateListeners();

    // Set up weather toggle
    setupWeatherToggle();

    // Set up location lookup button
    setupLocationLookup();

    // Set up fetch weather button
    setupFetchWeatherButton();

    // Set up delete tournament button
    setupDeleteTournamentButton();

    // Set up edit tournament button
    setupEditTournamentButton();

    // Set up cancel edit button
    setupCancelEditButton();
}

/**
 * Set up login form
 */
function setupLoginForm() {
    const form = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const errorEl = document.getElementById('login-error');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            errorEl.textContent = 'Please enter email and password.';
            return;
        }

        // Clear previous error
        errorEl.textContent = '';

        // Disable button while signing in
        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in...';

        try {
            await signIn(email, password);
            // Auth state listener will handle the UI update
        } catch (error) {
            console.error('Sign in error:', error);

            // Display user-friendly error messages
            let errorMessage = 'An error occurred. Please try again.';

            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            } else if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid email or password.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            errorEl.textContent = errorMessage;
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
    });
}

/**
 * Set up sign out button
 */
function setupSignOutButton() {
    const signOutBtn = document.getElementById('sign-out-btn');

    signOutBtn.addEventListener('click', async function() {
        try {
            await signOut();
            // Auth state listener will handle the UI update
        } catch (error) {
            console.error('Sign out error:', error);
            alert('Error signing out. Please try again.');
        }
    });
}

/**
 * Set up tab switching
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active to clicked
            tab.classList.add('active');
            const tabId = tab.dataset.tab + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Load tournaments into select dropdown
 */
async function loadTournaments() {
    try {
        tournaments = await getTournaments();
        
        const select = document.getElementById('tournament-select');
        select.innerHTML = '<option value="">Select a tournament...</option>';
        
        tournaments.forEach(tournament => {
            const option = document.createElement('option');
            option.value = tournament.id;
            const startDate = new Date(tournament.startDate || tournament.date);
            const endDate = tournament.endDate ? new Date(tournament.endDate) : null;
            
            let dateStr = formatDate(startDate);
            if (endDate && endDate.getTime() !== startDate.getTime()) {
                dateStr += ` - ${formatDate(endDate)}`;
            }
            
            option.textContent = `${tournament.name} - ${dateStr}`;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading tournaments:', error);
    }
}

/**
 * Set up tournament select change handler
 */
function setupTournamentSelect() {
    const select = document.getElementById('tournament-select');
    
    select.addEventListener('change', async function() {
        selectedTournamentId = this.value;

        if (!selectedTournamentId) {
            document.getElementById('tournament-stats').style.display = 'none';
            document.getElementById('registrations-actions').style.display = 'none';
            document.getElementById('danger-zone').style.display = 'none';
            document.getElementById('registrations-list').innerHTML =
                '<p class="text-muted text-center">Select a tournament to view registrations</p>';
            return;
        }

        // Show danger zone when a tournament is selected
        document.getElementById('danger-zone').style.display = 'block';

        await loadRegistrations(selectedTournamentId);
    });
}

/**
 * Load registrations for a tournament
 * @param {string} tournamentId 
 */
async function loadRegistrations(tournamentId) {
    const listContainer = document.getElementById('registrations-list');
    listContainer.innerHTML = '<p class="text-muted text-center">Loading registrations...</p>';
    
    try {
        const registrations = await getRegistrations(tournamentId);
        
        // Update stats
        document.getElementById('tournament-stats').style.display = 'grid';
        document.getElementById('registrations-actions').style.display = 'block';
        document.getElementById('stat-registrations').textContent = registrations.length;
        document.getElementById('stat-pdfs').textContent = 
            registrations.filter(r => r.pdfGenerated).length;
        
        if (registrations.length === 0) {
            listContainer.innerHTML = 
                '<p class="text-muted text-center">No registrations yet</p>';
            return;
        }
        
        // Render registrations
        listContainer.innerHTML = '';
        registrations.forEach(reg => {
            const item = createRegistrationItem(reg);
            listContainer.appendChild(item);
        });
        
    } catch (error) {
        console.error('Error loading registrations:', error);
        listContainer.innerHTML = 
            '<p class="text-muted text-center">Error loading registrations</p>';
    }
}

/**
 * Create a registration list item
 * @param {Object} registration 
 * @returns {HTMLElement}
 */
function createRegistrationItem(registration) {
    const item = document.createElement('div');
    item.className = 'registration-item';

    const submittedAt = registration.submittedAt
        ? formatDateTime(new Date(registration.submittedAt))
        : 'Unknown';

    const clubCount = registration.clubs ? registration.clubs.length : 0;

    item.innerHTML = `
        <div>
            <div class="registration-name">${escapeHtml(registration.playerName)}</div>
            <div class="registration-time">Submitted: ${submittedAt}</div>
            <div class="registration-clubs">${clubCount} clubs • ${registration.baselineTemp}°F • ${registration.baselineElevation}ft elevation</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn-small btn-pdf" title="Download PDF">
                📄 PDF
            </button>
            <button class="btn-small btn-view" title="View Details">
                View
            </button>
            <button class="btn-delete-icon" title="Delete Player">
                🗑️
            </button>
        </div>
    `;

    // Add click handler for PDF button
    const pdfBtn = item.querySelector('.btn-pdf');
    pdfBtn.addEventListener('click', () => {
        downloadIndividualPDF(registration);
    });

    // Add click handler for View button
    const viewBtn = item.querySelector('.btn-view');
    viewBtn.addEventListener('click', () => {
        viewRegistration(registration);
    });

    // Add click handler for Delete button
    const deleteBtn = item.querySelector('.btn-delete-icon');
    deleteBtn.addEventListener('click', () => {
        deletePlayer(registration);
    });

    return item;
}

/**
 * Download PDF for an individual player
 * @param {Object} registration
 */
async function downloadIndividualPDF(registration) {
    const tournament = tournaments.find(t => t.id === selectedTournamentId);
    if (!tournament) {
        alert('Tournament not found.');
        return;
    }

    // Fetch live weather before generating PDF
    const tournamentWithLiveWeather = await fetchLiveWeatherForTournament(tournament);
    downloadPlayerPDF(tournamentWithLiveWeather, registration);
}

/**
 * View registration details
 * @param {string} registrationId 
 * @param {Object} registration - Registration object passed directly
 */
function viewRegistration(registration) {
    if (!registration) {
        alert('Registration not found.');
        return;
    }
    
    console.log('Registration details:', registration);
    
    const clubsList = registration.clubs 
        ? registration.clubs.map(c => `  ${c.name}: ${c.distance} yds`).join('\n')
        : 'No clubs';
    
    alert(`Registration Details:\n\nName: ${registration.playerName}\nEmail: ${registration.playerEmail || 'Not provided'}\nBaseline Temp: ${registration.baselineTemp}°F\nBaseline Elevation: ${registration.baselineElevation}ft\nBaseline Humidity: ${registration.baselineHumidity || 50}%\n\nClubs:\n${clubsList}`);
}

/**
 * Set up download all button
 */
function setupDownloadButton() {
    const btn = document.getElementById('download-all-btn');
    
    btn.addEventListener('click', async function() {
        if (!selectedTournamentId) {
            alert('Please select a tournament first.');
            return;
        }
        
        // Get tournament data
        const tournament = tournaments.find(t => t.id === selectedTournamentId);
        if (!tournament) {
            alert('Tournament not found.');
            return;
        }
        
        // Get registrations
        btn.disabled = true;
        btn.textContent = '⏳ Generating PDFs...';
        
        try {
            const registrations = await getRegistrations(selectedTournamentId);
            
            if (registrations.length === 0) {
                alert('No registrations to generate PDFs for.');
                btn.disabled = false;
                btn.textContent = '📥 Download All PDFs';
                return;
            }

            // Fetch live weather before generating PDFs
            btn.textContent = '🌡️ Fetching weather...';
            const tournamentWithLiveWeather = await fetchLiveWeatherForTournament(tournament);
            btn.textContent = '⏳ Generating PDFs...';

            // Generate and download PDFs
            downloadAllPDFs(tournamentWithLiveWeather, registrations);
            
            btn.textContent = '✓ Downloaded!';
            setTimeout(() => {
                btn.disabled = false;
                btn.textContent = '📥 Download All PDFs';
            }, 2000);
            
        } catch (error) {
            console.error('Error generating PDFs:', error);
            alert('Error generating PDFs. Please try again.');
            btn.disabled = false;
            btn.textContent = '📥 Download All PDFs';
        }
    });
}

/**
 * Set up date change listeners to generate day cards
 */
function setupDateListeners() {
    const startDateInput = document.getElementById('new-tournament-start-date');
    const endDateInput = document.getElementById('new-tournament-end-date');
    const timezoneSelect = document.getElementById('new-tournament-timezone');

    const updateDays = () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const timezone = timezoneSelect.value;

        if (startDate && endDate) {
            generateDayCards(startDate, endDate, timezone);
        }
    };

    // Listen to both change and input events for better responsiveness
    startDateInput.addEventListener('change', updateDays);
    endDateInput.addEventListener('change', updateDays);
    startDateInput.addEventListener('input', updateDays);
    endDateInput.addEventListener('input', updateDays);
    // Also regenerate when timezone changes
    timezoneSelect.addEventListener('change', updateDays);
}

/**
 * Generate day condition cards for each tournament day
 * @param {string} startDateStr
 * @param {string} endDateStr
 * @param {string} timezone - IANA timezone string (e.g., 'America/New_York')
 */
function generateDayCards(startDateStr, endDateStr, timezone) {
    const container = document.getElementById('days-conditions-container');
    // Parse dates as local time by appending T12:00:00 (noon) to avoid timezone edge cases
    const start = new Date(startDateStr + 'T12:00:00');
    const end = new Date(endDateStr + 'T12:00:00');
    
    // Validate dates
    if (end < start) {
        container.innerHTML = '<div class="no-days-message">End date must be after start date</div>';
        tournamentDays = [];
        return;
    }
    
    // Calculate number of days
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    if (daysDiff > 7) {
        container.innerHTML = '<div class="no-days-message">Maximum 7 days supported</div>';
        tournamentDays = [];
        return;
    }
    
    // Generate array of dates
    tournamentDays = [];
    for (let i = 0; i < daysDiff; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        tournamentDays.push(date);
    }
    
    // Get timezone from form or use default
    const tz = timezone || document.getElementById('new-tournament-timezone').value || 'America/New_York';

    // Generate HTML for each day
    let html = '';
    tournamentDays.forEach((date, index) => {
        const dayNum = index + 1;
        const dateStr = formatDateLongWithTimezone(date, tz);
        const dateId = formatDateId(date);
        
        html += `
            <div class="day-conditions-card" data-day="${dayNum}" data-date="${dateId}">
                <div class="day-conditions-header">
                    <div class="day-conditions-title">Day ${dayNum}</div>
                    <div class="day-conditions-date">${dateStr}</div>
                    <span class="weather-status manual">Manual</span>
                </div>
                <div class="conditions-grid">
                    <div class="conditions-group">
                        <div class="conditions-title">☀️ Morning <span style="font-weight: normal; color: var(--color-gray-500);">(8am)</span></div>
                        <div class="conditions-row">
                            <div class="form-group">
                                <label class="form-label">Temp (°F)</label>
                                <input type="number" class="form-input morning-temp" data-day="${dayNum}" value="68">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Humidity (%)</label>
                                <input type="number" class="form-input morning-humidity" data-day="${dayNum}" value="75">
                            </div>
                        </div>
                    </div>

                    <div class="conditions-group">
                        <div class="conditions-title">🌤️ Afternoon <span style="font-weight: normal; color: var(--color-gray-500);">(1pm)</span></div>
                        <div class="conditions-row">
                            <div class="form-group">
                                <label class="form-label">Temp (°F)</label>
                                <input type="number" class="form-input afternoon-temp" data-day="${dayNum}" value="82">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Humidity (%)</label>
                                <input type="number" class="form-input afternoon-humidity" data-day="${dayNum}" value="55">
                            </div>
                        </div>
                    </div>

                    <div class="conditions-group">
                        <div class="conditions-title">🌅 Evening <span style="font-weight: normal; color: var(--color-gray-500);">(5pm)</span></div>
                        <div class="conditions-row">
                            <div class="form-group">
                                <label class="form-label">Temp (°F)</label>
                                <input type="number" class="form-input evening-temp" data-day="${dayNum}" value="74">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Humidity (%)</label>
                                <input type="number" class="form-input evening-humidity" data-day="${dayNum}" value="65">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Set up weather toggle
 */
function setupWeatherToggle() {
    const toggle = document.getElementById('use-auto-weather');
    const locationSection = document.getElementById('location-section');
    
    toggle.addEventListener('change', function() {
        locationSection.style.display = this.checked ? 'block' : 'none';
    });
}

/**
 * Set up location lookup button
 */
function setupLocationLookup() {
    const btn = document.getElementById('lookup-location-btn');
    
    btn.addEventListener('click', async function() {
        const address = document.getElementById('course-address').value.trim();
        
        if (!address) {
            alert('Please enter a course address.');
            return;
        }
        
        btn.disabled = true;
        btn.textContent = '⏳ Looking up...';
        const statusEl = document.getElementById('location-status');
        statusEl.textContent = 'Searching for address...';
        statusEl.style.color = 'var(--color-gray-500)';
        
        try {
            // Step 1: Geocode address to lat/long using OpenStreetMap Nominatim
            const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
            const geocodeResponse = await fetch(geocodeUrl, {
                headers: {
                    'User-Agent': 'CourseCaddyTournament/1.0'
                }
            });
            
            if (!geocodeResponse.ok) {
                throw new Error('Geocoding failed');
            }
            
            const geocodeData = await geocodeResponse.json();
            
            if (geocodeData.length === 0) {
                throw new Error('Address not found');
            }
            
            const lat = parseFloat(geocodeData[0].lat);
            const lon = parseFloat(geocodeData[0].lon);
            
            // Update lat/long fields
            document.getElementById('course-latitude').value = lat.toFixed(4);
            document.getElementById('course-longitude').value = lon.toFixed(4);
            
            statusEl.textContent = 'Found location, fetching elevation...';
            
            // Step 2: Get elevation using Open-Meteo Elevation API
            const elevationUrl = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
            const elevationResponse = await fetch(elevationUrl);
            
            if (elevationResponse.ok) {
                const elevationData = await elevationResponse.json();
                if (elevationData.elevation && elevationData.elevation.length > 0) {
                    // Convert meters to feet
                    const elevationFeet = Math.round(elevationData.elevation[0] * 3.28084);
                    document.getElementById('new-tournament-elevation').value = elevationFeet;
                    statusEl.textContent = `✓ Found: ${geocodeData[0].display_name.substring(0, 50)}... | Elevation: ${elevationFeet} ft`;
                    statusEl.style.color = 'var(--color-success)';
                }
            } else {
                statusEl.textContent = `✓ Found location. Enter elevation manually.`;
                statusEl.style.color = 'var(--color-warning)';
            }
            
            btn.textContent = '✓ Found';
            setTimeout(() => {
                btn.textContent = '📍 Lookup Location';
                btn.disabled = false;
            }, 2000);
            
        } catch (error) {
            console.error('Error looking up location:', error);
            statusEl.textContent = '✗ Could not find address. Try a more specific address or enter coordinates manually.';
            statusEl.style.color = 'var(--color-error)';
            btn.textContent = '📍 Lookup Location';
            btn.disabled = false;
        }
    });
}

/**
 * Set up fetch weather button
 */
function setupFetchWeatherButton() {
    const btn = document.getElementById('fetch-weather-btn');
    
    btn.addEventListener('click', async function() {
        const lat = document.getElementById('course-latitude').value;
        const lon = document.getElementById('course-longitude').value;
        
        if (!lat || !lon) {
            alert('Please enter latitude and longitude for the course.');
            return;
        }
        
        if (tournamentDays.length === 0) {
            alert('Please select tournament dates first.');
            return;
        }
        
        btn.disabled = true;
        btn.classList.add('loading');
        btn.textContent = '⏳ Fetching...';
        
        try {
            await fetchWeatherForDays(parseFloat(lat), parseFloat(lon));
            btn.textContent = '✓ Weather Fetched';
            setTimeout(() => {
                btn.textContent = '🌡️ Fetch Weather';
                btn.disabled = false;
                btn.classList.remove('loading');
            }, 2000);
        } catch (error) {
            console.error('Error fetching weather:', error);
            alert('Error fetching weather. Please try again or enter conditions manually.');
            btn.textContent = '🌡️ Fetch Weather';
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    });
}

/**
 * Fetch weather data from Open-Meteo API
 * @param {number} lat 
 * @param {number} lon 
 */
async function fetchWeatherForDays(lat, lon) {
    // Format dates for API
    const startDate = formatDateId(tournamentDays[0]);
    const endDate = formatDateId(tournamentDays[tournamentDays.length - 1]);
    
    // Open-Meteo API - free, no key needed
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m&temperature_unit=fahrenheit&start_date=${startDate}&end_date=${endDate}&timezone=auto`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Weather API error');
    }
    
    const data = await response.json();
    
    // Process weather data for each day
    tournamentDays.forEach((date, index) => {
        const dayNum = index + 1;
        const dateStr = formatDateId(date);
        
        // Find hourly data for this date
        const hourlyTimes = data.hourly.time;
        const temps = data.hourly.temperature_2m;
        const humidity = data.hourly.relative_humidity_2m;
        
        // Get indices for this date (morning 8am, afternoon 1pm, evening 5pm)
        const morningIdx = hourlyTimes.findIndex(t => t.startsWith(dateStr) && t.includes('T08:'));
        const afternoonIdx = hourlyTimes.findIndex(t => t.startsWith(dateStr) && t.includes('T13:'));
        const eveningIdx = hourlyTimes.findIndex(t => t.startsWith(dateStr) && t.includes('T17:'));

        // Update form fields
        if (morningIdx !== -1) {
            const morningTempInput = document.querySelector(`.morning-temp[data-day="${dayNum}"]`);
            const morningHumidityInput = document.querySelector(`.morning-humidity[data-day="${dayNum}"]`);
            if (morningTempInput) morningTempInput.value = Math.round(temps[morningIdx]);
            if (morningHumidityInput) morningHumidityInput.value = Math.round(humidity[morningIdx]);
        }
        
        if (afternoonIdx !== -1) {
            const afternoonTempInput = document.querySelector(`.afternoon-temp[data-day="${dayNum}"]`);
            const afternoonHumidityInput = document.querySelector(`.afternoon-humidity[data-day="${dayNum}"]`);
            if (afternoonTempInput) afternoonTempInput.value = Math.round(temps[afternoonIdx]);
            if (afternoonHumidityInput) afternoonHumidityInput.value = Math.round(humidity[afternoonIdx]);
        }
        
        if (eveningIdx !== -1) {
            const eveningTempInput = document.querySelector(`.evening-temp[data-day="${dayNum}"]`);
            const eveningHumidityInput = document.querySelector(`.evening-humidity[data-day="${dayNum}"]`);
            if (eveningTempInput) eveningTempInput.value = Math.round(temps[eveningIdx]);
            if (eveningHumidityInput) eveningHumidityInput.value = Math.round(humidity[eveningIdx]);
        }
        
        // Update status badge
        const card = document.querySelector(`.day-conditions-card[data-day="${dayNum}"]`);
        if (card) {
            const statusBadge = card.querySelector('.weather-status');
            if (statusBadge) {
                statusBadge.textContent = 'Auto-filled';
                statusBadge.classList.remove('manual');
                statusBadge.classList.add('fetched');
            }
        }
    });
}

/**
 * Fetch live weather for a tournament and return updated tournament object
 * Used when generating PDFs to get real-time weather data
 * @param {Object} tournament - Tournament object
 * @returns {Object} Tournament object with updated weather conditions
 */
async function fetchLiveWeatherForTournament(tournament) {
    // If auto weather is disabled or no coordinates, return original tournament
    if (tournament.useAutoWeather === false) {
        console.log('Auto weather disabled, using stored weather data');
        return tournament;
    }
    if (!tournament.latitude || !tournament.longitude) {
        console.log('No coordinates for tournament, using stored weather data');
        return tournament;
    }

    // Get tournament dates
    const days = tournament.days || [];
    if (days.length === 0) {
        console.log('No days configured for tournament');
        return tournament;
    }

    const startDate = days[0].date;
    const endDate = days[days.length - 1].date;

    console.log(`Fetching live weather for ${tournament.name} (${startDate} to ${endDate})`);

    try {
        // Open-Meteo API - free, no key needed
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${tournament.latitude}&longitude=${tournament.longitude}&hourly=temperature_2m,relative_humidity_2m&temperature_unit=fahrenheit&start_date=${startDate}&end_date=${endDate}&timezone=auto`;

        const response = await fetch(url);
        if (!response.ok) {
            console.warn('Weather API error, using stored data');
            return tournament;
        }

        const data = await response.json();

        // Create a deep copy of the tournament to avoid mutating the original
        const updatedTournament = JSON.parse(JSON.stringify(tournament));

        // Process weather data for each day
        updatedTournament.days.forEach((day, index) => {
            const dateStr = day.date;

            // Find hourly data for this date
            const hourlyTimes = data.hourly.time;
            const temps = data.hourly.temperature_2m;
            const humidity = data.hourly.relative_humidity_2m;

            // Get indices for this date (morning 8am, afternoon 1pm, evening 5pm)
            const morningIdx = hourlyTimes.findIndex(t => t.startsWith(dateStr) && t.includes('T08:'));
            const afternoonIdx = hourlyTimes.findIndex(t => t.startsWith(dateStr) && t.includes('T13:'));
            const eveningIdx = hourlyTimes.findIndex(t => t.startsWith(dateStr) && t.includes('T17:'));

            // Update day conditions with live data
            if (morningIdx !== -1) {
                day.morningTemp = Math.round(temps[morningIdx]);
                day.morningHumidity = Math.round(humidity[morningIdx]);
            }

            if (afternoonIdx !== -1) {
                day.afternoonTemp = Math.round(temps[afternoonIdx]);
                day.afternoonHumidity = Math.round(humidity[afternoonIdx]);
            }

            if (eveningIdx !== -1) {
                day.eveningTemp = Math.round(temps[eveningIdx]);
                day.eveningHumidity = Math.round(humidity[eveningIdx]);
            }

            console.log(`Day ${index + 1} (${dateStr}): Morning ${day.morningTemp}°F, Afternoon ${day.afternoonTemp}°F, Evening ${day.eveningTemp}°F`);
        });

        // Also update top-level conditions for backwards compatibility
        if (updatedTournament.days.length > 0) {
            const firstDay = updatedTournament.days[0];
            updatedTournament.morningTemp = firstDay.morningTemp;
            updatedTournament.morningHumidity = firstDay.morningHumidity;
            updatedTournament.afternoonTemp = firstDay.afternoonTemp;
            updatedTournament.afternoonHumidity = firstDay.afternoonHumidity;
            updatedTournament.eveningTemp = firstDay.eveningTemp;
            updatedTournament.eveningHumidity = firstDay.eveningHumidity;
        }

        console.log('Live weather fetched successfully');
        return updatedTournament;

    } catch (error) {
        console.error('Error fetching live weather:', error);
        // Return original tournament if fetch fails
        return tournament;
    }
}

/**
 * Set up create tournament form
 */
function setupCreateForm() {
    const form = document.getElementById('create-tournament-form');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (tournamentDays.length === 0) {
            alert('Please select start and end dates.');
            return;
        }
        
        // Gather day conditions
        const days = [];
        tournamentDays.forEach((date, index) => {
            const dayNum = index + 1;
            days.push({
                date: formatDateId(date),
                dayNumber: dayNum,
                morningTemp: parseInt(document.querySelector(`.morning-temp[data-day="${dayNum}"]`).value),
                morningHumidity: parseInt(document.querySelector(`.morning-humidity[data-day="${dayNum}"]`).value),
                afternoonTemp: parseInt(document.querySelector(`.afternoon-temp[data-day="${dayNum}"]`).value),
                afternoonHumidity: parseInt(document.querySelector(`.afternoon-humidity[data-day="${dayNum}"]`).value),
                eveningTemp: parseInt(document.querySelector(`.evening-temp[data-day="${dayNum}"]`).value),
                eveningHumidity: parseInt(document.querySelector(`.evening-humidity[data-day="${dayNum}"]`).value)
            });
        });
        
        // Use existing ID if editing, otherwise generate new ID
        const tournamentId = editMode ? editingTournamentId : 'tournament-' + Date.now();

        const tournament = {
            id: tournamentId,
            name: document.getElementById('new-tournament-name').value.trim(),
            course: document.getElementById('new-tournament-course').value.trim(),
            startDate: document.getElementById('new-tournament-start-date').value,
            endDate: document.getElementById('new-tournament-end-date').value,
            date: document.getElementById('new-tournament-start-date').value, // For backwards compatibility
            registrationCutoff: document.getElementById('new-tournament-cutoff').value,
            elevation: parseInt(document.getElementById('new-tournament-elevation').value),
            timezone: document.getElementById('new-tournament-timezone').value,
            useAutoWeather: document.getElementById('use-auto-weather').checked,
            latitude: parseFloat(document.getElementById('course-latitude').value) || null,
            longitude: parseFloat(document.getElementById('course-longitude').value) || null,
            days: days,
            // Keep first day conditions at top level for backwards compatibility
            morningTemp: days[0].morningTemp,
            morningHumidity: days[0].morningHumidity,
            afternoonTemp: days[0].afternoonTemp,
            afternoonHumidity: days[0].afternoonHumidity,
            eveningTemp: days[0].eveningTemp,
            eveningHumidity: days[0].eveningHumidity
        };

        const isEditing = editMode;
        const actionWord = isEditing ? 'updated' : 'created';

        if (USE_MOCK_DATA) {
            if (isEditing) {
                // Update existing tournament in mock data
                const index = MOCK_TOURNAMENTS.findIndex(t => t.id === tournamentId);
                if (index !== -1) {
                    MOCK_TOURNAMENTS[index] = tournament;
                }
            } else {
                MOCK_TOURNAMENTS.push(tournament);
            }
            alert(`Tournament ${actionWord} successfully!\n\nNote: In mock mode, this will be lost on page refresh. Set up Firebase for persistent storage.`);
            await loadTournaments();
            if (isEditing) {
                exitEditMode();
            } else {
                form.reset();
                document.getElementById('days-conditions-container').innerHTML = '<div class="no-days-message">Select start and end dates above to configure daily conditions</div>';
                tournamentDays = [];
                document.querySelector('[data-tab="registrations"]').click();
            }
        } else {
            try {
                await db.collection('tournaments').doc(tournament.id).set(tournament);
                alert(`Tournament ${actionWord} successfully!`);
                await loadTournaments();
                if (isEditing) {
                    exitEditMode();
                } else {
                    form.reset();
                    document.getElementById('days-conditions-container').innerHTML = '<div class="no-days-message">Select start and end dates above to configure daily conditions</div>';
                    tournamentDays = [];
                    document.querySelector('[data-tab="registrations"]').click();
                }
            } catch (error) {
                console.error(`Error ${isEditing ? 'updating' : 'creating'} tournament:`, error);
                alert(`Error ${isEditing ? 'updating' : 'creating'} tournament. Please try again.`);
            }
        }
    });
}

/**
 * Format date as "Jun 14, 2025"
 * @param {Date} date 
 * @returns {string}
 */
function formatDate(date) {
    const options = { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format date as "Saturday, June 14, 2025" in a specific timezone
 * @param {Date} date
 * @param {string} timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns {string}
 */
function formatDateLongWithTimezone(date, timezone) {
    const options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: timezone
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format date as "Saturday, June 14, 2025"
 * @param {Date} date
 * @returns {string}
 */
function formatDateLong(date) {
    const options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format date as "2025-06-14" for API calls
 * @param {Date} date 
 * @returns {string}
 */
function formatDateId(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date and time as "Jun 14, 2025 at 2:34 PM"
 * @param {Date} date 
 * @returns {string}
 */
function formatDateTime(date) {
    const dateOptions = { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    };
    const timeOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    
    return `${date.toLocaleDateString('en-US', dateOptions)} at ${date.toLocaleTimeString('en-US', timeOptions)}`;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Delete a player registration
 * @param {Object} registration
 */
async function deletePlayer(registration) {
    const playerName = registration.playerName;

    // Confirm deletion
    const confirmed = confirm(
        `Are you sure you want to delete ${playerName}?\n\nThis cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    try {
        if (USE_MOCK_DATA) {
            // Remove from mock data (localStorage)
            const registrations = JSON.parse(localStorage.getItem('mockRegistrations') || '[]');
            const filtered = registrations.filter(r => r.id !== registration.id);
            localStorage.setItem('mockRegistrations', JSON.stringify(filtered));
            alert(`${playerName} has been deleted.`);
            await loadRegistrations(selectedTournamentId);
        } else {
            // Delete from Firebase - registrations are in top-level 'registrations' collection
            console.log('Deleting registration with ID:', registration.id);
            await db.collection('registrations').doc(registration.id).delete();
            console.log('Registration deleted successfully');

            alert(`${playerName} has been deleted.`);
            await loadRegistrations(selectedTournamentId);
        }
    } catch (error) {
        console.error('Error deleting player:', error);
        alert(`Error deleting player: ${error.message}`);
    }
}

/**
 * Set up delete tournament button
 */
function setupDeleteTournamentButton() {
    const btn = document.getElementById('delete-tournament-btn');

    btn.addEventListener('click', async function() {
        if (!selectedTournamentId) {
            alert('Please select a tournament first.');
            return;
        }

        const tournament = tournaments.find(t => t.id === selectedTournamentId);
        if (!tournament) {
            alert('Tournament not found.');
            return;
        }

        // Confirm deletion with tournament name
        const confirmed = confirm(
            `Are you sure you want to delete "${tournament.name}" and ALL registered players?\n\nThis cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        // Double confirm for extra safety
        const doubleConfirmed = confirm(
            `FINAL WARNING: You are about to permanently delete:\n\n` +
            `• Tournament: ${tournament.name}\n` +
            `• All player registrations\n\n` +
            `Type OK to confirm deletion.`
        );

        if (!doubleConfirmed) {
            return;
        }

        btn.disabled = true;
        btn.textContent = '⏳ Deleting...';

        try {
            await deleteTournament(selectedTournamentId);

            alert(`"${tournament.name}" has been deleted.`);

            // Reset selection and reload tournaments
            selectedTournamentId = null;
            document.getElementById('tournament-select').value = '';
            document.getElementById('tournament-stats').style.display = 'none';
            document.getElementById('registrations-actions').style.display = 'none';
            document.getElementById('danger-zone').style.display = 'none';
            document.getElementById('registrations-list').innerHTML =
                '<p class="text-muted text-center">Select a tournament to view registrations</p>';

            await loadTournaments();

        } catch (error) {
            console.error('Error deleting tournament:', error);
            alert('Error deleting tournament. Please try again.');
        } finally {
            btn.disabled = false;
            btn.textContent = '🗑️ Delete Tournament';
        }
    });
}

/**
 * Delete a tournament and all its registrations
 * @param {string} tournamentId
 */
async function deleteTournament(tournamentId) {
    if (USE_MOCK_DATA) {
        // Remove from mock data (localStorage for registrations)
        const registrations = JSON.parse(localStorage.getItem('mockRegistrations') || '[]');
        const filtered = registrations.filter(r => r.tournamentId !== tournamentId);
        localStorage.setItem('mockRegistrations', JSON.stringify(filtered));
        // Note: MOCK_TOURNAMENTS is in-memory only, changes won't persist on refresh
    } else {
        console.log('Deleting tournament:', tournamentId);

        // First, delete all registrations for this tournament
        // Registrations are in top-level 'registrations' collection with tournamentId field
        const registrationsSnapshot = await db.collection('registrations')
            .where('tournamentId', '==', tournamentId)
            .get();

        console.log(`Found ${registrationsSnapshot.docs.length} registrations to delete`);

        if (registrationsSnapshot.docs.length > 0) {
            // Delete registrations in batches (Firestore batch limit is 500)
            const batchSize = 500;
            const docs = registrationsSnapshot.docs;

            for (let i = 0; i < docs.length; i += batchSize) {
                const batch = db.batch();
                const chunk = docs.slice(i, i + batchSize);
                chunk.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log(`Deleted batch of ${chunk.length} registrations`);
            }
        }

        // Then delete the tournament document
        console.log('Deleting tournament document');
        await db.collection('tournaments').doc(tournamentId).delete();
        console.log('Tournament deleted successfully');
    }
}

/**
 * Set up edit tournament button
 */
function setupEditTournamentButton() {
    const btn = document.getElementById('edit-tournament-btn');

    btn.addEventListener('click', function() {
        if (!selectedTournamentId) {
            alert('Please select a tournament first.');
            return;
        }

        const tournament = tournaments.find(t => t.id === selectedTournamentId);
        if (!tournament) {
            alert('Tournament not found.');
            return;
        }

        // Enter edit mode
        enterEditMode(tournament);
    });
}

/**
 * Set up cancel edit button
 */
function setupCancelEditButton() {
    const btn = document.getElementById('cancel-edit-btn');

    btn.addEventListener('click', function() {
        exitEditMode();
    });
}

/**
 * Enter edit mode and populate form with tournament data
 * @param {Object} tournament - Tournament to edit
 */
function enterEditMode(tournament) {
    editMode = true;
    editingTournamentId = tournament.id;

    // Update UI to show edit mode
    document.getElementById('edit-mode-banner').style.display = 'flex';
    document.getElementById('editing-tournament-name').textContent = tournament.name;
    document.getElementById('form-title').textContent = 'Edit Tournament';
    document.getElementById('form-submit-btn').textContent = 'Update Tournament';

    // Populate form fields from tournament data
    const startDate = tournament.startDate || tournament.date || '';
    const endDate = tournament.endDate || tournament.startDate || tournament.date || '';

    document.getElementById('new-tournament-name').value = tournament.name || '';
    document.getElementById('new-tournament-course').value = tournament.course || tournament.courseName || '';
    document.getElementById('new-tournament-start-date').value = startDate;
    document.getElementById('new-tournament-end-date').value = endDate;
    document.getElementById('new-tournament-cutoff').value = tournament.registrationCutoff || '';
    document.getElementById('new-tournament-elevation').value = tournament.elevation || '';
    document.getElementById('new-tournament-timezone').value = tournament.timezone || 'America/New_York';

    // Populate location fields and auto weather checkbox
    const useAutoWeather = tournament.useAutoWeather !== undefined ? tournament.useAutoWeather : (tournament.latitude && tournament.longitude);
    document.getElementById('use-auto-weather').checked = useAutoWeather;
    document.getElementById('location-section').style.display = useAutoWeather ? 'block' : 'none';
    document.getElementById('course-latitude').value = tournament.latitude || '';
    document.getElementById('course-longitude').value = tournament.longitude || '';

    // Generate day cards from the form date values
    const timezone = tournament.timezone || 'America/New_York';
    if (startDate && endDate) {
        generateDayCards(startDate, endDate, timezone);

        // Populate day conditions after cards are generated
        setTimeout(() => {
            populateDayConditions(tournament);
        }, 100);
    }

    // Switch to the create/edit tab
    document.querySelector('[data-tab="registrations"]').classList.remove('active');
    document.querySelector('[data-tab="create"]').classList.add('active');
    document.getElementById('registrations-tab').classList.remove('active');
    document.getElementById('create-tab').classList.add('active');
}

/**
 * Populate day condition fields with tournament data
 * @param {Object} tournament - Tournament object
 */
function populateDayConditions(tournament) {
    const days = tournament.days || [];

    if (days.length === 0 && tournament.morningTemp) {
        // Single day tournament with conditions at top level
        const morningTempInput = document.querySelector('.morning-temp[data-day="1"]');
        const morningHumidityInput = document.querySelector('.morning-humidity[data-day="1"]');
        const afternoonTempInput = document.querySelector('.afternoon-temp[data-day="1"]');
        const afternoonHumidityInput = document.querySelector('.afternoon-humidity[data-day="1"]');
        const eveningTempInput = document.querySelector('.evening-temp[data-day="1"]');
        const eveningHumidityInput = document.querySelector('.evening-humidity[data-day="1"]');

        if (morningTempInput) morningTempInput.value = tournament.morningTemp;
        if (morningHumidityInput) morningHumidityInput.value = tournament.morningHumidity;
        if (afternoonTempInput) afternoonTempInput.value = tournament.afternoonTemp;
        if (afternoonHumidityInput) afternoonHumidityInput.value = tournament.afternoonHumidity;
        if (eveningTempInput) eveningTempInput.value = tournament.eveningTemp;
        if (eveningHumidityInput) eveningHumidityInput.value = tournament.eveningHumidity;
    } else {
        // Multi-day tournament
        days.forEach((day, index) => {
            const dayNum = index + 1;

            const morningTempInput = document.querySelector(`.morning-temp[data-day="${dayNum}"]`);
            const morningHumidityInput = document.querySelector(`.morning-humidity[data-day="${dayNum}"]`);
            const afternoonTempInput = document.querySelector(`.afternoon-temp[data-day="${dayNum}"]`);
            const afternoonHumidityInput = document.querySelector(`.afternoon-humidity[data-day="${dayNum}"]`);
            const eveningTempInput = document.querySelector(`.evening-temp[data-day="${dayNum}"]`);
            const eveningHumidityInput = document.querySelector(`.evening-humidity[data-day="${dayNum}"]`);

            if (morningTempInput) morningTempInput.value = day.morningTemp;
            if (morningHumidityInput) morningHumidityInput.value = day.morningHumidity;
            if (afternoonTempInput) afternoonTempInput.value = day.afternoonTemp;
            if (afternoonHumidityInput) afternoonHumidityInput.value = day.afternoonHumidity;
            if (eveningTempInput) eveningTempInput.value = day.eveningTemp;
            if (eveningHumidityInput) eveningHumidityInput.value = day.eveningHumidity;
        });
    }
}

/**
 * Exit edit mode and reset form
 */
function exitEditMode() {
    editMode = false;
    editingTournamentId = null;

    // Update UI to show create mode
    document.getElementById('edit-mode-banner').style.display = 'none';
    document.getElementById('form-title').textContent = 'Create New Tournament';
    document.getElementById('form-submit-btn').textContent = 'Create Tournament';

    // Reset form
    document.getElementById('create-tournament-form').reset();
    document.getElementById('location-section').style.display = 'none';
    document.getElementById('days-conditions-container').innerHTML =
        '<div class="no-days-message">Select start and end dates above to configure daily conditions</div>';
    tournamentDays = [];

    // Switch back to registrations tab
    document.querySelector('[data-tab="create"]').classList.remove('active');
    document.querySelector('[data-tab="registrations"]').classList.add('active');
    document.getElementById('create-tab').classList.remove('active');
    document.getElementById('registrations-tab').classList.add('active');
}

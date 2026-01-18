/**
 * Course Caddy Tournament - Admin Page
 * Supports multi-day tournaments and auto weather fetching
 */

let tournaments = [];
let selectedTournamentId = null;
let tournamentDays = []; // Array of dates for current tournament being created

document.addEventListener('DOMContentLoaded', async function() {
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
});

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
            document.getElementById('registrations-list').innerHTML = 
                '<p class="text-muted text-center">Select a tournament to view registrations</p>';
            return;
        }
        
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
        <div style="display: flex; gap: 8px;">
            <button class="btn-small btn-pdf" title="Download PDF">
                📄 PDF
            </button>
            <button class="btn-small btn-view" title="View Details">
                View
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
    
    return item;
}

/**
 * Download PDF for an individual player
 * @param {Object} registration 
 */
function downloadIndividualPDF(registration) {
    const tournament = tournaments.find(t => t.id === selectedTournamentId);
    if (!tournament) {
        alert('Tournament not found.');
        return;
    }
    
    downloadPlayerPDF(tournament, registration);
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
            
            // Generate and download PDFs
            downloadAllPDFs(tournament, registrations);
            
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
    
    const updateDays = () => {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        if (startDate && endDate) {
            generateDayCards(startDate, endDate);
        }
    };
    
    startDateInput.addEventListener('change', updateDays);
    endDateInput.addEventListener('change', updateDays);
}

/**
 * Generate day condition cards for each tournament day
 * @param {string} startDateStr 
 * @param {string} endDateStr 
 */
function generateDayCards(startDateStr, endDateStr) {
    const container = document.getElementById('days-conditions-container');
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
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
    
    // Generate HTML for each day
    let html = '';
    tournamentDays.forEach((date, index) => {
        const dayNum = index + 1;
        const dateStr = formatDateLong(date);
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
                        <div class="conditions-title">☀️ Morning</div>
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
                        <div class="conditions-title">🌤️ Afternoon</div>
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
                        <div class="conditions-title">🌅 Evening</div>
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
        
        // Get indices for this date (morning ~8am, afternoon ~2pm, evening ~6pm)
        const morningIdx = hourlyTimes.findIndex(t => t.startsWith(dateStr) && t.includes('T08:'));
        const afternoonIdx = hourlyTimes.findIndex(t => t.startsWith(dateStr) && t.includes('T14:'));
        const eveningIdx = hourlyTimes.findIndex(t => t.startsWith(dateStr) && t.includes('T18:'));
        
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
        
        const tournament = {
            id: 'tournament-' + Date.now(),
            name: document.getElementById('new-tournament-name').value.trim(),
            course: document.getElementById('new-tournament-course').value.trim(),
            startDate: document.getElementById('new-tournament-start-date').value,
            endDate: document.getElementById('new-tournament-end-date').value,
            date: document.getElementById('new-tournament-start-date').value, // For backwards compatibility
            registrationCutoff: document.getElementById('new-tournament-cutoff').value,
            elevation: parseInt(document.getElementById('new-tournament-elevation').value),
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
        
        if (USE_MOCK_DATA) {
            MOCK_TOURNAMENTS.push(tournament);
            alert('Tournament created successfully!\n\nNote: In mock mode, this will be lost on page refresh. Set up Firebase for persistent storage.');
            await loadTournaments();
            form.reset();
            document.getElementById('days-conditions-container').innerHTML = '<div class="no-days-message">Select start and end dates above to configure daily conditions</div>';
            tournamentDays = [];
            document.querySelector('[data-tab="registrations"]').click();
        } else {
            try {
                await db.collection('tournaments').doc(tournament.id).set(tournament);
                alert('Tournament created successfully!');
                await loadTournaments();
                form.reset();
                document.getElementById('days-conditions-container').innerHTML = '<div class="no-days-message">Select start and end dates above to configure daily conditions</div>';
                tournamentDays = [];
                document.querySelector('[data-tab="registrations"]').click();
            } catch (error) {
                console.error('Error creating tournament:', error);
                alert('Error creating tournament. Please try again.');
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

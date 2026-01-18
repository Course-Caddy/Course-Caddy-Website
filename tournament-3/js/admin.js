/**
 * Course Caddy Tournament - Admin Page
 */

let tournaments = [];
let selectedTournamentId = null;

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
            option.textContent = `${tournament.name} - ${formatDate(new Date(tournament.date))}`;
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
        <div>
            <button class="btn-small" onclick="viewRegistration('${registration.id}')">
                View Details
            </button>
        </div>
    `;
    
    return item;
}

/**
 * View registration details (placeholder)
 * @param {string} registrationId 
 */
function viewRegistration(registrationId) {
    // For now, just log to console
    // In production, this would show a modal or navigate to details page
    const registrations = JSON.parse(localStorage.getItem('mockRegistrations') || '[]');
    const reg = registrations.find(r => r.id === registrationId);
    
    if (reg) {
        console.log('Registration details:', reg);
        alert(`Registration Details:\n\nName: ${reg.playerName}\nEmail: ${reg.playerEmail || 'Not provided'}\nBaseline: ${reg.baselineTemp}°F, ${reg.baselineElevation}ft, ${reg.baselineHumidity}%\n\nClubs:\n${reg.clubs.map(c => `${c.name}: ${c.distance} yds`).join('\n')}`);
    }
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
        
        // In production, this would trigger PDF generation and download
        // For now, show a placeholder message
        alert('PDF download will be available once Firebase Cloud Functions are set up.\n\nThe function will:\n1. Generate PDFs for all registrations\n2. Package them into a ZIP file\n3. Download to your computer');
        
        console.log('Download all PDFs for tournament:', selectedTournamentId);
    });
}

/**
 * Set up create tournament form
 */
function setupCreateForm() {
    const form = document.getElementById('create-tournament-form');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const tournament = {
            id: 'tournament-' + Date.now(),
            name: document.getElementById('new-tournament-name').value.trim(),
            course: document.getElementById('new-tournament-course').value.trim(),
            date: document.getElementById('new-tournament-date').value,
            registrationCutoff: document.getElementById('new-tournament-cutoff').value,
            elevation: parseInt(document.getElementById('new-tournament-elevation').value),
            morningTemp: parseInt(document.getElementById('morning-temp').value),
            morningHumidity: parseInt(document.getElementById('morning-humidity').value),
            afternoonTemp: parseInt(document.getElementById('afternoon-temp').value),
            afternoonHumidity: parseInt(document.getElementById('afternoon-humidity').value),
            eveningTemp: parseInt(document.getElementById('evening-temp').value),
            eveningHumidity: parseInt(document.getElementById('evening-humidity').value)
        };
        
        if (USE_MOCK_DATA) {
            // Add to mock data (in localStorage for persistence)
            MOCK_TOURNAMENTS.push(tournament);
            alert('Tournament created successfully!\n\nNote: In mock mode, this will be lost on page refresh. Set up Firebase for persistent storage.');
            
            // Refresh tournaments list
            await loadTournaments();
            
            // Reset form
            form.reset();
            
            // Switch to registrations tab
            document.querySelector('[data-tab="registrations"]').click();
        } else {
            // TODO: Add to Firestore
            try {
                await db.collection('tournaments').doc(tournament.id).set(tournament);
                alert('Tournament created successfully!');
                await loadTournaments();
                form.reset();
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

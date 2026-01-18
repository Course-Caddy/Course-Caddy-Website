/**
 * Course Caddy Tournament - Registration Form Page
 * Supports customizable club selection
 */

let currentTournament = null;

// Available clubs list
const AVAILABLE_CLUBS = [
    'Driver', '3 Wood', '5 Wood', '7 Wood', '9 Wood',
    '2 Hybrid', '3 Hybrid', '4 Hybrid', '5 Hybrid', '6 Hybrid',
    '2 Iron', '3 Iron', '4 Iron', '5 Iron', '6 Iron', '7 Iron', '8 Iron', '9 Iron',
    'PW', 'GW', 'AW', 'SW', 'LW'
];

// Default clubs with distances
const DEFAULT_CLUBS = [
    { name: 'Driver', distance: 250 },
    { name: '3 Wood', distance: 230 },
    { name: '5 Wood', distance: 210 },
    { name: '4 Iron', distance: 190 },
    { name: '5 Iron', distance: 180 },
    { name: '6 Iron', distance: 170 },
    { name: '7 Iron', distance: 160 },
    { name: '8 Iron', distance: 150 },
    { name: '9 Iron', distance: 140 },
    { name: 'PW', distance: 130 },
    { name: 'GW', distance: 110 },
    { name: 'SW', distance: 90 },
    { name: 'LW', distance: 70 }
];

// Current clubs in the form
let currentClubs = [];

document.addEventListener('DOMContentLoaded', async function() {
    // Get tournament ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tournamentId = urlParams.get('id');
    
    if (!tournamentId) {
        showError('No tournament specified. Please select a tournament from the list.');
        return;
    }
    
    try {
        // Load tournament data
        currentTournament = await getTournament(tournamentId);
        
        if (!currentTournament) {
            showError('Tournament not found. Please select a tournament from the list.');
            return;
        }
        
        // Check if registration is still open
        const now = new Date();
        const cutoffDate = new Date(currentTournament.registrationCutoff);
        if (now > cutoffDate) {
            showError('Registration for this tournament has closed.');
            return;
        }
        
        // Populate tournament header
        populateTournamentHeader(currentTournament);
        
        // Initialize clubs
        initializeClubs();
        
        // Set up form submission
        setupFormSubmission();
        
        // Set up add club button
        setupAddClubButton();
        
    } catch (error) {
        console.error('Error loading tournament:', error);
        showError('Unable to load tournament details. Please try again later.');
    }
});

/**
 * Populate tournament header with details
 * @param {Object} tournament 
 */
function populateTournamentHeader(tournament) {
    const startDate = new Date(tournament.startDate || tournament.date);
    const endDate = tournament.endDate ? new Date(tournament.endDate) : null;
    
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    let dateStr = startDate.toLocaleDateString('en-US', dateOptions);
    if (endDate && endDate.getTime() !== startDate.getTime()) {
        const endOptions = { month: 'long', day: 'numeric', year: 'numeric' };
        dateStr += ` - ${endDate.toLocaleDateString('en-US', endOptions)}`;
    }
    
    document.getElementById('tournament-name').textContent = tournament.name;
    document.getElementById('tournament-details').textContent = 
        `${tournament.course} • ${dateStr}`;
}

/**
 * Initialize clubs with defaults
 */
function initializeClubs() {
    currentClubs = [...DEFAULT_CLUBS];
    renderClubs();
}

/**
 * Render all clubs to the container
 */
function renderClubs() {
    const container = document.getElementById('clubs-container');
    container.innerHTML = '';
    
    currentClubs.forEach((club, index) => {
        const row = createClubRow(club, index);
        container.appendChild(row);
    });
}

/**
 * Create a club row element
 * @param {Object} club 
 * @param {number} index 
 * @returns {HTMLElement}
 */
function createClubRow(club, index) {
    const row = document.createElement('div');
    row.className = 'club-row';
    row.dataset.index = index;
    
    // Club select dropdown
    const select = document.createElement('select');
    select.className = 'club-select';
    AVAILABLE_CLUBS.forEach(clubName => {
        const option = document.createElement('option');
        option.value = clubName;
        option.textContent = clubName;
        if (clubName === club.name) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    select.addEventListener('change', (e) => {
        currentClubs[index].name = e.target.value;
    });
    
    // Distance input with unit
    const distanceWrapper = document.createElement('div');
    distanceWrapper.style.textAlign = 'center';
    
    const distanceInput = document.createElement('input');
    distanceInput.type = 'number';
    distanceInput.className = 'club-distance-input';
    distanceInput.value = club.distance;
    distanceInput.min = 20;
    distanceInput.max = 400;
    distanceInput.addEventListener('change', (e) => {
        currentClubs[index].distance = parseInt(e.target.value) || 0;
    });
    
    const unitLabel = document.createElement('div');
    unitLabel.className = 'club-unit-label';
    unitLabel.textContent = 'yards';
    
    distanceWrapper.appendChild(distanceInput);
    distanceWrapper.appendChild(unitLabel);
    
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-club';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove club';
    removeBtn.addEventListener('click', () => {
        removeClub(index);
    });
    
    row.appendChild(select);
    row.appendChild(distanceWrapper);
    row.appendChild(removeBtn);
    
    return row;
}

/**
 * Remove a club from the list
 * @param {number} index 
 */
function removeClub(index) {
    if (currentClubs.length <= 1) {
        alert('You must have at least one club.');
        return;
    }
    currentClubs.splice(index, 1);
    renderClubs();
}

/**
 * Set up add club button
 */
function setupAddClubButton() {
    const btn = document.getElementById('add-club-btn');
    btn.addEventListener('click', () => {
        if (currentClubs.length >= 14) {
            alert('Maximum 14 clubs allowed.');
            return;
        }
        
        // Find a club not already in the bag
        const usedClubs = currentClubs.map(c => c.name);
        const availableClub = AVAILABLE_CLUBS.find(c => !usedClubs.includes(c));
        
        if (availableClub) {
            // Estimate distance based on club type
            let distance = 150;
            if (availableClub.includes('Driver')) distance = 250;
            else if (availableClub.includes('Wood')) distance = 220;
            else if (availableClub.includes('Hybrid')) distance = 190;
            else if (availableClub.includes('Iron')) {
                const num = parseInt(availableClub) || 7;
                distance = 200 - (num * 10);
            }
            else if (availableClub === 'PW') distance = 130;
            else if (availableClub === 'GW' || availableClub === 'AW') distance = 110;
            else if (availableClub === 'SW') distance = 90;
            else if (availableClub === 'LW') distance = 70;
            
            currentClubs.push({ name: availableClub, distance });
        } else {
            // All clubs used, add a duplicate
            currentClubs.push({ name: '7 Iron', distance: 160 });
        }
        
        renderClubs();
        
        // Scroll to the new club
        const container = document.getElementById('clubs-container');
        container.lastChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}

/**
 * Set up form submission handling
 */
function setupFormSubmission() {
    const form = document.getElementById('registration-form');
    const submitBtn = document.getElementById('submit-btn');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Submitting...';
        
        try {
            // Gather form data
            const registration = gatherFormData();
            
            // Submit registration
            const result = await submitRegistration(registration);
            
            if (result.success) {
                // Redirect to confirmation page
                const confirmUrl = `confirm.html?name=${encodeURIComponent(registration.playerName)}&date=${encodeURIComponent(currentTournament.startDate || currentTournament.date)}`;
                window.location.href = confirmUrl;
            } else {
                throw new Error('Registration failed');
            }
            
        } catch (error) {
            console.error('Error submitting registration:', error);
            alert('There was an error submitting your registration. Please try again.');
            
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.textContent = 'Submit Registration';
        }
    });
}

/**
 * Validate the form
 * @returns {boolean} True if valid
 */
function validateForm() {
    const playerName = document.getElementById('player-name').value.trim();
    const baselineTemp = document.getElementById('baseline-temp').value;
    const baselineElevation = document.getElementById('baseline-elevation').value;
    
    if (!playerName) {
        alert('Please enter your name.');
        document.getElementById('player-name').focus();
        return false;
    }
    
    if (!baselineTemp || baselineTemp < 20 || baselineTemp > 120) {
        alert('Please enter a valid temperature (20-120°F).');
        document.getElementById('baseline-temp').focus();
        return false;
    }
    
    if (baselineElevation === '' || baselineElevation < 0 || baselineElevation > 12000) {
        alert('Please enter a valid elevation (0-12,000 ft).');
        document.getElementById('baseline-elevation').focus();
        return false;
    }
    
    // Validate clubs
    if (currentClubs.length === 0) {
        alert('Please add at least one club.');
        return false;
    }
    
    for (const club of currentClubs) {
        if (!club.distance || club.distance < 20 || club.distance > 400) {
            alert(`Please enter a valid distance for ${club.name} (20-400 yards).`);
            return false;
        }
    }
    
    return true;
}

/**
 * Gather all form data into a registration object
 * @returns {Object} Registration data
 */
function gatherFormData() {
    // Player info
    const playerName = document.getElementById('player-name').value.trim();
    const playerEmail = document.getElementById('player-email').value.trim();
    
    // Baseline conditions
    const baselineTemp = parseInt(document.getElementById('baseline-temp').value);
    const baselineElevation = parseInt(document.getElementById('baseline-elevation').value);
    const baselineHumidity = parseInt(document.getElementById('baseline-humidity').value) || 50;
    
    // Clubs - use currentClubs array
    const clubs = currentClubs.map(club => ({
        name: club.name,
        distance: club.distance
    }));
    
    return {
        tournamentId: currentTournament.id,
        tournamentName: currentTournament.name,
        playerName: playerName,
        playerEmail: playerEmail || null,
        baselineTemp: baselineTemp,
        baselineElevation: baselineElevation,
        baselineHumidity: baselineHumidity,
        clubs: clubs
    };
}

/**
 * Show error message and disable form
 * @param {string} message 
 */
function showError(message) {
    const container = document.querySelector('.form-container');
    container.innerHTML = `
        <div style="text-align: center; padding: 48px 24px;">
            <div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>
            <h2 style="font-size: 1.25rem; margin-bottom: 8px; color: #1C1C1E;">Oops!</h2>
            <p style="color: #636366; margin-bottom: 24px;">${message}</p>
            <a href="tournaments.html" style="color: #007AFF; font-weight: 500;">← Back to Tournaments</a>
        </div>
    `;
}

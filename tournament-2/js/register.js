/**
 * Course Caddy Tournament - Registration Form Page
 */

let currentTournament = null;

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
        
        // Set up form submission
        setupFormSubmission();
        
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
    const tournamentDate = new Date(tournament.date);
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    document.getElementById('tournament-name').textContent = tournament.name;
    document.getElementById('tournament-details').textContent = 
        `${tournament.course} • ${tournamentDate.toLocaleDateString('en-US', dateOptions)}`;
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
                const confirmUrl = `confirm.html?name=${encodeURIComponent(registration.playerName)}&date=${encodeURIComponent(currentTournament.date)}`;
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
    
    // Validate club distances
    const clubInputs = document.querySelectorAll('.club-distance-input');
    for (const input of clubInputs) {
        const value = parseInt(input.value);
        if (!value || value < 20 || value > 400) {
            alert(`Please enter a valid distance for ${input.dataset.club} (20-400 yards).`);
            input.focus();
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
    
    // Club distances
    const clubs = [];
    const clubInputs = document.querySelectorAll('.club-distance-input');
    clubInputs.forEach(input => {
        const distance = parseInt(input.value);
        if (distance && distance > 0) {
            clubs.push({
                name: input.dataset.club,
                distance: distance
            });
        }
    });
    
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

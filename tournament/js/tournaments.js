/**
 * Course Caddy Tournament - Tournaments List Page
 */

document.addEventListener('DOMContentLoaded', async function() {
    const listContainer = document.getElementById('tournaments-list');
    const loadingState = document.getElementById('loading-state');
    
    try {
        // Fetch tournaments
        const tournaments = await getTournaments();
        
        // Clear loading state
        loadingState.style.display = 'none';
        
        if (tournaments.length === 0) {
            listContainer.innerHTML = `
                <div class="no-tournaments">
                    <div class="no-tournaments-icon">🏌️</div>
                    <p>No upcoming tournaments at this time.</p>
                    <p style="margin-top: 8px; font-size: 0.875rem;">Check back soon!</p>
                </div>
            `;
            return;
        }
        
        // Render tournaments
        tournaments.forEach(tournament => {
            const card = createTournamentCard(tournament);
            listContainer.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error loading tournaments:', error);
        loadingState.innerHTML = `
            <div class="no-tournaments-icon">⚠️</div>
            <p>Unable to load tournaments.</p>
            <p style="margin-top: 8px; font-size: 0.875rem;">Please try again later.</p>
        `;
    }
});

/**
 * Create a tournament card element
 * @param {Object} tournament 
 * @returns {HTMLElement}
 */
function createTournamentCard(tournament) {
    const now = new Date();
    const cutoffDate = new Date(tournament.registrationCutoff);
    const tournamentDate = new Date(tournament.date);
    const isClosed = now > cutoffDate;
    
    const card = document.createElement('a');
    card.className = `tournament-card${isClosed ? ' closed' : ''}`;
    
    if (!isClosed) {
        card.href = `register.html?id=${tournament.id}`;
    }
    
    card.innerHTML = `
        <div class="tournament-card-header">
            <div class="tournament-icon">🏆</div>
            <div class="tournament-info">
                <h2 class="tournament-name">${escapeHtml(tournament.name)}</h2>
                <div class="tournament-details">
                    <div class="tournament-course">
                        <span>${escapeHtml(tournament.course)}</span>
                    </div>
                    <div class="tournament-date">${formatDate(tournamentDate)}</div>
                </div>
            </div>
        </div>
        <div class="tournament-deadline ${isClosed ? 'tournament-closed' : ''}">
            ${isClosed 
                ? '❌ Registration closed' 
                : `⏰ Registration closes: ${formatDeadline(cutoffDate)}`
            }
        </div>
    `;
    
    if (isClosed) {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Registration for this tournament has closed.');
        });
    }
    
    return card;
}

/**
 * Format date as "Saturday, June 14, 2025"
 * @param {Date} date 
 * @returns {string}
 */
function formatDate(date) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format deadline as "Friday, June 12 at 6:00 PM"
 * @param {Date} date 
 * @returns {string}
 */
function formatDeadline(date) {
    const dateOptions = { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
    };
    const timeOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    
    const dateStr = date.toLocaleDateString('en-US', dateOptions);
    const timeStr = date.toLocaleTimeString('en-US', timeOptions);
    
    return `${dateStr} at ${timeStr}`;
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

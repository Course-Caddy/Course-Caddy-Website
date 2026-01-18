/**
 * Course Caddy Tournament - PDF Generator
 * Generates yardage cards for tournament players
 * Uses jsPDF library
 */

// Card dimensions in points (72 points = 1 inch)
const CARD_WIDTH = 4.25 * 72;  // 306 points
const CARD_HEIGHT = 7 * 72;     // 504 points

// Page dimensions (letter size)
const PAGE_WIDTH = 8.5 * 72;    // 612 points
const PAGE_HEIGHT = 11 * 72;    // 792 points

// Colors
const COLOR_PRIMARY = [0, 122, 255];      // iOS blue
const COLOR_TEXT_DARK = [28, 28, 30];     // Near black
const COLOR_TEXT_GRAY = [99, 99, 102];    // Gray
const COLOR_LINE = [200, 200, 200];       // Light gray

/**
 * Calculate adjusted distance based on conditions
 * @param {number} baseDistance - Player's baseline distance for the club
 * @param {number} baseTemp - Player's baseline temperature (°F)
 * @param {number} baseElevation - Player's baseline elevation (ft)
 * @param {number} baseHumidity - Player's baseline humidity (%)
 * @param {number} conditionTemp - Tournament condition temperature (°F)
 * @param {number} conditionElevation - Tournament elevation (ft)
 * @param {number} conditionHumidity - Tournament condition humidity (%)
 * @returns {number} Adjusted distance in yards
 */
function calculateAdjustedDistance(baseDistance, baseTemp, baseElevation, baseHumidity, conditionTemp, conditionElevation, conditionHumidity) {
    // Temperature effect: ~1 yard per 10°F change
    // Cold = shorter, hot = longer
    const tempDiff = conditionTemp - baseTemp;
    const tempEffect = (tempDiff / 10) * (baseDistance / 250);
    
    // Elevation effect: ~2% per 1000ft above sea level
    // Higher elevation = longer (thinner air)
    const elevationDiff = conditionElevation - baseElevation;
    const elevationEffect = (elevationDiff / 1000) * 0.02 * baseDistance;
    
    // Humidity effect: ~1 yard per 25% change (minimal effect)
    // Higher humidity = slightly longer (less dense air)
    const humidityDiff = conditionHumidity - baseHumidity;
    const humidityEffect = (humidityDiff / 25) * (baseDistance / 300);
    
    const adjustedDistance = baseDistance + tempEffect + elevationEffect + humidityEffect;
    
    return Math.round(adjustedDistance);
}

/**
 * Generate all PDFs for a tournament
 * @param {Object} tournament - Tournament data
 * @param {Array} registrations - Array of registration objects
 * @returns {jsPDF} PDF document
 */
function generateTournamentPDFs(tournament, registrations) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
    });
    
    const numDays = tournament.days ? tournament.days.length : 1;
    const isMultiDay = numDays > 1;
    
    if (isMultiDay) {
        // Multi-day: One player per page (days side by side, centered)
        registrations.forEach((registration, index) => {
            if (index > 0) {
                doc.addPage();
            }
            
            // Calculate pages needed for this player
            const pagesNeeded = Math.ceil(numDays / 2);
            
            for (let pageNum = 0; pageNum < pagesNeeded; pageNum++) {
                if (pageNum > 0) {
                    doc.addPage();
                }
                
                const day1Index = pageNum * 2;
                const day2Index = pageNum * 2 + 1;
                
                const day1 = tournament.days[day1Index];
                const day2 = day2Index < numDays ? tournament.days[day2Index] : null;
                
                if (day1 && day2) {
                    // Two cards side by side, centered
                    const totalWidth = CARD_WIDTH * 2;
                    const startX = (PAGE_WIDTH - totalWidth) / 2;
                    const startY = (PAGE_HEIGHT - CARD_HEIGHT) / 2;
                    
                    drawYardageCard(doc, tournament, registration, day1, startX, startY, day1Index + 1);
                    drawYardageCard(doc, tournament, registration, day2, startX + CARD_WIDTH, startY, day2Index + 1);
                } else if (day1) {
                    // Single card, centered
                    const startX = (PAGE_WIDTH - CARD_WIDTH) / 2;
                    const startY = (PAGE_HEIGHT - CARD_HEIGHT) / 2;
                    
                    drawYardageCard(doc, tournament, registration, day1, startX, startY, day1Index + 1);
                }
            }
        });
    } else {
        // Single day: Two players per page
        for (let i = 0; i < registrations.length; i += 2) {
            if (i > 0) {
                doc.addPage();
            }
            
            const reg1 = registrations[i];
            const reg2 = registrations[i + 1];
            
            // Get day conditions (use top-level if no days array)
            const dayConditions = tournament.days ? tournament.days[0] : {
                date: tournament.date || tournament.startDate,
                morningTemp: tournament.morningTemp,
                morningHumidity: tournament.morningHumidity,
                afternoonTemp: tournament.afternoonTemp,
                afternoonHumidity: tournament.afternoonHumidity,
                eveningTemp: tournament.eveningTemp,
                eveningHumidity: tournament.eveningHumidity
            };
            
            // Two cards side by side, left-aligned
            const startY = (PAGE_HEIGHT - CARD_HEIGHT) / 2;
            
            drawYardageCard(doc, tournament, reg1, dayConditions, 0, startY, null);
            
            if (reg2) {
                drawYardageCard(doc, tournament, reg2, dayConditions, CARD_WIDTH, startY, null);
            }
        }
    }
    
    return doc;
}

/**
 * Draw a single yardage card
 * @param {jsPDF} doc - PDF document
 * @param {Object} tournament - Tournament data
 * @param {Object} registration - Player registration data
 * @param {Object} dayConditions - Conditions for this day
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number|null} dayNumber - Day number (null for single-day)
 */
function drawYardageCard(doc, tournament, registration, dayConditions, x, y, dayNumber) {
    const margin = 15;
    const contentWidth = CARD_WIDTH - (margin * 2);
    let currentY = y + margin;
    
    // Draw card border (light gray)
    doc.setDrawColor(...COLOR_LINE);
    doc.setLineWidth(0.5);
    doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT);
    
    // Tournament Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...COLOR_TEXT_DARK);
    const tournamentName = tournament.name;
    const nameWidth = doc.getTextWidth(tournamentName);
    doc.text(tournamentName, x + (CARD_WIDTH - nameWidth) / 2, currentY + 14);
    currentY += 22;
    
    // Course Name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_TEXT_GRAY);
    const courseName = tournament.course;
    const courseWidth = doc.getTextWidth(courseName);
    doc.text(courseName, x + (CARD_WIDTH - courseWidth) / 2, currentY + 11);
    currentY += 22;
    
    // Divider
    doc.setDrawColor(...COLOR_LINE);
    doc.line(x + margin, currentY, x + CARD_WIDTH - margin, currentY);
    currentY += 12;
    
    // Player Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_TEXT_DARK);
    doc.text(registration.playerName, x + margin, currentY + 12);
    currentY += 18;
    
    // Date (with day number if multi-day)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_TEXT_GRAY);
    const dateStr = formatCardDate(dayConditions.date);
    const dateLabel = dayNumber ? `Day ${dayNumber} • ${dateStr}` : dateStr;
    doc.text(dateLabel, x + margin, currentY + 10);
    currentY += 20;
    
    // Conditions summary
    const tempRange = `${dayConditions.morningTemp}°F - ${dayConditions.afternoonTemp}°F`;
    const humidityRange = `${dayConditions.morningHumidity}% - ${dayConditions.afternoonHumidity}%`;
    doc.setFontSize(9);
    doc.text(`Temp: ${tempRange}`, x + margin, currentY + 9);
    currentY += 12;
    doc.text(`Humidity: ${humidityRange}`, x + margin, currentY + 9);
    currentY += 12;
    doc.text(`Elevation: ${tournament.elevation}ft`, x + margin, currentY + 9);
    currentY += 18;
    
    // Divider
    doc.line(x + margin, currentY, x + CARD_WIDTH - margin, currentY);
    currentY += 10;
    
    // Column headers
    const colClub = x + margin;
    const colMorn = x + margin + 70;
    const colAftn = x + margin + 130;
    const colEve = x + margin + 190;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXT_GRAY);
    doc.text('Club', colClub, currentY + 9);
    doc.text('Morn', colMorn, currentY + 9);
    doc.text('Aftn', colAftn, currentY + 9);
    doc.text('Eve', colEve, currentY + 9);
    currentY += 12;
    
    // Condition temps under headers
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${dayConditions.morningTemp}°F`, colMorn, currentY + 8);
    doc.text(`${dayConditions.afternoonTemp}°F`, colAftn, currentY + 8);
    doc.text(`${dayConditions.eveningTemp}°F`, colEve, currentY + 8);
    currentY += 12;
    
    // Divider
    doc.line(x + margin, currentY, x + CARD_WIDTH - margin, currentY);
    currentY += 8;
    
    // Club distances
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_TEXT_DARK);
    
    const clubs = registration.clubs || [];
    const baseTemp = registration.baselineTemp || 70;
    const baseElevation = registration.baselineElevation || 0;
    const baseHumidity = registration.baselineHumidity || 50;
    
    clubs.forEach((club, index) => {
        // Alternate row background
        if (index % 2 === 0) {
            doc.setFillColor(248, 248, 248);
            doc.rect(x + margin - 3, currentY - 2, contentWidth + 6, 16, 'F');
        }
        
        // Club name
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLOR_TEXT_DARK);
        doc.text(club.name, colClub, currentY + 10);
        
        // Calculate adjusted distances
        const mornDist = calculateAdjustedDistance(
            club.distance, baseTemp, baseElevation, baseHumidity,
            dayConditions.morningTemp, tournament.elevation, dayConditions.morningHumidity
        );
        const aftnDist = calculateAdjustedDistance(
            club.distance, baseTemp, baseElevation, baseHumidity,
            dayConditions.afternoonTemp, tournament.elevation, dayConditions.afternoonHumidity
        );
        const eveDist = calculateAdjustedDistance(
            club.distance, baseTemp, baseElevation, baseHumidity,
            dayConditions.eveningTemp, tournament.elevation, dayConditions.eveningHumidity
        );
        
        // Distance values
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLOR_PRIMARY);
        doc.text(`${mornDist}`, colMorn, currentY + 10);
        doc.text(`${aftnDist}`, colAftn, currentY + 10);
        doc.text(`${eveDist}`, colEve, currentY + 10);
        
        currentY += 16;
    });
    
    // Footer divider
    currentY = y + CARD_HEIGHT - 30;
    doc.line(x + margin, currentY, x + CARD_WIDTH - margin, currentY);
    
    // Course Caddy branding
    currentY += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXT_GRAY);
    const brandText = 'Course Caddy';
    const brandWidth = doc.getTextWidth(brandText);
    doc.text(brandText, x + (CARD_WIDTH - brandWidth) / 2, currentY);
}

/**
 * Format date for card display
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {string} Formatted date (Jan 29, 2026)
 */
function formatCardDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Generate PDF for a single player
 * @param {Object} tournament - Tournament data
 * @param {Object} registration - Player registration data
 * @returns {jsPDF} PDF document
 */
function generatePlayerPDF(tournament, registration) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
    });
    
    const numDays = tournament.days ? tournament.days.length : 1;
    
    if (numDays === 1) {
        // Single card, centered
        const dayConditions = tournament.days ? tournament.days[0] : {
            date: tournament.date || tournament.startDate,
            morningTemp: tournament.morningTemp,
            morningHumidity: tournament.morningHumidity,
            afternoonTemp: tournament.afternoonTemp,
            afternoonHumidity: tournament.afternoonHumidity,
            eveningTemp: tournament.eveningTemp,
            eveningHumidity: tournament.eveningHumidity
        };
        
        const startX = (PAGE_WIDTH - CARD_WIDTH) / 2;
        const startY = (PAGE_HEIGHT - CARD_HEIGHT) / 2;
        drawYardageCard(doc, tournament, registration, dayConditions, startX, startY, null);
    } else {
        // Multi-day: pages with 2 days each
        const pagesNeeded = Math.ceil(numDays / 2);
        
        for (let pageNum = 0; pageNum < pagesNeeded; pageNum++) {
            if (pageNum > 0) {
                doc.addPage();
            }
            
            const day1Index = pageNum * 2;
            const day2Index = pageNum * 2 + 1;
            
            const day1 = tournament.days[day1Index];
            const day2 = day2Index < numDays ? tournament.days[day2Index] : null;
            
            if (day1 && day2) {
                // Two cards side by side, centered
                const totalWidth = CARD_WIDTH * 2;
                const startX = (PAGE_WIDTH - totalWidth) / 2;
                const startY = (PAGE_HEIGHT - CARD_HEIGHT) / 2;
                
                drawYardageCard(doc, tournament, registration, day1, startX, startY, day1Index + 1);
                drawYardageCard(doc, tournament, registration, day2, startX + CARD_WIDTH, startY, day2Index + 1);
            } else if (day1) {
                // Single card, centered
                const startX = (PAGE_WIDTH - CARD_WIDTH) / 2;
                const startY = (PAGE_HEIGHT - CARD_HEIGHT) / 2;
                
                drawYardageCard(doc, tournament, registration, day1, startX, startY, day1Index + 1);
            }
        }
    }
    
    return doc;
}

/**
 * Download PDF for all players
 * @param {Object} tournament - Tournament data
 * @param {Array} registrations - Array of registration objects
 */
function downloadAllPDFs(tournament, registrations) {
    if (registrations.length === 0) {
        alert('No registrations to generate PDFs for.');
        return;
    }
    
    const doc = generateTournamentPDFs(tournament, registrations);
    const fileName = `${tournament.name.replace(/[^a-z0-9]/gi, '_')}_Yardages.pdf`;
    doc.save(fileName);
}

/**
 * Download PDF for a single player
 * @param {Object} tournament - Tournament data
 * @param {Object} registration - Player registration data
 */
function downloadPlayerPDF(tournament, registration) {
    const doc = generatePlayerPDF(tournament, registration);
    const playerName = registration.playerName.replace(/[^a-z0-9]/gi, '_');
    const fileName = `${playerName}_Yardages.pdf`;
    doc.save(fileName);
}

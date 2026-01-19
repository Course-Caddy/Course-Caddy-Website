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

// Store URLs for QR codes
const APP_STORE_URL = 'https://apps.apple.com/us/app/course-caddy-golf/id6757511581';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.coursecaddy.android';

// Logo path
const LOGO_PATH = 'images/course_caddy_icon_300.png';

// Cached logo data
let cachedLogoData = null;

/**
 * Load logo image as base64 data URL
 * @returns {Promise<string>} Base64 data URL
 */
async function loadLogoImage() {
    if (cachedLogoData) {
        return cachedLogoData;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            cachedLogoData = canvas.toDataURL('image/png');
            resolve(cachedLogoData);
        };
        img.onerror = () => {
            console.error('Failed to load logo image');
            resolve(null);
        };
        img.src = LOGO_PATH;
    });
}

/**
 * Generate QR code as data URL
 * @param {string} url - URL to encode
 * @param {number} size - Size of QR code in pixels
 * @returns {Promise<string>} Base64 data URL
 */
async function generateQRCode(url, size = 150) {
    return new Promise((resolve) => {
        if (typeof QRCode === 'undefined') {
            console.error('QRCode library not loaded');
            resolve(null);
            return;
        }

        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, url, {
            width: size,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        }, (error) => {
            if (error) {
                console.error('QR code generation error:', error);
                resolve(null);
            } else {
                resolve(canvas.toDataURL('image/png'));
            }
        });
    });
}

/**
 * Draw page header with logo
 * @param {jsPDF} doc - PDF document
 * @param {string} logoData - Base64 logo image data
 */
function drawPageHeader(doc, logoData) {
    if (!logoData) return;

    const logoSize = 90;  // Bigger logo for visibility
    const logoX = (PAGE_WIDTH - logoSize) / 2;
    const logoY = 8;  // Minimal top margin

    doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize);
}

/**
 * Draw page footer with QR codes
 * @param {jsPDF} doc - PDF document
 * @param {string} appStoreQR - App Store QR code data URL
 * @param {string} playStoreQR - Play Store QR code data URL
 * @param {number} cardEndY - Y position where the cards end
 */
function drawPageFooter(doc, appStoreQR, playStoreQR, cardEndY) {
    const qrSize = 90;  // Bigger QR codes for older people to scan
    const spacing = 70;  // Space between QR codes for "Course Caddy" text
    const footerY = cardEndY + 8;  // Minimal gap below cards
    const labelY = footerY + qrSize + 10;

    // Calculate centered positions
    const centerX = PAGE_WIDTH / 2;
    const leftQRX = centerX - spacing - qrSize;
    const rightQRX = centerX + spacing;

    // Draw QR codes
    if (appStoreQR) {
        doc.addImage(appStoreQR, 'PNG', leftQRX, footerY, qrSize, qrSize);
    }
    if (playStoreQR) {
        doc.addImage(playStoreQR, 'PNG', rightQRX, footerY, qrSize, qrSize);
    }

    // Draw "Course Caddy" text centered between QR codes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_TEXT_DARK);
    const brandText = 'Course Caddy';
    const brandWidth = doc.getTextWidth(brandText);
    doc.text(brandText, centerX - brandWidth / 2, footerY + qrSize / 2 + 4);

    // Draw labels under QR codes
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXT_GRAY);

    const appStoreLabel = 'App Store';
    const playStoreLabel = 'Google Play';
    const appStoreLabelWidth = doc.getTextWidth(appStoreLabel);
    const playStoreLabelWidth = doc.getTextWidth(playStoreLabel);

    doc.text(appStoreLabel, leftQRX + (qrSize - appStoreLabelWidth) / 2, labelY);
    doc.text(playStoreLabel, rightQRX + (qrSize - playStoreLabelWidth) / 2, labelY);
}

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
 * @param {string} logoData - Base64 logo image data
 * @param {string} appStoreQR - App Store QR code data URL
 * @param {string} playStoreQR - Play Store QR code data URL
 * @returns {jsPDF} PDF document
 */
function generateTournamentPDFs(tournament, registrations, logoData, appStoreQR, playStoreQR) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
    });

    const numDays = tournament.days ? tournament.days.length : 1;
    const isMultiDay = numDays > 1;

    // Compact layout - minimal gaps between logo, cards, and QR codes
    // Logo: 90px at y=8, ends at y=98
    // Cards: start at y=106 (8px gap from logo)
    const cardStartY = 106;
    const cardEndY = cardStartY + CARD_HEIGHT;  // 106 + 504 = 610

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

                // Draw header and footer on each page
                drawPageHeader(doc, logoData);
                drawPageFooter(doc, appStoreQR, playStoreQR, cardEndY);

                const day1Index = pageNum * 2;
                const day2Index = pageNum * 2 + 1;

                const day1 = tournament.days[day1Index];
                const day2 = day2Index < numDays ? tournament.days[day2Index] : null;

                if (day1 && day2) {
                    // Two cards side by side, centered
                    const totalWidth = CARD_WIDTH * 2;
                    const startX = (PAGE_WIDTH - totalWidth) / 2;

                    drawYardageCard(doc, tournament, registration, day1, startX, cardStartY, day1Index + 1);
                    drawYardageCard(doc, tournament, registration, day2, startX + CARD_WIDTH, cardStartY, day2Index + 1);
                } else if (day1) {
                    // Single card, centered
                    const startX = (PAGE_WIDTH - CARD_WIDTH) / 2;

                    drawYardageCard(doc, tournament, registration, day1, startX, cardStartY, day1Index + 1);
                }
            }
        });
    } else {
        // Single day: Two players per page
        for (let i = 0; i < registrations.length; i += 2) {
            if (i > 0) {
                doc.addPage();
            }

            // Draw header and footer on each page
            drawPageHeader(doc, logoData);
            drawPageFooter(doc, appStoreQR, playStoreQR, cardEndY);

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

            // Two cards side by side, centered
            const totalWidth = CARD_WIDTH * 2;
            const startX = (PAGE_WIDTH - totalWidth) / 2;

            drawYardageCard(doc, tournament, reg1, dayConditions, startX, cardStartY, null);

            if (reg2) {
                drawYardageCard(doc, tournament, reg2, dayConditions, startX + CARD_WIDTH, cardStartY, null);
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
 * @param {string} logoData - Base64 logo image data
 * @param {string} appStoreQR - App Store QR code data URL
 * @param {string} playStoreQR - Play Store QR code data URL
 * @returns {jsPDF} PDF document
 */
function generatePlayerPDF(tournament, registration, logoData, appStoreQR, playStoreQR) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
    });

    const numDays = tournament.days ? tournament.days.length : 1;

    // Compact layout - minimal gaps between logo, cards, and QR codes
    // Logo: 90px at y=8, ends at y=98
    // Cards: start at y=106 (8px gap from logo)
    const cardStartY = 106;
    const cardEndY = cardStartY + CARD_HEIGHT;  // 106 + 504 = 610

    if (numDays === 1) {
        // Draw header and footer
        drawPageHeader(doc, logoData);
        drawPageFooter(doc, appStoreQR, playStoreQR, cardEndY);

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
        drawYardageCard(doc, tournament, registration, dayConditions, startX, cardStartY, null);
    } else {
        // Multi-day: pages with 2 days each
        const pagesNeeded = Math.ceil(numDays / 2);

        for (let pageNum = 0; pageNum < pagesNeeded; pageNum++) {
            if (pageNum > 0) {
                doc.addPage();
            }

            // Draw header and footer on each page
            drawPageHeader(doc, logoData);
            drawPageFooter(doc, appStoreQR, playStoreQR, cardEndY);

            const day1Index = pageNum * 2;
            const day2Index = pageNum * 2 + 1;

            const day1 = tournament.days[day1Index];
            const day2 = day2Index < numDays ? tournament.days[day2Index] : null;

            if (day1 && day2) {
                // Two cards side by side, centered
                const totalWidth = CARD_WIDTH * 2;
                const startX = (PAGE_WIDTH - totalWidth) / 2;

                drawYardageCard(doc, tournament, registration, day1, startX, cardStartY, day1Index + 1);
                drawYardageCard(doc, tournament, registration, day2, startX + CARD_WIDTH, cardStartY, day2Index + 1);
            } else if (day1) {
                // Single card, centered
                const startX = (PAGE_WIDTH - CARD_WIDTH) / 2;

                drawYardageCard(doc, tournament, registration, day1, startX, cardStartY, day1Index + 1);
            }
        }
    }

    return doc;
}

/**
 * Load all PDF assets (logo and QR codes)
 * @returns {Promise<Object>} Object with logoData, appStoreQR, playStoreQR
 */
async function loadPDFAssets() {
    const [logoData, appStoreQR, playStoreQR] = await Promise.all([
        loadLogoImage(),
        generateQRCode(APP_STORE_URL),
        generateQRCode(PLAY_STORE_URL)
    ]);

    return { logoData, appStoreQR, playStoreQR };
}

/**
 * Download PDF for all players
 * @param {Object} tournament - Tournament data
 * @param {Array} registrations - Array of registration objects
 */
async function downloadAllPDFs(tournament, registrations) {
    if (registrations.length === 0) {
        alert('No registrations to generate PDFs for.');
        return;
    }

    // Show loading state
    const button = document.querySelector('[onclick*="downloadAllPDFs"]');
    const originalText = button ? button.textContent : '';
    if (button) {
        button.textContent = 'Generating PDF...';
        button.disabled = true;
    }

    try {
        const { logoData, appStoreQR, playStoreQR } = await loadPDFAssets();
        const doc = generateTournamentPDFs(tournament, registrations, logoData, appStoreQR, playStoreQR);
        const fileName = `${tournament.name.replace(/[^a-z0-9]/gi, '_')}_Yardages.pdf`;
        doc.save(fileName);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        if (button) {
            button.textContent = originalText;
            button.disabled = false;
        }
    }
}

/**
 * Download PDF for a single player
 * @param {Object} tournament - Tournament data
 * @param {Object} registration - Player registration data
 */
async function downloadPlayerPDF(tournament, registration) {
    try {
        const { logoData, appStoreQR, playStoreQR } = await loadPDFAssets();
        const doc = generatePlayerPDF(tournament, registration, logoData, appStoreQR, playStoreQR);
        const playerName = registration.playerName.replace(/[^a-z0-9]/gi, '_');
        const fileName = `${playerName}_Yardages.pdf`;
        doc.save(fileName);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
}

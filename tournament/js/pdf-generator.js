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
const COLOR_POSITIVE = [52, 199, 89];     // Green (helping - ball goes further)
const COLOR_NEGATIVE = [255, 149, 0];     // Orange (hurting - ball goes shorter)

// Store URLs for QR codes
const APP_STORE_URL = 'https://apps.apple.com/us/app/course-caddy-golf/id6757511581';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.coursecaddy.android&pcampaignid=web_share';

// Logo path
const LOGO_PATH = 'images/course_caddy_icon_300.png';

// Cached assets
let cachedLogoData = null;
let cachedAppStoreQR = null;
let cachedPlayStoreQR = null;

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
 * Generate QR code as PNG data URL using qrcode-generator library
 * Converts the QR to canvas first to ensure PNG format for jsPDF
 * @param {string} url - URL to encode
 * @param {number} size - Size in pixels (default 200)
 * @returns {string} Base64 PNG data URL
 */
function generateQRCode(url, size = 200) {
    // Check if qrcode-generator library is loaded
    if (typeof qrcode === 'undefined') {
        console.error('qrcode-generator library not loaded');
        return null;
    }

    try {
        // Create QR code with type 0 (auto-detect) and error correction level M
        const qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();

        // Get the module count (number of cells)
        const moduleCount = qr.getModuleCount();
        
        // Calculate cell size to fit desired output size
        const cellSize = Math.floor(size / moduleCount);
        const actualSize = cellSize * moduleCount;
        
        // Create canvas and draw QR code manually as PNG
        const canvas = document.createElement('canvas');
        canvas.width = actualSize;
        canvas.height = actualSize;
        const ctx = canvas.getContext('2d');
        
        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, actualSize, actualSize);
        
        // Draw black modules
        ctx.fillStyle = '#000000';
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }
            }
        }
        
        // Convert to PNG data URL
        const dataUrl = canvas.toDataURL('image/png');
        console.log('QR code generated successfully for:', url.substring(0, 50) + '...');
        return dataUrl;
    } catch (error) {
        console.error('QR code generation error:', error);
        return null;
    }
}

/**
 * Draw page header with logo
 * @param {jsPDF} doc - PDF document
 * @param {string} logoData - Base64 logo image data
 */
function drawPageHeader(doc, logoData) {
    if (!logoData) return;

    const logoSize = 70;  // Logo size
    const logoX = (PAGE_WIDTH - logoSize) / 2;
    const logoY = 8;  // Minimal top margin

    try {
        doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch (e) {
        console.error('Failed to add logo:', e);
    }
}

/**
 * Draw page footer with QR codes
 * @param {jsPDF} doc - PDF document
 * @param {string} appStoreQR - App Store QR code data URL
 * @param {string} playStoreQR - Play Store QR code data URL
 * @param {number} cardEndY - Y position where the cards end
 */
function drawPageFooter(doc, appStoreQR, playStoreQR, cardEndY) {
    const qrSize = 80;  // QR code size in points
    const spacing = 60;  // Space between QR codes for "Course Caddy" text
    const footerY = cardEndY + 8;  // Minimal gap below cards
    const labelY = footerY + qrSize + 10;

    // Calculate centered positions
    const centerX = PAGE_WIDTH / 2;
    const leftQRX = centerX - spacing - qrSize;
    const rightQRX = centerX + spacing;

    // Draw QR codes
    if (appStoreQR) {
        try {
            doc.addImage(appStoreQR, 'PNG', leftQRX, footerY, qrSize, qrSize);
        } catch (e) {
            console.error('Failed to add App Store QR:', e);
            // Draw placeholder box
            doc.setDrawColor(...COLOR_LINE);
            doc.rect(leftQRX, footerY, qrSize, qrSize);
            doc.setFontSize(8);
            doc.setTextColor(...COLOR_TEXT_GRAY);
            doc.text('QR Error', leftQRX + qrSize/2 - 15, footerY + qrSize/2);
        }
    }
    
    if (playStoreQR) {
        try {
            doc.addImage(playStoreQR, 'PNG', rightQRX, footerY, qrSize, qrSize);
        } catch (e) {
            console.error('Failed to add Play Store QR:', e);
            // Draw placeholder box
            doc.setDrawColor(...COLOR_LINE);
            doc.rect(rightQRX, footerY, qrSize, qrSize);
            doc.setFontSize(8);
            doc.setTextColor(...COLOR_TEXT_GRAY);
            doc.text('QR Error', rightQRX + qrSize/2 - 15, footerY + qrSize/2);
        }
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
    // Sequential multiplicative formula (matches iOS app algorithm)

    // Step 1: Temperature adjustment (0.2% per degree F)
    const tempDiff = conditionTemp - baseTemp;
    const tempAdjusted = baseDistance * (1.0 + 0.002 * tempDiff);

    // Step 2: Elevation adjustment (2% per 1000ft difference)
    const elevationDiff = conditionElevation - baseElevation;
    const elevationFactor = 1.0 + (elevationDiff / 1000.0) * 0.02;
    const elevationAdjusted = tempAdjusted * elevationFactor;

    // Step 3: Humidity adjustment (1% per 100% humidity change)
    const humidityDiff = conditionHumidity - baseHumidity;
    const humidityFactor = 1.0 + (humidityDiff / 100.0) * 0.01;
    const finalAdjusted = elevationAdjusted * humidityFactor;

    return Math.round(finalAdjusted);
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
    // Logo: 70px at y=8, ends at y=78
    // Cards: start at y=85 (7px gap from logo)
    const cardStartY = 85;
    const cardEndY = cardStartY + CARD_HEIGHT;  // 85 + 504 = 589

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

            // Draw header and footer
            drawPageHeader(doc, logoData);
            drawPageFooter(doc, appStoreQR, playStoreQR, cardEndY);

            const reg1 = registrations[i];
            const reg2 = registrations[i + 1];

            const dayConditions = tournament.days ? tournament.days[0] : {
                date: tournament.date || tournament.startDate,
                morningTemp: tournament.morningTemp,
                morningHumidity: tournament.morningHumidity,
                afternoonTemp: tournament.afternoonTemp,
                afternoonHumidity: tournament.afternoonHumidity,
                eveningTemp: tournament.eveningTemp,
                eveningHumidity: tournament.eveningHumidity
            };

            if (reg1 && reg2) {
                // Two cards side by side
                const totalWidth = CARD_WIDTH * 2;
                const startX = (PAGE_WIDTH - totalWidth) / 2;

                drawYardageCard(doc, tournament, reg1, dayConditions, startX, cardStartY, null);
                drawYardageCard(doc, tournament, reg2, dayConditions, startX + CARD_WIDTH, cardStartY, null);
            } else if (reg1) {
                // Single card, centered
                const startX = (PAGE_WIDTH - CARD_WIDTH) / 2;

                drawYardageCard(doc, tournament, reg1, dayConditions, startX, cardStartY, null);
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
 * @param {Object} dayConditions - Day-specific conditions
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number|null} dayNumber - Day number (null for single-day)
 */
function drawYardageCard(doc, tournament, registration, dayConditions, x, y, dayNumber) {
    const margin = 15;
    const contentWidth = CARD_WIDTH - (margin * 2);
    let currentY = y + margin;

    // Card border
    doc.setDrawColor(...COLOR_LINE);
    doc.setLineWidth(0.5);
    doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT);

    // Tournament name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...COLOR_TEXT_DARK);
    const tournamentName = tournament.name;
    const nameWidth = doc.getTextWidth(tournamentName);
    doc.text(tournamentName, x + (CARD_WIDTH - nameWidth) / 2, currentY + 12);
    currentY += 20;

    // Course name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXT_GRAY);
    const courseName = tournament.courseName || tournament.course || '';
    const courseWidth = doc.getTextWidth(courseName);
    doc.text(courseName, x + (CARD_WIDTH - courseWidth) / 2, currentY + 8);
    currentY += 16;

    // Divider line
    doc.setDrawColor(...COLOR_LINE);
    doc.setLineWidth(0.5);
    doc.line(x + margin, currentY, x + CARD_WIDTH - margin, currentY);
    currentY += 12;

    // Player name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_TEXT_DARK);
    doc.text(registration.playerName, x + margin, currentY + 10);
    currentY += 18;

    // Day and date
    const dateStr = dayConditions.date || tournament.startDate;
    const formattedDate = formatCardDate(dateStr);
    const dayLabel = dayNumber ? `Day ${dayNumber} • ${formattedDate}` : formattedDate;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_TEXT_GRAY);
    doc.text(dayLabel, x + margin, currentY + 8);
    currentY += 16;

    // Conditions
    const minTemp = Math.min(dayConditions.morningTemp, dayConditions.afternoonTemp, dayConditions.eveningTemp);
    const maxTemp = Math.max(dayConditions.morningTemp, dayConditions.afternoonTemp, dayConditions.eveningTemp);
    const minHumidity = Math.min(dayConditions.morningHumidity, dayConditions.afternoonHumidity, dayConditions.eveningHumidity);
    const maxHumidity = Math.max(dayConditions.morningHumidity, dayConditions.afternoonHumidity, dayConditions.eveningHumidity);

    doc.setFontSize(9);
    doc.text(`Temp: ${minTemp}°F - ${maxTemp}°F`, x + margin, currentY + 8);
    currentY += 12;
    doc.text(`Humidity: ${minHumidity}% - ${maxHumidity}%`, x + margin, currentY + 8);
    currentY += 12;
    doc.text(`Elevation: ${tournament.elevation}ft`, x + margin, currentY + 8);
    currentY += 18;

    // Table header
    doc.setDrawColor(...COLOR_LINE);
    doc.setLineWidth(0.5);
    doc.line(x + margin, currentY, x + CARD_WIDTH - margin, currentY);
    currentY += 4;

    const colClub = x + margin;
    const colMorn = x + margin + 65;
    const colAftn = x + margin + 125;
    const colEve = x + margin + 195;

    // Header row with time labels
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_TEXT_DARK);
    doc.text('Club', colClub, currentY + 10);
    doc.text('Morning', colMorn, currentY + 10);
    doc.text('Afternoon', colAftn, currentY + 10);
    doc.text('Evening', colEve, currentY + 10);
    // Time labels below headers
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_TEXT_GRAY);
    doc.text('(8am)', colMorn, currentY + 18);
    doc.text('(1pm)', colAftn, currentY + 18);
    doc.text('(5pm)', colEve, currentY + 18);
    currentY += 20;

    // Temperature row under header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_TEXT_GRAY);
    doc.text(`${dayConditions.morningTemp}°F`, colMorn, currentY + 8);
    doc.text(`${dayConditions.afternoonTemp}°F`, colAftn, currentY + 8);
    doc.text(`${dayConditions.eveningTemp}°F`, colEve, currentY + 8);
    currentY += 14;

    // Club rows
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
        const baseDist = club.distance;
        const mornDist = calculateAdjustedDistance(
            baseDist, baseTemp, baseElevation, baseHumidity,
            dayConditions.morningTemp, tournament.elevation, dayConditions.morningHumidity
        );
        const aftnDist = calculateAdjustedDistance(
            baseDist, baseTemp, baseElevation, baseHumidity,
            dayConditions.afternoonTemp, tournament.elevation, dayConditions.afternoonHumidity
        );
        const eveDist = calculateAdjustedDistance(
            baseDist, baseTemp, baseElevation, baseHumidity,
            dayConditions.eveningTemp, tournament.elevation, dayConditions.eveningHumidity
        );

        // Calculate adjustments
        const mornAdj = mornDist - baseDist;
        const aftnAdj = aftnDist - baseDist;
        const eveAdj = eveDist - baseDist;

        // Helper to draw yardage with adjustment
        const drawYardageWithAdj = (dist, adj, colX) => {
            // Main yardage in blue
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(...COLOR_PRIMARY);
            doc.text(`${dist}`, colX, currentY + 10);

            // Adjustment as superscript (green if positive, orange if negative)
            if (adj !== 0) {
                const adjText = adj > 0 ? `+${adj}` : `${adj}`;
                const adjColor = adj > 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5);
                doc.setTextColor(...adjColor);
                // Position as superscript: right of yardage, raised up
                const yardageWidth = doc.getTextWidth(`${dist}`);
                doc.text(adjText, colX + yardageWidth + 11, currentY + 6);
            }
        };

        drawYardageWithAdj(mornDist, mornAdj, colMorn);
        drawYardageWithAdj(aftnDist, aftnAdj, colAftn);
        drawYardageWithAdj(eveDist, eveAdj, colEve);

        currentY += 16;
    });

    // No footer text inside card - branding is in page footer with QR codes
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

    // Compact layout
    const cardStartY = 85;
    const cardEndY = cardStartY + CARD_HEIGHT;

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
    console.log('Loading PDF assets...');

    // Load logo asynchronously
    const logoData = await loadLogoImage();

    // Generate QR codes (now properly converts to PNG via canvas)
    const appStoreQR = generateQRCode(APP_STORE_URL, 200);
    const playStoreQR = generateQRCode(PLAY_STORE_URL, 200);

    console.log('PDF assets loaded:', {
        logoLoaded: !!logoData,
        appStoreQRLoaded: !!appStoreQR,
        playStoreQRLoaded: !!playStoreQR
    });

    if (!appStoreQR || !playStoreQR) {
        console.error('Failed to generate QR codes. Check if qrcode-generator library is loaded.');
    }

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

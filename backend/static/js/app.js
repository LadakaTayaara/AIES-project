/**
 * Hole Lotta Problems — Tactical Telemetry Dashboard Logic
 * Aero-Tactical Urban Road Intelligence Platform
 */

// ══════════════════════════════════════════════════════════
// Configuration
// ══════════════════════════════════════════════════════════
const API_BASE = window.location.origin;

// ══════════════════════════════════════════════════════════
// State
// ══════════════════════════════════════════════════════════
let map = null;
let markers = [];
let radarCircles = [];
let allReports = [];
let currentFilter = 'all';
let selectedFile = null;

// ══════════════════════════════════════════════════════════
// Initialization
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initMap();
    initUploadForm();
    initFilterChips();
    initModal();
    initBenchmarksModal();
    initForum();
    initDemoSamples();
    checkApiHealth();
    loadDashboardData();

    // Auto-refresh telemetry every 60 seconds
    setInterval(loadDashboardData, 60000);
});

// ══════════════════════════════════════════════════════════
// System Clock
// ══════════════════════════════════════════════════════════
function initClock() {
    const clockEl = document.getElementById('systemClock');
    if (!clockEl) return;

    function update() {
        const now = new Date();
        const hrs = String(now.getUTCHours()).padStart(2, '0');
        const mins = String(now.getUTCMinutes()).padStart(2, '0');
        const secs = String(now.getUTCSeconds()).padStart(2, '0');
        clockEl.textContent = `${hrs}:${mins}:${secs} UTC`;
    }

    update();
    setInterval(update, 1000);
}

// ══════════════════════════════════════════════════════════
// Map (Tactical Leaflet)
// ══════════════════════════════════════════════════════════
function initMap() {
    map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
    }).setView([18.5204, 73.8567], 13);

    // Tactical Dark Canvas (100% Free, No API key required, No watermark)
    const darkBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Tactical Dark Canvas',
        maxZoom: 19,
        maxNativeZoom: 16,
    });

    const darkLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
        maxZoom: 19,
        maxNativeZoom: 16,
    });

    // Satellite Reconnaissance Layer (100% Free, No API key required)
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Earthstar Geographics',
        maxZoom: 19,
        maxNativeZoom: 18,
    });

    const tacticalGroup = L.layerGroup([darkBase, darkLabels]);
    
    // Satellite Recon is DEFAULT
    satellite.addTo(map);

    // Layer control for Satellite Recon vs Tactical Dark
    L.control.layers({
        "🛰 SATELLITE RECON (Default)": satellite,
        "◈ TACTICAL DARK": tacticalGroup,
    }, null, { position: 'bottomright' }).addTo(map);

    const hudCoords = document.getElementById('mapHudCoords');

    // Real-time HUD coordinate tracking
    map.on('mousemove', (e) => {
        if (hudCoords) {
            hudCoords.textContent = `LAT: ${e.latlng.lat.toFixed(5)} │ LNG: ${e.latlng.lng.toFixed(5)} │ ZOOM: ${map.getZoom()}x`;
        }
    });

    // Click to pin target coordinates
    map.on('click', (e) => {
        const latInput = document.getElementById('latInput');
        const lngInput = document.getElementById('lngInput');
        if (latInput && lngInput) {
            latInput.value = e.latlng.lat.toFixed(6);
            lngInput.value = e.latlng.lng.toFixed(6);
            showToast('info', `TARGET PINNED: [${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}]`);
        }
    });
}

function clearMapMarkers() {
    markers.forEach(m => map.removeLayer(m));
    radarCircles.forEach(c => map.removeLayer(c));
    markers = [];
    radarCircles = [];
}

function addMapMarker(report) {
    const lat = report.coordinate?.latitude ?? report.lat;
    const lng = report.coordinate?.longitude ?? report.lng;
    if (!lat || !lng) return;

    const severity = (report.severity || 'unknown').toLowerCase();
    let sevClass = 'marker-minor';
    let emoji = '◈';
    let ringColor = '#00e676';
    let ringRadius = 70;

    if (severity === 'critical' || severity === 'severe') {
        sevClass = 'marker-severe pulse';
        emoji = '⚠';
        ringColor = '#ff1744';
        ringRadius = 130;
    } else if (severity === 'medium' || severity === 'moderate') {
        sevClass = 'marker-moderate';
        emoji = '▲';
        ringColor = '#ff9100';
        ringRadius = 90;
    }

    // Add tactical pulse ring
    const circle = L.circle([lat, lng], {
        radius: ringRadius,
        color: ringColor,
        weight: 1.5,
        opacity: 0.5,
        fillColor: ringColor,
        fillOpacity: 0.08,
    }).addTo(map);
    radarCircles.push(circle);

    const icon = L.divIcon({
        className: '',
        html: `<div class="custom-marker ${sevClass}">${emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(map);

    // Tactical Popup
    const displaySeverity = severity.toUpperCase();
    const conf = report.confidence != null ? `${(report.confidence * 100).toFixed(1)}%` : '--';
    const id = (report.id || report.report_id || '').substring(0, 10);
    const count = report.report_count ? `${report.report_count} CITIZEN REPORTS` : (report.num_detections || 1);

    marker.bindPopup(`
        <div class="popup-content">
            <span class="popup-severity sev-${severity === 'critical' ? 'severe' : severity}">${displaySeverity}</span>
            <div class="popup-row"><span class="popup-label">INCIDENT ID</span><span class="popup-value">#${id}</span></div>
            <div class="popup-row"><span class="popup-label">CONFIDENCE</span><span class="popup-value" style="color:var(--cyan)">${conf}</span></div>
            <div class="popup-row"><span class="popup-label">DETECTIONS</span><span class="popup-value">${count}</span></div>
            <div class="popup-row"><span class="popup-label">STATUS</span><span class="popup-value" style="color:var(--accent-light)">${(report.status || 'REPORTED').toUpperCase()}</span></div>
        </div>
    `);

    markers.push(marker);
}

// ══════════════════════════════════════════════════════════
// API Communication
// ══════════════════════════════════════════════════════════
async function checkApiHealth() {
    const dot = document.getElementById('apiStatus');
    const text = document.getElementById('apiStatusText');
    const teleModel = document.getElementById('teleModel');
    const teleEngine = document.getElementById('teleEngine');
    const teleLatency = document.getElementById('teleLatency');
    const teleBenchmark = document.getElementById('teleBenchmark');

    try {
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();
        dot.className = 'status-dot online';
        text.textContent = `SYNCED · ${data.model_name || 'YOLO11s PCI'}`;

        if (teleModel && data.model_name) {
            teleModel.textContent = data.model_name;
        }
        if (teleEngine && data.engine) {
            teleEngine.textContent = data.engine;
        }
        if (teleLatency && data.latency_ms != null) {
            teleLatency.textContent = `${data.latency_ms} ms`;
        }
        if (teleBenchmark && data.benchmark_map50 != null) {
            teleBenchmark.textContent = `${data.benchmark_map50}% mAP@50`;
        }
    } catch {
        dot.className = 'status-dot offline';
        text.textContent = 'TELEMETRY OFFLINE';
    }
}

async function loadDashboardData() {
    try {
        // Load summary
        const summaryRes = await fetch(`${API_BASE}/api/dashboard/summary`);
        const summary = await summaryRes.json();

        animateCounter('totalReports', summary.total_reports || 0);
        animateCounter('severeCount', summary.severity_breakdown?.severe || 0);
        animateCounter('moderateCount', summary.severity_breakdown?.moderate || 0);

        const rhi = summary.road_health_index;
        if (rhi != null) {
            animateCounter('healthIndex', rhi, true);
        }

        // Cache and render reports
        allReports = summary.recent_reports || [];
        filterAndRenderReports();

        // Load heatmap data
        const heatmapRes = await fetch(`${API_BASE}/api/heatmap/data`);
        const heatmap = await heatmapRes.json();

        clearMapMarkers();
        const hotspots = heatmap.hotspots || [];
        hotspots.forEach(addMapMarker);

        const clusterEl = document.getElementById('mapHudCluster');
        if (clusterEl) {
            clusterEl.textContent = `RADAR LOCK: ${hotspots.length} HOTSPOTS`;
        }

        // Fit map to markers if we have any
        if (markers.length > 0) {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.12));
        }

    } catch (err) {
        console.error('Failed to load telemetry data:', err);
    }
}

// ══════════════════════════════════════════════════════════
// Filter Chips
// ══════════════════════════════════════════════════════════
function initFilterChips() {
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            filterAndRenderReports();
        });
    });
}

function filterAndRenderReports() {
    let filtered = allReports;
    if (currentFilter === 'severe') {
        filtered = allReports.filter(r => (r.severity || '').toLowerCase() === 'severe' || (r.severity || '').toLowerCase() === 'critical');
    } else if (currentFilter === 'moderate') {
        filtered = allReports.filter(r => (r.severity || '').toLowerCase() === 'moderate' || (r.severity || '').toLowerCase() === 'medium');
    } else if (currentFilter === 'minor') {
        filtered = allReports.filter(r => (r.severity || '').toLowerCase() === 'minor' || (r.severity || '').toLowerCase() === 'low');
    }
    renderReports(filtered);
}

// ══════════════════════════════════════════════════════════
// Upload Form
// ══════════════════════════════════════════════════════════
function initUploadForm() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('imageInput');
    const form = document.getElementById('uploadForm');
    const removeBtn = document.getElementById('removePreview');
    const refreshBtn = document.getElementById('refreshBtn');

    // Click to browse
    dropzone.addEventListener('click', (e) => {
        if (e.target.closest('.preview-remove')) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) setPreview(e.target.files[0]);
    });

    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) setPreview(e.dataTransfer.files[0]);
    });

    // Remove preview
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearPreview();
    });

    // Submit
    form.addEventListener('submit', handleSubmit);

    // Refresh
    if (refreshBtn) refreshBtn.addEventListener('click', loadDashboardData);
}

function setPreview(file) {
    if (!file.type.startsWith('image/')) {
        showToast('error', 'TARGET ERROR: Only raster imagery supported');
        return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('previewImage').src = e.target.result;
        document.getElementById('dropzoneContent').style.display = 'none';
        document.getElementById('dropzonePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function clearPreview() {
    selectedFile = null;
    document.getElementById('imageInput').value = '';
    document.getElementById('dropzoneContent').style.display = 'flex';
    document.getElementById('dropzonePreview').style.display = 'none';
}

async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedFile) {
        showToast('error', 'OPTICAL PAYLOAD MISSING: Select an image');
        return;
    }

    const lat = parseFloat(document.getElementById('latInput').value);
    const lng = parseFloat(document.getElementById('lngInput').value);

    if (isNaN(lat) || isNaN(lng)) {
        showToast('error', 'GPS TELEMETRY MISSING: Set valid coordinates');
        return;
    }

    const btn = document.getElementById('submitBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';

    try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('lat', lat);
        formData.append('lng', lng);

        const desc = document.getElementById('descInput').value.trim();
        if (desc) formData.append('description', desc);

        const res = await fetch(`${API_BASE}/api/reports/submit`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Inference submission failed');
        }

        const result = await res.json();

        showToast('success', `TARGET ANALYZED: [${result.severity.toUpperCase()}] DETECTIONS: ${result.num_detections || 0}`);

        // Show result in tactical modal
        showResultModal(result);

        // Reset form
        clearPreview();
        document.getElementById('descInput').value = '';

        // Reload telemetry
        loadDashboardData();

    } catch (err) {
        console.error('Submit error:', err);
        showToast('error', err.message || 'RF-DETR inference failed');
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

// ══════════════════════════════════════════════════════════
// Reports Feed Rendering
// ══════════════════════════════════════════════════════════
function renderReports(reports) {
    const container = document.getElementById('reportsList');

    if (!reports || reports.length === 0) {
        container.innerHTML = `
            <div class="reports-empty">
                <p>No incidents recorded for this filter</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reports.map(r => {
        const sev = (r.severity || 'unknown').toLowerCase();
        const sevClass = getSevClass(sev);
        const dotColor = getSevColor(sev);
        const conf = r.confidence != null ? `${(r.confidence * 100).toFixed(0)}%` : '--';
        const id = (r.report_id || r.id || '').substring(0, 8);
        const time = r.created_at ? timeAgo(new Date(r.created_at + 'Z')) : '';

        return `
            <div class="report-card" onclick='showReportDetail(${JSON.stringify(r).replace(/'/g, "&#39;")})'>
                <div class="report-left">
                    <div class="report-severity-dot" style="background:${dotColor}"></div>
                    <span class="report-id tabular-nums">#${id}</span>
                    <span class="report-severity-tag ${sevClass}">${sev}</span>
                    <span class="report-confidence tabular-nums">${conf}</span>
                </div>
                <span class="report-time tabular-nums">${time}</span>
            </div>
        `;
    }).join('');
}

function showReportDetail(report) {
    showResultModal({
        report_id: report.report_id || report.id,
        severity: report.severity,
        confidence: report.confidence,
        lat: report.lat,
        lng: report.lng,
        num_detections: report.num_detections,
        status: report.status,
        annotated_image_url: report.annotated_image_url,
        image_url: report.image_url,
    });
}

// ══════════════════════════════════════════════════════════
// Result Modal
// ══════════════════════════════════════════════════════════
function initModal() {
    const modal = document.getElementById('resultModal');
    const closeBtn = document.getElementById('modalClose');

    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.style.display = 'none';
    });
}

function showResultModal(result) {
    const modal = document.getElementById('resultModal');
    const sev = (result.severity || 'unknown').toLowerCase();
    const sevClass = getSevClass(sev);

    document.getElementById('modalSeverity').className = `modal-badge ${sevClass}`;
    document.getElementById('modalSeverity').textContent = sev.toUpperCase();

    const imgEl = document.getElementById('modalAnnotated');
    const imgSrc = result.annotated_image_url || result.image_url;
    if (imgSrc) {
        imgEl.src = imgSrc;
        imgEl.style.display = 'block';
        imgEl.parentElement.parentElement.style.display = 'block';
    } else {
        imgEl.parentElement.parentElement.style.display = 'none';
    }

    document.getElementById('modalReportId').textContent = '#' + (result.report_id || '--').substring(0, 16);
    document.getElementById('modalSeverityText').textContent = sev.toUpperCase();
    document.getElementById('modalConfidence').textContent = result.confidence != null ? `${(result.confidence * 100).toFixed(1)}%` : '--';
    document.getElementById('modalLocation').textContent = result.lat && result.lng ? `[${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}]` : '--';
    document.getElementById('modalDetections').textContent = result.num_detections != null ? result.num_detections : '1';
    document.getElementById('modalStatus').textContent = (result.status || 'REPORTED').toUpperCase();

    modal.style.display = 'flex';
}

// ══════════════════════════════════════════════════════════
// Toast Notifications
// ══════════════════════════════════════════════════════════
function showToast(type, message, duration = 4000) {
    const container = document.getElementById('toastContainer');

    const icons = {
        success: '▶',
        error: '▲',
        info: '◈',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '◈'}</span>
        <span>${message}</span>
        <button class="toast-dismiss" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

// ══════════════════════════════════════════════════════════
// Helpers & Utilities
// ══════════════════════════════════════════════════════════
function getSevClass(severity) {
    const map = { severe: 'sev-severe', critical: 'sev-severe', moderate: 'sev-moderate', medium: 'sev-moderate', minor: 'sev-minor', low: 'sev-minor' };
    return map[severity] || 'sev-unknown';
}

function getSevColor(severity) {
    const map = { severe: '#ff1744', critical: '#ff1744', moderate: '#ff9100', medium: '#ff9100', minor: '#00e676', low: '#00e676' };
    return map[severity] || '#64748b';
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'JUST NOW';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}M AGO`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}H AGO`;
    const days = Math.floor(hours / 24);
    return `${days}D AGO`;
}

function animateCounter(elementId, target, isFloat = false) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const duration = 750;
    const start = performance.now();
    const startVal = 0;

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startVal + (target - startVal) * eased;

        el.textContent = isFloat ? current.toFixed(1) : Math.round(current);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ══════════════════════════════════════════════════════════
// Quick Test Demo Imagery
// ══════════════════════════════════════════════════════════
function initDemoSamples() {
    const chips = document.querySelectorAll('.sample-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', async () => {
            const sampleType = chip.dataset.sample;
            let sampleUrl = '';
            let lat = 18.5204;
            let lng = 73.8567;
            let desc = '';
            let filename = '';

            if (sampleType === 'severe') {
                sampleUrl = '/static/samples/sample_severe.jpg';
                lat = 18.5312;
                lng = 73.8445;
                desc = 'Deep structural crater along SB Road near Symbiosis corridor';
                filename = 'sample_severe.jpg';
            } else if (sampleType === 'moderate') {
                sampleUrl = '/static/samples/sample_moderate.jpg';
                lat = 18.5204;
                lng = 73.8567;
                desc = 'Pavement rim deformation defect along JM Road';
                filename = 'sample_moderate.jpg';
            } else if (sampleType === 'minor') {
                sampleUrl = '/static/samples/sample_minor.jpg';
                lat = 18.5089;
                lng = 73.8291;
                desc = 'Surface aggregate stripping and shallow weathering near Karve Road';
                filename = 'sample_minor.jpg';
            }

            try {
                showToast('info', `Loading ${sampleType.toUpperCase()} test imagery...`);
                const res = await fetch(sampleUrl);
                const blob = await res.blob();
                const file = new File([blob], filename, { type: 'image/jpeg' });

                setPreview(file);
                document.getElementById('latInput').value = lat.toFixed(4);
                document.getElementById('lngInput').value = lng.toFixed(4);
                document.getElementById('descInput').value = desc;

                showToast('success', `STAGED: [${sampleType.toUpperCase()}] Ready! Click "Run Inference & Report".`);
            } catch (err) {
                console.error('Failed to load sample:', err);
                showToast('error', 'Failed to load test sample image');
            }
        });
    });
}

// ══════════════════════════════════════════════════════════
// Research Paper Benchmarks Modal
// ══════════════════════════════════════════════════════════
function initBenchmarksModal() {
    const modal = document.getElementById('benchmarksModal');
    const openBtn = document.getElementById('openBenchmarksBtn');
    const closeBtn = document.getElementById('benchmarksClose');
    const tabBtns = modal ? modal.querySelectorAll('.tab-btn') : [];

    if (!modal) return;

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetTab = btn.dataset.tab;
            modal.querySelectorAll('.tab-pane').forEach(pane => {
                if (pane.id === targetTab) {
                    pane.style.display = 'block';
                } else {
                    pane.style.display = 'none';
                }
            });
        });
    });

    // Copy LaTeX Table 1
    const copyT1 = document.getElementById('copyLatexTable1');
    if (copyT1) {
        copyT1.addEventListener('click', () => {
            const latex = `\\begin{table*}[t]
\\centering
\\caption{Performance Comparison with Baseline Road Pothole Detection Models}
\\label{tab:pothole_comparison}
\\begin{tabular}{lcccccc}
\\hline
\\textbf{Model / Study} & \\textbf{mAP@0.5 (\\%)} & \\textbf{mAP@0.5:0.95 (\\%)} & \\textbf{Precision (\\%)} & \\textbf{Recall (\\%)} & \\textbf{Severity Grading} \\\\
\\hline
YOLOv8n (Kumari et al. 2023) & 78.20 & 45.60 & 81.40 & 72.70 & No (1-class) \\\\
YOLOv8s (Kumari et al. 2023) & 72.70 & 49.10 & 81.40 & 72.70 & No (1-class) \\\\
YOLOv8m (Kumari et al. 2023) & 78.70 & 49.50 & 81.40 & 72.70 & No (1-class) \\\\
YOLOv8l (Kumari et al. 2023) & 78.70 & 50.20 & 83.20 & 73.00 & No (1-class) \\\\
YOLOv8x (Kumari et al. 2023) & 78.50 & 51.40 & 82.60 & 73.00 & No (1-class) \\\\
\\textbf{Our Model (Binary Pothole)} & \\textbf{79.12} & \\textbf{48.95} & \\textbf{78.78} & \\textbf{72.33} & \\textbf{No (Direct Baseline)} \\\\
\\textbf{Our Model (3-Class Severity)} & \\textbf{73.16} & \\textbf{45.80} & \\textbf{80.04} & \\textbf{64.51} & \\textbf{Yes (ASTM 3-Tier)} \\\\
\\hline
\\end{tabular}
\\end{table*}`;
            navigator.clipboard.writeText(latex).then(() => {
                showToast('success', 'Table 1 LaTeX copied to clipboard!');
            });
        });
    }

    // Copy LaTeX Table 2
    const copyT2 = document.getElementById('copyLatexTable2');
    if (copyT2) {
        copyT2.addEventListener('click', () => {
            const latex = `\\begin{table}[h]
\\centering
\\caption{Per-Class Severity Detection Performance Under ASTM D6433 Grading}
\\label{tab:per_class_severity}
\\begin{tabular}{lcccc}
\\hline
\\textbf{Severity Level} & \\textbf{Precision (\\%)} & \\textbf{Recall (\\%)} & \\textbf{mAP@0.5 (\\%)} & \\textbf{F1-Score (\\%)} \\\\
\\hline
Minor & 81.99 & 51.75 & 64.30 & 63.45 \\\\
Moderate & 81.74 & 54.98 & 70.30 & 65.74 \\\\
Severe & 76.39 & 86.79 & 84.90 & 81.26 \\\\
\\hline
\\textbf{Overall / Mean} & \\textbf{80.04} & \\textbf{64.51} & \\textbf{73.16} & \\textbf{71.44} \\\\
\\hline
\\end{tabular}
\\end{table}`;
            navigator.clipboard.writeText(latex).then(() => {
                showToast('success', 'Table 2 LaTeX copied to clipboard!');
            });
        });
    }

    // Copy Abstract Text
    const copyAbstract = document.getElementById('copyAbstractText');
    if (copyAbstract) {
        copyAbstract.addEventListener('click', () => {
            const text = document.getElementById('abstractTextContent').textContent.trim();
            navigator.clipboard.writeText(text).then(() => {
                showToast('success', 'Abstract text copied to clipboard!');
            });
        });
    }
}

// ══════════════════════════════════════════════════════════
// Civic Crowdsourcing Forum
// ══════════════════════════════════════════════════════════
let currentForumCategory = 'all';
let currentActivePostId = null;

function initForum() {
    const forumModal = document.getElementById('forumModal');
    const openForumBtn = document.getElementById('openForumBtn');
    const forumClose = document.getElementById('forumClose');
    const openNewPostBtn = document.getElementById('openNewPostBtn');
    const newPostModal = document.getElementById('newPostModal');
    const newPostClose = document.getElementById('newPostClose');
    const backBtn = document.getElementById('backToForumListBtn');
    const newPostForm = document.getElementById('newPostForm');
    const newCommentForm = document.getElementById('newCommentForm');
    const detailUpvoteBtn = document.getElementById('detailUpvoteBtn');

    if (!forumModal) return;

    if (openForumBtn) {
        openForumBtn.addEventListener('click', () => {
            forumModal.style.display = 'flex';
            document.getElementById('forumListView').style.display = 'block';
            document.getElementById('forumDetailView').style.display = 'none';
            loadForumPosts();
        });
    }

    const navMakePostBtn = document.getElementById('navMakePostBtn');
    if (navMakePostBtn) {
        navMakePostBtn.addEventListener('click', () => {
            if (newPostModal) {
                newPostModal.style.display = 'flex';
            } else if (openNewPostBtn) {
                openNewPostBtn.click();
            }
        });
    }

    if (forumClose) {
        forumClose.addEventListener('click', () => {
            forumModal.style.display = 'none';
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('forumDetailView').style.display = 'none';
            document.getElementById('forumListView').style.display = 'block';
            loadForumPosts();
        });
    }

    if (openNewPostBtn) {
        openNewPostBtn.addEventListener('click', () => {
            newPostModal.style.display = 'flex';
        });
    }

    if (newPostClose) {
        newPostClose.addEventListener('click', () => {
            newPostModal.style.display = 'none';
        });
    }

    if (newPostModal) {
        newPostModal.addEventListener('click', (e) => {
            if (e.target === newPostModal) newPostModal.style.display = 'none';
        });
    }

    // Category chips
    const chips = forumModal.querySelectorAll('.forum-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentForumCategory = chip.dataset.category;
            loadForumPosts();
        });
    });

    // Create New Post
    if (newPostForm) {
        newPostForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('postTitleInput').value.trim();
            const category = document.getElementById('postCategorySelect').value;
            const severity_tag = document.getElementById('postSeveritySelect').value;
            const author_name = document.getElementById('postAuthorInput').value.trim() || 'Citizen Reporter';
            const content = document.getElementById('postContentInput').value.trim();

            if (!title || !content) return;

            try {
                const res = await fetch(`${API_BASE}/api/forum/posts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, category, severity_tag, author_name, content }),
                });

                if (!res.ok) throw new Error('Failed to create post');
                const newPost = await res.json();

                newPostModal.style.display = 'none';
                newPostForm.reset();
                showToast('success', 'Discussion thread published!');
                openPostDetail(newPost.id);
            } catch (err) {
                console.error('Post error:', err);
                showToast('error', err.message || 'Failed to submit thread');
            }
        });
    }

    // Submit Comment
    if (newCommentForm) {
        newCommentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentActivePostId) return;

            const content = document.getElementById('commentContentInput').value.trim();
            const author_name = document.getElementById('commentAuthorInput').value.trim() || 'Community Member';

            if (!content) return;

            try {
                const res = await fetch(`${API_BASE}/api/forum/posts/${currentActivePostId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, author_name }),
                });

                if (!res.ok) throw new Error('Failed to post reply');
                const comment = await res.json();

                document.getElementById('commentContentInput').value = '';
                showToast('success', 'Reply posted!');

                // Append comment to list
                const commentsList = document.getElementById('detailCommentsList');
                const commentEl = document.createElement('div');
                commentEl.className = 'comment-card';
                commentEl.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${escapeHtml(comment.author_name)}</span>
                        <span class="comment-time">JUST NOW</span>
                    </div>
                    <div class="comment-text">${escapeHtml(comment.content)}</div>
                `;
                commentsList.appendChild(commentEl);

                // Update count
                const countEl = document.getElementById('detailCommentsCount');
                if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;

            } catch (err) {
                console.error('Comment error:', err);
                showToast('error', 'Failed to submit comment');
            }
        });
    }

    // Upvote
    if (detailUpvoteBtn) {
        detailUpvoteBtn.addEventListener('click', async () => {
            if (!currentActivePostId || detailUpvoteBtn.classList.contains('upvoted')) return;

            try {
                const res = await fetch(`${API_BASE}/api/forum/posts/${currentActivePostId}/upvote`, {
                    method: 'POST',
                });
                if (res.ok) {
                    const data = await res.json();
                    document.getElementById('detailUpvoteCount').textContent = data.upvotes;
                    detailUpvoteBtn.classList.add('upvoted');
                    showToast('success', 'Upvoted! Urgency raised for civic review.');
                }
            } catch (err) {
                console.error('Upvote error:', err);
            }
        });
    }
}

async function loadForumPosts() {
    const listEl = document.getElementById('forumPostsList');
    if (!listEl) return;

    try {
        const url = `${API_BASE}/api/forum/posts?category=${encodeURIComponent(currentForumCategory)}`;
        const res = await fetch(url);
        const data = await res.json();
        const posts = data.posts || [];

        // Update badge in navbar
        const badge = document.getElementById('forumCountBadge');
        if (badge) badge.textContent = `${posts.length} Posts`;

        if (posts.length === 0) {
            listEl.innerHTML = `
                <div class="reports-empty">
                    <p>No community threads found in this category.</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = posts.map(p => {
            const sev = (p.severity_tag || 'unverified').toLowerCase();
            const sevClass = getSevClass(sev);
            const time = p.created_at ? timeAgo(new Date(p.created_at + 'Z')) : 'RECENT';
            const catMap = {
                identification: '🔍 Identification',
                hazard: '⚠ Hazard Alert',
                resolved: '✓ Fix Verified',
                discussion: '💬 Civic Discussion',
            };
            const catName = catMap[p.category] || p.category;

            return `
                <div class="forum-card" onclick="openPostDetail('${p.id}')">
                    <div class="forum-card-header">
                        <div class="forum-badges">
                            <span class="forum-badge-cat">${catName}</span>
                            <span class="report-severity-tag ${sevClass}">${sev.toUpperCase()}</span>
                        </div>
                        <span class="forum-card-time tabular-nums">${time}</span>
                    </div>
                    <div class="forum-card-title">${escapeHtml(p.title)}</div>
                    <div class="forum-card-desc">${escapeHtml(p.content)}</div>
                    <div class="forum-card-footer">
                        <span class="forum-card-author">👤 ${escapeHtml(p.author_name)}</span>
                        <div class="forum-card-stats">
                            <span>▲ ${p.upvotes || 0}</span>
                            <span>💬 ${p.comments_count || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Failed to load forum posts:', err);
        listEl.innerHTML = `
            <div class="reports-empty">
                <p>Failed to load discussions</p>
            </div>
        `;
    }
}

async function openPostDetail(postId) {
    currentActivePostId = postId;
    const forumModal = document.getElementById('forumModal');
    if (forumModal) forumModal.style.display = 'flex';

    document.getElementById('forumListView').style.display = 'none';
    const detailView = document.getElementById('forumDetailView');
    detailView.style.display = 'block';

    const upvoteBtn = document.getElementById('detailUpvoteBtn');
    if (upvoteBtn) upvoteBtn.classList.remove('upvoted');

    try {
        const res = await fetch(`${API_BASE}/api/forum/posts/${postId}`);
        if (!res.ok) throw new Error('Post not found');
        const post = await res.json();

        document.getElementById('detailTitle').textContent = post.title;
        const time = post.created_at ? timeAgo(new Date(post.created_at + 'Z')) : 'RECENT';
        document.getElementById('detailMeta').textContent = `Posted by ${post.author_name} · ${time}`;
        document.getElementById('detailContent').textContent = post.content;
        document.getElementById('detailUpvoteCount').textContent = post.upvotes || 0;

        // Tags
        const tagsRow = document.getElementById('detailTagsRow');
        const sev = (post.severity_tag || 'unverified').toLowerCase();
        const sevClass = getSevClass(sev);
        tagsRow.innerHTML = `
            <span class="forum-badge-cat">${post.category.toUpperCase()}</span>
            <span class="report-severity-tag ${sevClass}">${sev.toUpperCase()}</span>
        `;

        // Comments
        const comments = post.comments || [];
        document.getElementById('detailCommentsCount').textContent = comments.length;
        const commentsList = document.getElementById('detailCommentsList');

        if (comments.length === 0) {
            commentsList.innerHTML = `<p style="font-size:0.72rem; color:var(--text-tertiary); padding: 8px 0;">No comments yet. Be the first to verify or respond!</p>`;
        } else {
            commentsList.innerHTML = comments.map(c => {
                const cTime = c.created_at ? timeAgo(new Date(c.created_at + 'Z')) : '';
                return `
                    <div class="comment-card">
                        <div class="comment-header">
                            <span class="comment-author">${escapeHtml(c.author_name)}</span>
                            <span class="comment-time tabular-nums">${cTime}</span>
                        </div>
                        <div class="comment-text">${escapeHtml(c.content)}</div>
                    </div>
                `;
            }).join('');
        }

    } catch (err) {
        console.error('Failed to open post detail:', err);
        showToast('error', 'Failed to load thread details');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

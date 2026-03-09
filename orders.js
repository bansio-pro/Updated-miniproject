/* ============================================
   BUILDEASY — Delivery Tracking Scripts
   Leaflet Map + Simulated GPS + Role Switching
   ============================================ */

/* -------- SIMULATED ROUTE (Chennai area) -------- */
const routeCoords = [
    [13.0827, 80.2707],  // Start: Warehouse (Egmore)
    [13.0775, 80.2620],
    [13.0720, 80.2560],
    [13.0680, 80.2510],
    [13.0640, 80.2460],
    [13.0580, 80.2400],
    [13.0520, 80.2350],
    [13.0478, 80.2310],
    [13.0440, 80.2268],
    [13.0405, 80.2350],
    [13.0380, 80.2410],
    [13.0355, 80.2425],
    [13.0340, 80.2440],  // Destination: T. Nagar
];

const destination = routeCoords[routeCoords.length - 1];
let currentStep = 0;
let map, truckMarker, routeLine, destMarker;
let refreshInterval;
let currentView = 'customer';

/* -------- LEAFLET MAP INIT -------- */
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    startTracking();
});

function initMap() {
    map = L.map('trackMap', {
        center: [13.0600, 80.2450],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
    }).addTo(map);

    // Zoom control bottom-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Route polyline
    routeLine = L.polyline(routeCoords, {
        color: '#f97316',
        weight: 4,
        opacity: 0.7,
        dashArray: '10 6',
    }).addTo(map);

    // Traveled portion polyline
    window.traveledLine = L.polyline([], {
        color: '#10b981',
        weight: 5,
        opacity: 0.9,
    }).addTo(map);

    // Destination marker
    const destIcon = L.divIcon({
        html: '<div style="font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));">📍</div>',
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
    });
    destMarker = L.marker(destination, { icon: destIcon }).addTo(map)
        .bindPopup('<b>Project Site</b><br>T. Nagar, Chennai');

    // Warehouse marker
    const warehouseIcon = L.divIcon({
        html: '<div style="font-size:24px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));">🏭</div>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
    });
    L.marker(routeCoords[0], { icon: warehouseIcon }).addTo(map)
        .bindPopup('<b>BuildEasy Warehouse</b><br>Egmore, Chennai');

    // Truck marker
    const truckIcon = L.divIcon({
        html: '<div style="font-size:30px;filter:drop-shadow(0 3px 8px rgba(249,115,22,0.5));transition:transform 0.8s ease;">🚛</div>',
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });
    truckMarker = L.marker(routeCoords[0], { icon: truckIcon, zIndexOffset: 1000 }).addTo(map);

    // Fit map to route
    map.fitBounds(routeLine.getBounds().pad(0.15));

    // Admin extra trucks (hidden by default)
    window.adminMarkers = [];
    const adminTrucks = [
        { pos: [13.0900, 80.2300], id: 'TN-01-CD-5678', driver: 'Arun' },
        { pos: [13.0300, 80.2600], id: 'TN-01-EF-9012', driver: 'Venkat' },
    ];
    adminTrucks.forEach(t => {
        const icon = L.divIcon({
            html: '<div style="font-size:24px;opacity:0.7;">🚛</div>',
            className: '', iconSize: [24, 24], iconAnchor: [12, 12],
        });
        const m = L.marker(t.pos, { icon })
            .bindPopup(`<b>${t.driver}</b><br>${t.id}`);
        window.adminMarkers.push(m);
    });
}

/* -------- GPS SIMULATION -------- */
function startTracking() {
    refreshInterval = setInterval(() => {
        if (currentStep < routeCoords.length - 1) {
            currentStep++;
            moveTruck(currentStep);
        } else {
            clearInterval(refreshInterval);
            markDelivered();
        }
    }, 5000);
}

function moveTruck(step) {
    const pos = routeCoords[step];
    truckMarker.setLatLng(pos);
    map.panTo(pos, { animate: true, duration: 0.8 });

    // Update traveled line
    const traveled = routeCoords.slice(0, step + 1);
    window.traveledLine.setLatLngs(traveled);

    // Update stats
    const remaining = routeCoords.length - 1 - step;
    const distKm = (remaining * 0.45).toFixed(1);
    const etaMin = Math.max(1, remaining * 1.5).toFixed(0);
    const speed = (25 + Math.random() * 20).toFixed(0);

    document.getElementById('statDist').textContent = distKm + ' km';
    document.getElementById('driverSpeed').textContent = speed;
    document.getElementById('driverDist').textContent = distKm;
    document.getElementById('driverEta').textContent = etaMin;
    document.getElementById('etaMin').textContent = `~${etaMin} min`;

    // Calculate ETA time
    const now = new Date();
    now.setMinutes(now.getMinutes() + parseInt(etaMin));
    const etaStr = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    document.getElementById('etaTime').textContent = etaStr;
    document.getElementById('aiEta').textContent = etaStr;

    // Update AI delay risk based on progress
    const delayEl = document.getElementById('aiDelay');
    if (remaining > 8) {
        delayEl.textContent = 'Medium';
        delayEl.className = 'ai-val medium';
    } else if (remaining > 3) {
        delayEl.textContent = 'Low';
        delayEl.className = 'ai-val low';
    } else {
        delayEl.textContent = 'Very Low';
        delayEl.className = 'ai-val low';
    }

    // Update timeline — move to "Arriving Soon" when close
    if (remaining <= 3 && remaining > 0) {
        const items = document.querySelectorAll('.tl-item');
        items[3].classList.remove('current');
        items[3].classList.add('done');
        items[3].querySelector('h5').textContent = '✓ Out for Delivery';
        items[4].classList.add('current');
    }
}

function markDelivered() {
    const items = document.querySelectorAll('.tl-item');
    items.forEach(i => { i.classList.remove('current'); i.classList.add('done'); });
    items[5].querySelector('h5').textContent = '✓ Delivered';
    items[5].querySelector('.tl-time').textContent = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    items[4].querySelector('h5').textContent = '✓ Arrived';

    document.getElementById('etaBadge').innerHTML = '✅ <strong>Delivered!</strong> &nbsp;•&nbsp; Order completed';
    document.getElementById('etaBadge').style.background = 'linear-gradient(135deg, #10b981, #059669)';
    showToast('📦 Delivery completed successfully!', 'success');
}

/* -------- ROLE VIEW SWITCH -------- */
function setView(view) {
    currentView = view;
    const btns = document.querySelectorAll('.topbar-center .view-btn');
    btns.forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    const customerActions = document.getElementById('customerActions');
    const adminActions = document.getElementById('adminActions');

    if (view === 'admin') {
        customerActions.style.display = 'none';
        adminActions.style.display = 'block';
        document.getElementById('statTrucks').textContent = '3';
        document.getElementById('statOrders').textContent = '8';
        // Show extra trucks on map
        window.adminMarkers.forEach(m => m.addTo(map));
        showToast('🛡️ Admin view activated — 3 trucks visible', 'info');
    } else {
        customerActions.style.display = 'block';
        adminActions.style.display = 'none';
        document.getElementById('statTrucks').textContent = '1';
        document.getElementById('statOrders').textContent = '3';
        // Remove extra trucks
        window.adminMarkers.forEach(m => m.remove());
        showToast('👤 Customer view activated', 'info');
    }
}

/* -------- ACTIONS -------- */
function callDriver() {
    showToast('📞 Calling Sundar Murugan...', 'info');
}

function shareTracking() {
    const url = window.location.href + '?track=ORD-2041';
    navigator.clipboard.writeText(url).then(() => {
        showToast('🔗 Tracking link copied to clipboard!', 'success');
    }).catch(() => {
        showToast('🔗 Link: ' + url, 'info');
    });
}

function cancelDelivery() {
    if (currentStep >= 3) {
        showToast('❌ Cannot cancel — order is already dispatched', 'error');
    } else {
        showToast('Order cancelled. Refund will be processed.', 'success');
    }
}

function updateStatus() {
    const statuses = ['Confirmed', 'Packed', 'Out for Delivery', 'Arriving Soon', 'Delivered'];
    const next = statuses[Math.min(currentStep + 1, statuses.length - 1)];
    showToast(`📋 Status updated → ${next}`, 'success');
}

function refreshLocation() {
    showToast('🔄 Refreshing GPS location...', 'info');
    if (currentStep < routeCoords.length - 1) {
        currentStep++;
        moveTruck(currentStep);
    }
}

/* -------- TOAST -------- */
function showToast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> ${msg}`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

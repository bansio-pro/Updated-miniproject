/* ============================================
   TRACK DELIVERY — Client-side JavaScript
   Fetches tracking data, renders UI, auto-refreshes
   ============================================ */

const API_BASE = 'http://localhost:5000/api';
const REFRESH_INTERVAL = 10000; // 10 seconds

// Status flow order for progress bar
const STATUS_FLOW = ['placed', 'assigned', 'out_for_delivery', 'delivered'];

// Human-readable status labels
const STATUS_LABELS = {
    pending: 'Pending',
    approved: 'Approved',
    placed: 'Order Placed',
    confirmed: 'Confirmed',
    assigned: 'Driver Assigned',
    packed: 'Packed',
    out_for_delivery: 'Out for Delivery',
    arriving: 'Arriving Soon',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
};

let currentOrderId = null;
let refreshTimer = null;

// ─── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    currentOrderId = params.get('orderId');

    if (!currentOrderId) {
        showError('No Order ID', 'Please provide an order ID via the URL, e.g. ?orderId=ORD-2041');
        return;
    }

    fetchTracking();

    // Start auto-refresh
    refreshTimer = setInterval(fetchTracking, REFRESH_INTERVAL);
});

// ─── FETCH TRACKING DATA ──────────────────────
async function fetchTracking() {
    const token = localStorage.getItem('token');
    if (!token) {
        showError('Login Required', 'Please log in to track your orders.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/orders/${currentOrderId}/tracking`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            showError('Tracking Error', data.message || 'Unable to fetch tracking data.');
            clearInterval(refreshTimer);
            return;
        }

        renderTracking(data.data);
    } catch (err) {
        console.error('[Tracking] Fetch error:', err);
        showError('Connection Error', 'Unable to connect to the server. Please try again.');
        clearInterval(refreshTimer);
    }
}

// ─── SHOW ERROR STATE ─────────────────────────
function showError(title, message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('trackingContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorMessage').textContent = message;
}

// ─── RENDER TRACKING DATA ─────────────────────
function renderTracking(data) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('trackingContent').style.display = 'block';

    // Header
    document.getElementById('trackOrderId').textContent = data.orderId;
    document.getElementById('trackDate').textContent = new Date(data.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    // Status badge
    const badge = document.getElementById('trackStatusBadge');
    badge.textContent = STATUS_LABELS[data.deliveryStatus] || data.deliveryStatus;
    badge.className = `status-badge ${data.deliveryStatus}`;

    // Progress steps
    renderProgressSteps(data.deliveryStatus);

    // Payment info
    renderPaymentInfo(data);

    // Driver info
    renderDriverInfo(data.driver);

    // Materials
    renderMaterials(data.materials, data.totalCost);

    // Delivery address
    document.getElementById('deliveryAddress').textContent = data.deliveryAddress || '—';

    // Map
    renderMap(data);

    // Timeline
    renderTimeline(data.statusHistory);
}

// ─── PAYMENT INFO ─────────────────────────────
function renderPaymentInfo(data) {
    const statusEl = document.getElementById('payOrderStatus');
    const methodEl = document.getElementById('payMethod');
    const badgeEl = document.getElementById('payStatusBadge');

    if (statusEl) statusEl.textContent = STATUS_LABELS[data.deliveryStatus] || data.deliveryStatus;
    if (methodEl) methodEl.textContent = data.paymentMethod || 'Cash on Delivery';

    if (badgeEl) {
        const isPaid = data.paymentStatus === 'Paid' || data.paymentStatus === 'paid';
        badgeEl.textContent = isPaid ? 'Paid' : 'Unpaid';
        badgeEl.style.background = isPaid ? '#059669' : '#dc2626';
        badgeEl.style.color = '#fff';
    }
}

// ─── PROGRESS STEPS ───────────────────────────
function renderProgressSteps(currentStatus) {
    const steps = document.querySelectorAll('.step');
    const lines = document.querySelectorAll('.step-line');

    // Map some statuses to flow steps
    let effectiveStatus = currentStatus;
    if (['pending', 'approved', 'confirmed', 'packed'].includes(currentStatus)) {
        effectiveStatus = 'placed'; // not yet assigned
    }
    if (currentStatus === 'arriving') {
        effectiveStatus = 'out_for_delivery';
    }

    const currentIndex = STATUS_FLOW.indexOf(effectiveStatus);

    steps.forEach((step, i) => {
        step.classList.remove('completed', 'active');
        const stepStatus = step.dataset.step;
        const stepIndex = STATUS_FLOW.indexOf(stepStatus);

        if (stepIndex < currentIndex) {
            step.classList.add('completed');
        } else if (stepIndex === currentIndex) {
            step.classList.add(currentStatus === 'delivered' ? 'completed' : 'active');
        }
    });

    lines.forEach((line, i) => {
        line.classList.remove('completed');
        if (i < currentIndex) {
            line.classList.add('completed');
        }
    });
}

// ─── DRIVER INFO ──────────────────────────────
function renderDriverInfo(driver) {
    const driverCard = document.getElementById('driverCard');
    const noDriverCard = document.getElementById('noDriverCard');

    if (!driver) {
        driverCard.style.display = 'none';
        noDriverCard.style.display = 'block';
        return;
    }

    driverCard.style.display = 'block';
    noDriverCard.style.display = 'none';

    // Avatar initials
    const initials = driver.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('driverAvatar').textContent = initials;
    document.getElementById('driverName').textContent = driver.name;
    document.getElementById('driverVehicle').textContent = driver.vehicleNumber;
    document.getElementById('driverPhone').textContent = driver.phone;
    document.getElementById('driverPhoneLink').href = `tel:${driver.phone}`;

    const statusBadge = document.getElementById('driverStatusBadge');
    statusBadge.textContent = driver.status;
    statusBadge.className = `driver-status-badge ${driver.status.toLowerCase()}`;
}

// ─── MATERIALS ────────────────────────────────
function renderMaterials(materials, totalCost) {
    const list = document.getElementById('materialsList');

    if (!materials || materials.length === 0) {
        list.innerHTML = '<p style="color:var(--grey-400);font-size:13px;">No materials data.</p>';
        return;
    }

    list.innerHTML = materials.map(m => `
        <div class="mat-item">
            <span class="mat-item-name">${m.name}</span>
            <span class="mat-item-qty">${m.qty}</span>
            <span class="mat-item-price">₹${(m.price || 0).toLocaleString('en-IN')}</span>
        </div>
    `).join('');

    document.getElementById('totalCost').textContent = `₹${(totalCost || 0).toLocaleString('en-IN')}`;
}

// ─── MAP ──────────────────────────────────────
function renderMap(data) {
    const mapCard = document.getElementById('mapCard');
    let lat = null, lng = null;

    // Prefer driver's current location, fallback to order deliveryLocation
    if (data.driver && data.driver.currentLocation) {
        lat = data.driver.currentLocation.latitude;
        lng = data.driver.currentLocation.longitude;
    } else if (data.deliveryLocation && data.deliveryLocation.latitude) {
        lat = data.deliveryLocation.latitude;
        lng = data.deliveryLocation.longitude;
    }

    if (lat && lng) {
        mapCard.style.display = 'block';
        document.getElementById('locLat').textContent = lat.toFixed(6);
        document.getElementById('locLng').textContent = lng.toFixed(6);

        // OpenStreetMap embed (no API key required)
        const iframe = document.getElementById('mapIframe');
        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
        iframe.src = mapUrl;
    } else {
        mapCard.style.display = 'none';
    }
}

// ─── STATUS TIMELINE ──────────────────────────
function renderTimeline(history) {
    const container = document.getElementById('statusTimeline');

    if (!history || history.length === 0) {
        container.innerHTML = '<p style="color:var(--grey-400);font-size:13px;">No status history.</p>';
        return;
    }

    // Show newest first
    const sorted = [...history].reverse();

    container.innerHTML = sorted.map((entry, i) => {
        const isLatest = i === 0;
        const isDelivered = entry.status === 'delivered';
        const dateStr = new Date(entry.time).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

        return `
            <div class="timeline-item ${isLatest ? 'latest' : ''} ${isDelivered ? 'delivered' : ''}">
                <div class="timeline-dot"></div>
                <div class="timeline-status">${STATUS_LABELS[entry.status] || entry.status}</div>
                <div class="timeline-time">${dateStr}</div>
            </div>
        `;
    }).join('');
}

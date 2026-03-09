/* ============================================
   BUILDEASY — My Orders Dashboard Scripts
   Connected to Express Backend API
   ============================================ */

/* -------- CONFIGURATION -------- */
const API_BASE = 'http://localhost:5000/api';

/* -------- AUTH HELPERS -------- */

/**
 * Retrieve JWT token from localStorage.
 * If not found, redirect to login page.
 */
function getToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Session expired. Redirecting to login...', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        return null;
    }
    return token;
}

/**
 * Build Authorization headers for all API requests.
 */
function authHeaders() {
    const token = getToken();
    if (!token) return null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

/**
 * Handle API error responses (401 → login redirect, 403 → permission error).
 */
function handleApiError(res) {
    if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        showToast('Session expired. Redirecting to login...', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        return true;
    }
    if (res.status === 403) {
        showToast('Not authorized to perform this action.', 'error');
        return true;
    }
    return false;
}

/* -------- STATUS DISPLAY MAPS -------- */
const statusLabels = {
    // New status labels
    'Pending Company Approval': '⏳ Pending Approval',
    'Approved by Company': '✅ Approved',
    'Rejected by Company': '❌ Rejected',
    'Driver Assigned': '🚛 Driver Assigned',
    'Out for Delivery': '📦 Out for Delivery',
    'Delivered': '✅ Delivered',
    'Cancelled': '❌ Cancelled',
    // Legacy labels
    pending: 'Pending',
    approved: 'Approved',
    placed: '⏳ Placed',
    confirmed: '✅ Confirmed',
    assigned: '🚛 Assigned',
    packed: '📦 Packed',
    out_for_delivery: '📦 Out for Delivery',
    arriving: '🏠 Arriving',
    delivered: '✅ Delivered',
    cancelled: '❌ Cancelled',
    'Placed': '⏳ Placed',
    'Confirmed': '✅ Confirmed',
    'Processing': '🔄 Processing',
    'Ready': '📦 Ready',
};

const statusProgress = {
    // New status labels
    'Pending Company Approval': 10,
    'Approved by Company': 25,
    'Rejected by Company': 0,
    'Driver Assigned': 50,
    'Out for Delivery': 75,
    'Delivered': 100,
    'Cancelled': 0,
    // Legacy
    pending: 5, approved: 10, placed: 10, confirmed: 25,
    assigned: 35, packed: 50, out_for_delivery: 75,
    arriving: 90, delivered: 100, cancelled: 0,
    'Placed': 10, 'Confirmed': 25, 'Processing': 30, 'Ready': 50,
};

const paymentLabels = {
    Unpaid: '⏳ Unpaid',
    Paid: '✓ Paid',
    paid: '✓ Paid',
    pending: '⏳ Unpaid',
    refunded: '↩ Refunded',
};

/* Material icon mapping */
function getMaterialIcon(name) {
    const n = name.toLowerCase();
    if (n.includes('cement')) return '🧱';
    if (n.includes('sand')) return '🏖️';
    if (n.includes('steel') || n.includes('tmt') || n.includes('wire')) return '🔩';
    if (n.includes('brick') || n.includes('block')) return '🧱';
    if (n.includes('wood') || n.includes('plywood') || n.includes('teak')) return '🪵';
    if (n.includes('paint') || n.includes('primer')) return '🎨';
    return '📦';
}

/* -------- STATE -------- */
let ordersData = [];

/* -------- INITIALIZATION -------- */
document.addEventListener('DOMContentLoaded', () => {
    // Check auth before anything
    if (!getToken()) return;
    loadOrders();
});

/* -------- LOAD ORDERS FROM API -------- */

/**
 * Fetch all orders for the logged-in user from GET /api/orders.
 * Handles loading, empty, and error states.
 */
async function loadOrders() {
    const headers = authHeaders();
    if (!headers) return;

    const tbody = document.getElementById('ordersBody');
    const tableWrap = document.getElementById('ordersTableWrap');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');

    // Show loading state
    if (loadingState) loadingState.style.display = 'block';
    if (tableWrap) tableWrap.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE}/orders`, { method: 'GET', headers });

        // Handle auth errors
        if (handleApiError(res)) return;

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to fetch orders');
        }

        const result = await res.json();
        ordersData = result.data || [];

        // Hide loading
        if (loadingState) loadingState.style.display = 'none';

        if (ordersData.length === 0) {
            tableWrap.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            renderOrders();
            updateStats();
            tableWrap.style.display = 'block';
            emptyState.style.display = 'none';
        }
    } catch (error) {
        console.error('Load orders error:', error);
        if (loadingState) loadingState.style.display = 'none';
        showToast(`Failed to load orders: ${error.message}`, 'error');

        // Show empty state with error message
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
    }
}

/* -------- RENDER ORDERS TABLE -------- */

/**
 * Build the HTML table rows from the ordersData array.
 * Uses data-label attributes for responsive card layout.
 */
function renderOrders() {
    const tbody = document.getElementById('ordersBody');
    if (!tbody) return;

    tbody.innerHTML = ordersData.map(order => {
        // Determine if cancellation is allowed
        const nonCancelable = ['Out for Delivery', 'Driver Assigned', 'Arriving', 'Delivered', 'Cancelled', 'Rejected by Company', 'out_for_delivery', 'arriving', 'delivered', 'cancelled'];
        const canCancel = !nonCancelable.includes(order.deliveryStatus);

        // Driver display
        const driverName = order.driver?.name || 'Pending';
        const driverInitials = driverName !== 'Pending'
            ? driverName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
            : '—';

        // Format cost
        const cost = (order.totalCost || 0).toLocaleString('en-IN');

        return `
            <tr>
                <td data-label="Order ID">
                    <span class="order-id">#${order.orderId}</span>
                </td>
                <td data-label="Location">
                    <div class="location-cell">
                        <div class="loc-icon">📍</div>
                        <span class="loc-text">${order.projectLocation}</span>
                    </div>
                </td>
                <td data-label="Total Cost">
                    <span class="cost-cell">₹${cost}</span>
                </td>
                <td data-label="Payment">
                    <span class="badge badge-${order.paymentStatus}">${paymentLabels[order.paymentStatus] || order.paymentStatus}</span>
                </td>
                <td data-label="Delivery">
                    <span class="badge badge-${order.deliveryStatus}">${statusLabels[order.deliveryStatus] || order.deliveryStatus}</span>
                </td>
                <td data-label="Driver">
                    <div class="driver-cell">
                        <div class="driver-avatar">${driverInitials}</div>
                        <span class="driver-name">${driverName}</span>
                    </div>
                </td>
                <td data-label="Actions">
                    <div class="actions-cell">
                        <button class="btn-view" onclick="openOrderModal('${order.orderId}')">👁 View</button>
                        <button class="btn-view" onclick="window.location.href='track-delivery.html?orderId=${order.orderId}'" style="background:linear-gradient(135deg,#3b82f6,#2563eb);" title="Track Delivery">📍 Track</button>
                        <button class="btn-cancel" onclick="cancelOrder('${order.orderId}')" ${canCancel ? '' : 'disabled'}>✕ Cancel</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Update the stats counters in the page header.
 */
function updateStats() {
    const total = ordersData.length;
    const active = ordersData.filter(o => !['delivered', 'cancelled'].includes(o.deliveryStatus)).length;
    const delivered = ordersData.filter(o => o.deliveryStatus === 'delivered').length;

    const statTotal = document.getElementById('statTotal');
    const statActive = document.getElementById('statActive');
    const statDelivered = document.getElementById('statDelivered');

    if (statTotal) statTotal.textContent = total;
    if (statActive) statActive.textContent = active;
    if (statDelivered) statDelivered.textContent = delivered;
}

/* -------- OPEN ORDER MODAL -------- */

/**
 * Fetch full order details from GET /api/orders/:id
 * and show them in a modal with materials, timeline, and progress bar.
 */
async function openOrderModal(orderId) {
    const headers = authHeaders();
    if (!headers) return;

    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}`, { method: 'GET', headers });

        if (handleApiError(res)) return;

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to load order details');
        }

        const result = await res.json();
        const order = result.data;
        if (!order) throw new Error('Order data is empty');

        populateModal(order);
        document.getElementById('modalOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('View order error:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

/**
 * Populate the modal DOM with order data.
 */
function populateModal(order) {
    // Header
    document.getElementById('modalOrderId').textContent = '#' + order.orderId;

    // Format dates
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
    });

    // Driver display
    const driverName = order.driver?.name || 'Not Assigned';

    // Info grid
    document.getElementById('modalInfoGrid').innerHTML = `
        <div class="modal-info-item">
            <div class="info-label">Order Date</div>
            <div class="info-value">${orderDate}</div>
        </div>
        <div class="modal-info-item">
            <div class="info-label">Customer</div>
            <div class="info-value">${order.customerName || order.customer?.name || '—'}</div>
        </div>
        <div class="modal-info-item">
            <div class="info-label">Project Location</div>
            <div class="info-value">${order.projectLocation}</div>
        </div>
        <div class="modal-info-item">
            <div class="info-label">Total Cost</div>
            <div class="info-value highlight">₹${(order.totalCost || 0).toLocaleString('en-IN')}</div>
        </div>
        <div class="modal-info-item">
            <div class="info-label">Payment Status</div>
            <div class="info-value"><span class="badge badge-${order.paymentStatus}">${paymentLabels[order.paymentStatus] || order.paymentStatus}</span></div>
        </div>
        <div class="modal-info-item">
            <div class="info-label">Driver Assigned</div>
            <div class="info-value">${driverName}</div>
        </div>
    `;

    // Materials list
    document.getElementById('modalMaterials').innerHTML = (order.materials || []).map(m => `
        <div class="modal-mat-item">
            <div class="mat-info">
                <div class="mat-icon">${getMaterialIcon(m.name)}</div>
                <div>
                    <div class="mat-name">${m.name}</div>
                    <div class="mat-qty">${m.qty}</div>
                </div>
            </div>
            <div class="mat-price">₹${(m.price || 0).toLocaleString('en-IN')}</div>
        </div>
    `).join('');

    // Progress bar
    const progress = statusProgress[order.deliveryStatus] || 0;
    document.getElementById('modalProgress').style.width = progress + '%';
    document.getElementById('modalDeliveryLabel').innerHTML =
        `🚚 Delivery Progress — <strong>${statusLabels[order.deliveryStatus] || order.deliveryStatus}</strong> (${progress}%)`;

    // Status timeline
    const timeline = order.statusHistory || [];
    document.getElementById('modalTimeline').innerHTML = timeline.map((step, i) => {
        const isLast = i === timeline.length - 1;
        const isCurrent = isLast && !['delivered', 'cancelled'].includes(step.status);
        const cls = isCurrent ? 'current' : 'done';
        const icon = isCurrent ? '● ' : '✓ ';
        const timeStr = new Date(step.time).toLocaleString('en-IN', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
        });
        return `
            <div class="mtl-item ${cls}">
                <div class="mtl-dot"></div>
                <h5>${icon}${statusLabels[step.status] || step.status}</h5>
                <div class="mtl-time">${timeStr}</div>
            </div>
        `;
    }).join('');
}

/**
 * Close the order details modal.
 */
function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') closeModal();
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

/* -------- CANCEL ORDER -------- */

/**
 * Cancel an order via DELETE /api/orders/:id.
 * Shows confirmation dialog first.
 * Refreshes the orders list on success.
 */
async function cancelOrder(orderId) {
    if (!confirm(`Are you sure you want to cancel order #${orderId}?`)) return;

    const headers = authHeaders();
    if (!headers) return;

    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}`, {
            method: 'DELETE',
            headers,
        });

        if (handleApiError(res)) return;

        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.message || 'Failed to cancel order');
        }

        showToast(result.message || `Order #${orderId} cancelled successfully.`, 'success');

        // Refresh the orders list from API
        await loadOrders();
    } catch (error) {
        console.error('Cancel order error:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

/* -------- TOAST NOTIFICATIONS -------- */

/**
 * Display a temporary toast notification.
 * @param {string} msg - Message to display
 * @param {'success'|'error'|'info'} type - Toast style
 */
function showToast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span> ${msg}`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

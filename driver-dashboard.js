/* ============================================
   BUILDEASY DRIVER DASHBOARD — JavaScript
   API-Connected SPA for Driver Portal
   ============================================ */

const API = 'http://localhost:5000/api';
const TOKEN = localStorage.getItem('token');
const USER = JSON.parse(localStorage.getItem('user') || '{}');

/* ─── Auth Guard ─── */
if (!TOKEN || !USER || localStorage.getItem('role') !== 'driver') {
    window.location.href = 'login.html';
}

/* ─── API Helper ─── */
async function api(path, opts = {}) {
    const res = await fetch(`${API}${path}`, {
        ...opts,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}`, ...opts.headers },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

/* ─── Toast ─── */
function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${msg}`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

/* ─── Format ─── */
function rupees(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function shortRupees(n) {
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return rupees(n);
}

/* ─── Set Driver Info ─── */
const driverName = USER.name || 'Driver';
const initials = driverName.slice(0, 2).toUpperCase();
document.getElementById('sidebarDriverName').textContent = driverName;
document.getElementById('sidebarCompanyName').textContent = USER.companyName || 'Company';
document.getElementById('topbarDriverName').textContent = driverName;
document.getElementById('sidebarAvatar').textContent = initials;
document.getElementById('topbarAvatar').textContent = initials;

/* ═══════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════ */
const navItems = document.querySelectorAll('.nav-item[data-page]');
const pages = document.querySelectorAll('.dd-page');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const pageId = item.dataset.page;
        if (!pageId) return;
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        pages.forEach(p => p.classList.remove('active'));
        const target = document.getElementById(pageId);
        if (target) target.classList.add('active');

        const label = item.querySelector('.label')?.textContent || 'Dashboard';
        const pt = document.querySelector('.page-title');
        const bc = document.querySelector('.breadcrumb');
        if (pt) pt.textContent = label;
        if (bc) bc.textContent = `Driver / ${label}`;

        if (pageId === 'page-dashboard') loadDashboard();
        if (pageId === 'page-deliveries') loadDeliveries();
        if (pageId === 'page-history') loadHistory();
        if (pageId === 'page-profile') loadProfile();

        document.getElementById('ddSidebar')?.classList.remove('open');
    });
});

document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('ddSidebar')?.classList.toggle('open');
});

document.getElementById('btnLogout')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = 'login.html';
});

/* ═══════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════ */
async function loadDashboard() {
    try {
        const { data } = await api('/drivers/dashboard');
        document.getElementById('statAssigned').textContent = data.assignedOrders || 0;
        document.getElementById('statOutForDelivery').textContent = data.outForDelivery || 0;
        document.getElementById('statCompleted').textContent = data.completedDeliveries || 0;
        document.getElementById('statCollected').textContent = shortRupees(data.totalCollected || 0);
        document.getElementById('deliveryBadge').textContent = (data.assignedOrders || 0) + (data.outForDelivery || 0);

        // Load active deliveries on dashboard
        loadActiveDeliveries();
    } catch (e) {
        showToast('Failed to load dashboard: ' + e.message, 'error');
    }
}

async function loadActiveDeliveries() {
    try {
        const { data } = await api('/drivers/my-orders');
        const container = document.getElementById('activeDeliveriesList');
        if (!container) return;

        const active = data.filter(o => ['Driver Assigned', 'Assigned', 'Ready', 'Out for Delivery'].includes(o.deliveryStatus));

        if (active.length === 0) {
            container.innerHTML = '<p class="empty-state">🎉 No active deliveries. Check back later!</p>';
            return;
        }

        container.innerHTML = active.map(o => {
            const materialsStr = o.materials.map(m => `${m.name} (${m.qty})`).join(', ');
            let actions = '';

            if (['Driver Assigned', 'Assigned', 'Ready'].includes(o.deliveryStatus)) {
                actions = `<button class="action-btn start-delivery" onclick="updateDeliveryStatus('${o._id}', 'Out for Delivery')">🚚 Start Delivery</button>`;
            } else if (o.deliveryStatus === 'Out for Delivery') {
                actions = `<button class="action-btn mark-delivered" onclick="updateDeliveryStatus('${o._id}', 'Delivered')">✅ Mark Delivered</button>`;
            }

            if (o.customer?.phone) {
                actions += ` <a href="tel:${o.customer.phone}" class="action-btn call">📞 Call</a>`;
            }

            return `
            <div class="delivery-card">
                <div class="delivery-card-info">
                    <h4>#${o.orderId || o._id.slice(-6)} — ${o.customerName || o.customer?.name || 'Customer'}</h4>
                    <p>📍 ${o.deliveryAddress || 'N/A'}</p>
                    <p>📦 ${materialsStr} • ${rupees(o.totalCost || 0)}</p>
                    <p><span class="status-badge ${o.deliveryStatus}">${o.deliveryStatus}</span>
                       <span class="payment-badge ${o.paymentStatus}">${o.paymentStatus || 'Unpaid'}</span></p>
                </div>
                <div class="delivery-card-actions">${actions}</div>
            </div>`;
        }).join('');
    } catch (e) {
        console.error('Active deliveries error:', e);
    }
}

/* ═══════════════════════════════════════════
   MY DELIVERIES (Full Table)
   ═══════════════════════════════════════════ */
async function loadDeliveries() {
    try {
        const { data } = await api('/drivers/my-orders');
        const tbody = document.getElementById('deliveriesTableBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No orders assigned yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(o => {
            const materialsStr = o.materials.map(m => `${m.name} (${m.qty})`).join(', ');
            let actions = '';

            if (['Driver Assigned', 'Assigned', 'Ready'].includes(o.deliveryStatus)) {
                actions += `<button class="action-btn start-delivery" onclick="updateDeliveryStatus('${o._id}', 'Out for Delivery')">🚚 Start</button>`;
            } else if (o.deliveryStatus === 'Out for Delivery') {
                actions += `<button class="action-btn mark-delivered" onclick="updateDeliveryStatus('${o._id}', 'Delivered')">✅ Delivered</button>`;
            }

            if (o.deliveryStatus === 'Delivered' && o.paymentStatus !== 'Paid') {
                actions += ` <button class="action-btn mark-paid" onclick="updatePaymentStatus('${o._id}')">💰 Confirm Payment</button>`;
            }

            if (o.customer?.phone) {
                actions += ` <a href="tel:${o.customer.phone}" class="action-btn call">📞</a>`;
            }

            if (o.deliveryStatus === 'Delivered' && o.paymentStatus === 'Paid') {
                actions = '<span style="color:var(--accent-green);font-size:11px;font-weight:600;">✅ Complete</span>';
            }

            return `
            <tr>
                <td><strong>#${o.orderId || o._id.slice(-6)}</strong></td>
                <td>${o.customerName || o.customer?.name || '—'}<br><span style="font-size:11px;color:var(--text-muted);">${o.customer?.phone || ''}</span></td>
                <td style="max-width:160px;font-size:12px;">${o.deliveryAddress || '—'}</td>
                <td style="font-size:12px;">${materialsStr}</td>
                <td>${rupees(o.totalCost || 0)}</td>
                <td><span class="status-badge ${o.deliveryStatus}">${o.deliveryStatus}</span></td>
                <td><span class="payment-badge ${o.paymentStatus || 'Unpaid'}">${o.paymentStatus || 'Unpaid'}</span></td>
                <td><div class="action-btns">${actions}</div></td>
            </tr>`;
        }).join('');
    } catch (e) {
        showToast('Failed to load deliveries: ' + e.message, 'error');
    }
}

/* ═══════════════════════════════════════════
   STATUS UPDATE FUNCTIONS
   ═══════════════════════════════════════════ */
window.updateDeliveryStatus = async function (orderId, status) {
    try {
        await api(`/drivers/orders/${orderId}/delivery-status`, {
            method: 'PATCH',
            body: { status },
        });
        showToast(`Delivery status → ${status}`);
        loadDashboard();
        loadDeliveries();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

window.updatePaymentStatus = async function (orderId) {
    if (!confirm('Confirm you have collected the cash payment?')) return;
    try {
        await api(`/drivers/orders/${orderId}/payment-status`, {
            method: 'PATCH',
        });
        showToast('Payment confirmed as Paid! 💰');
        loadDashboard();
        loadDeliveries();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

/* ═══════════════════════════════════════════
   HISTORY
   ═══════════════════════════════════════════ */
async function loadHistory() {
    try {
        const { data } = await api('/drivers/history');
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No completed deliveries yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(o => {
            const materialsStr = o.materials.map(m => `${m.name} (${m.qty})`).join(', ');
            const deliveredDate = o.updatedAt
                ? new Date(o.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—';

            return `
            <tr>
                <td><strong>#${o.orderId || o._id.slice(-6)}</strong></td>
                <td>${o.customerName || o.customer?.name || '—'}</td>
                <td style="font-size:12px;">${materialsStr}</td>
                <td>${rupees(o.totalCost || 0)}</td>
                <td><span class="payment-badge ${o.paymentStatus || 'Unpaid'}">${o.paymentStatus || 'Unpaid'}</span></td>
                <td style="font-size:12px;color:var(--text-muted);">${deliveredDate}</td>
            </tr>`;
        }).join('');
    } catch (e) {
        showToast('Failed to load history: ' + e.message, 'error');
    }
}

/* ═══════════════════════════════════════════
   PROFILE
   ═══════════════════════════════════════════ */
async function loadProfile() {
    try {
        const { data } = await api('/drivers/profile');
        document.getElementById('profileAvatar').textContent = (data.name || 'DR').slice(0, 2).toUpperCase();
        document.getElementById('profileName').textContent = data.name || '—';
        document.getElementById('profileEmail').textContent = data.email || '—';
        document.getElementById('profilePhone').textContent = data.phone || '—';
        document.getElementById('profileLicense').textContent = data.licenseNumber || '—';
        document.getElementById('profileVehicle').textContent = `${data.vehicle || '—'} (${data.vehicleType || 'Truck'})`;
        document.getElementById('profileCompany').textContent = data.company?.name || '—';
        document.getElementById('profileApproval').innerHTML = data.approvalStatus === 'Approved'
            ? '<span style="color:#10b981;font-weight:600;">✅ Approved</span>'
            : `<span style="color:#facc15;font-weight:600;">⏳ ${data.approvalStatus || 'Pending'}</span>`;
        document.getElementById('profileJoined').textContent = data.createdAt
            ? new Date(data.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
            : '—';
    } catch (e) {
        showToast('Failed to load profile: ' + e.message, 'error');
    }
}

/* ─── Init ─── */
loadDashboard();

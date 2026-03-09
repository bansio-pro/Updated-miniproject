/* ============================================
   BUILDEASY ADMIN — JavaScript
   API-Connected Dynamic Dashboard
   ============================================ */

const API = 'http://localhost:5000/api';
const TOKEN = localStorage.getItem('token');
const USER = JSON.parse(localStorage.getItem('user') || '{}');

/* ─── Auth Guard ─── */
if (!TOKEN || !USER || USER.role !== 'admin') {
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
    const c = document.querySelector('.toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${msg}`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

/* ─── Format Currency ─── */
function rupees(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function shortRupees(n) {
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return rupees(n);
}

/* ═══════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════ */
const navItems = document.querySelectorAll('.nav-item[data-page]');
const pages = document.querySelectorAll('.admin-page');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const pageId = item.dataset.page;
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        pages.forEach(p => p.classList.remove('active'));
        const target = document.getElementById(pageId);
        if (target) target.classList.add('active');

        // Update topbar
        const label = item.querySelector('.label')?.textContent || 'Dashboard';
        const pt = document.querySelector('.page-title');
        const bc = document.querySelector('.breadcrumb');
        if (pt) pt.textContent = label;
        if (bc) bc.textContent = `Admin / ${label}`;

        // Lazy-load data
        if (pageId === 'page-dashboard') loadDashboard();
        if (pageId === 'page-orders') loadOrders();
        if (pageId === 'page-users') loadUsers();
        if (pageId === 'page-inventory') loadMaterials();
        if (pageId === 'page-drivers') loadDrivers();
        if (pageId === 'page-companies') loadCompanies();
        if (pageId === 'page-analytics') loadAnalytics();
        if (pageId === 'page-reports') loadReports();

        // Close mobile sidebar
        document.getElementById('adminSidebar')?.classList.remove('open');
    });
});

// Mobile menu toggle
document.querySelector('.menu-toggle')?.addEventListener('click', () => {
    document.getElementById('adminSidebar')?.classList.toggle('open');
});

// Logout
document.querySelector('.btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = 'login.html';
});

// Toggle buttons
document.querySelectorAll('.toggle').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('active'));
});

// Set admin name in sidebar & topbar
const sidebarName = document.querySelector('.sidebar-footer h4');
const topbarName = document.querySelector('.topbar-profile .name');
if (sidebarName && USER.name) sidebarName.textContent = USER.name;
if (topbarName && USER.name) topbarName.textContent = USER.name;

/* ═══════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════ */
let dashboardLoaded = false;
async function loadDashboard() {
    if (dashboardLoaded) return;
    try {
        const { data } = await api('/admin/dashboard');
        const cards = document.querySelectorAll('#page-dashboard .summary-card h3');
        if (cards[0]) cards[0].textContent = data.totalOrders.toLocaleString();
        if (cards[1]) cards[1].textContent = data.activeDeliveries;
        if (cards[2]) cards[2].textContent = data.totalUsers || data.totalCustomers;
        if (cards[3]) cards[3].textContent = shortRupees(data.totalRevenue);
        if (cards[4]) cards[4].textContent = data.lowStockAlerts;
        if (cards[5]) cards[5].textContent = data.pendingApprovals;
        if (cards[6]) cards[6].textContent = data.totalCompanies || 0;
        if (cards[7]) cards[7].textContent = data.pendingCompanies || 0;

        // Load recent orders for dashboard
        const { data: orders } = await api('/admin/orders');
        renderRecentOrders(orders.slice(0, 6));

        // Load low stock alerts
        const { data: materials } = await api('/admin/materials');
        renderLowStock(materials.filter(m => m.stock <= m.lowStockThreshold));

        // Initialize charts
        initDashboardCharts(data);

        dashboardLoaded = true;
    } catch (e) {
        console.error('Dashboard load error:', e);
        showToast('Failed to load dashboard: ' + e.message, 'error');
    }
}

function renderRecentOrders(orders) {
    const tbody = document.querySelector('#page-dashboard .table-card tbody');
    if (!tbody) return;
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>#${o.orderId}</td>
            <td>${o.customerName || 'Unknown'}</td>
            <td>${o.materials?.[0]?.name || '—'} ${o.materials?.length > 1 ? `+${o.materials.length - 1}` : ''}</td>
            <td>${new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
            <td><span class="status-badge ${o.deliveryStatus}">${o.deliveryStatus.replace(/_/g, ' ')}</span></td>
        </tr>
    `).join('');
}

function renderLowStock(items) {
    const cont = document.querySelector('#page-dashboard .alerts-card');
    if (!cont) return;
    const h4 = cont.querySelector('h4');
    cont.innerHTML = '';
    if (h4) cont.appendChild(h4);
    if (items.length === 0) {
        cont.innerHTML += '<div class="empty-state"><p>No low stock alerts 🎉</p></div>';
        return;
    }
    items.forEach(m => {
        const level = m.stock <= m.lowStockThreshold * 0.3 ? 'critical' : 'low';
        cont.innerHTML += `
            <div class="alert-item">
                <div class="alert-info"><h5>${m.name}</h5><p>${m.category}</p></div>
                <div class="alert-qty ${level}">${m.stock} ${m.unit || 'units'}</div>
            </div>`;
    });
}

function initDashboardCharts(data) {
    // Orders chart — line
    const oc = document.getElementById('ordersChart');
    if (oc && !oc._done) {
        oc._done = true;
        new Chart(oc, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Orders',
                    data: [45, data.totalOrders || 60, 55, 70, 65, 80],
                    borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)',
                    fill: true, tension: 0.4, pointRadius: 4,
                    pointBackgroundColor: '#f97316', borderWidth: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } }
                }
            }
        });
    }

    // Demand pie chart
    const dc = document.getElementById('demandChart');
    if (dc && !dc._done) {
        dc._done = true;
        new Chart(dc, {
            type: 'doughnut',
            data: {
                labels: ['Cement', 'Steel', 'Sand', 'Bricks', 'Paint', 'Other'],
                datasets: [{
                    data: [32, 24, 18, 14, 7, 5],
                    backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#fbbf24', '#8b5cf6', '#64748b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '65%',
                plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12 } } }
            }
        });
    }
}

/* ═══════════════════════════════════════════
   ORDERS MANAGEMENT
   ═══════════════════════════════════════════ */
let allOrders = [];
let orderFilter = 'all';

async function loadOrders() {
    try {
        const { data } = await api('/admin/orders');
        allOrders = data;
        renderOrders(data);
    } catch (e) {
        showToast('Failed to load orders: ' + e.message, 'error');
    }
}

function renderOrders(orders) {
    const tbody = document.querySelector('#page-orders .table-card tbody');
    if (!tbody) return;

    const filtered = orderFilter === 'all' ? orders : orders.filter(o => o.deliveryStatus === orderFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#64748b;">No orders found</td></tr>';
        return;
    }

    const assignableStatuses = ['placed', 'confirmed', 'approved', 'pending'];

    tbody.innerHTML = filtered.map(o => {
        const isAssignable = assignableStatuses.includes(o.deliveryStatus) && !o.assignedDriver;
        const driverName = o.assignedDriver?.name || null;
        const driverDisplay = driverName
            ? `<span style="font-size:12px;font-weight:600;">🚛 ${driverName}</span>`
            : `<span style="font-size:12px;color:#94a3b8;">—</span>`;

        // Payment status badge (red/green)
        const payStatus = o.paymentStatus || 'Unpaid';
        const payBadgeColor = payStatus === 'Paid'
            ? 'background:#059669;color:#fff;'
            : 'background:#dc2626;color:#fff;';

        return `
        <tr>
            <td>#${o.orderId}</td>
            <td>${o.customerName || 'Unknown'}</td>
            <td>${rupees(o.totalCost)}</td>
            <td><span class="status-badge ${o.deliveryStatus}">${o.deliveryStatus.replace(/_/g, ' ')}</span></td>
            <td><span style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;${payBadgeColor}">${payStatus}</span></td>
            <td>${driverDisplay}</td>
            <td>
                <div class="action-btns">
                    ${isAssignable ? `
                        <button class="action-btn dispatch" onclick="openAssignDriverModal('${o.orderId}')">🚛 Assign</button>
                    ` : ''}
                    ${o.deliveryStatus === 'placed' ? `
                        <button class="action-btn approve" onclick="updateOrderStatus('${o.orderId}','confirmed')">Approve</button>
                        <button class="action-btn cancel" onclick="updateOrderStatus('${o.orderId}','cancelled')">Reject</button>
                    ` : o.deliveryStatus === 'assigned' ? `
                        <button class="action-btn dispatch" onclick="updateOrderStatus('${o.orderId}','out_for_delivery')">Dispatch</button>
                    ` : o.deliveryStatus === 'confirmed' || o.deliveryStatus === 'packed' ? `
                        <button class="action-btn dispatch" onclick="updateOrderStatus('${o.orderId}','out_for_delivery')">Dispatch</button>
                    ` : o.deliveryStatus === 'out_for_delivery' ? `
                        <button class="action-btn approve" onclick="updateOrderStatus('${o.orderId}','delivered')">Delivered</button>
                    ` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

async function updateOrderStatus(orderId, status) {
    try {
        await api(`/admin/orders/${orderId}/status`, { method: 'PUT', body: { status } });
        showToast(`Order ${orderId} → ${status.replace(/_/g, ' ')}`);
        dashboardLoaded = false; // force dashboard refresh
        loadOrders();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// Filter handler
window.filterOrders = function (val) {
    orderFilter = val;
    renderOrders(allOrders);
};

/* ═══════════════════════════════════════════
   USER MANAGEMENT
   ═══════════════════════════════════════════ */
async function loadUsers() {
    try {
        const { data } = await api('/admin/users');
        const tbody = document.querySelector('#page-users tbody');
        if (!tbody) return;

        // Update badge count
        const badge = document.querySelector('[data-page="page-users"] .badge');
        if (badge) badge.textContent = data.length;

        tbody.innerHTML = data.map(u => `
            <tr>
                <td style="font-family:monospace;font-size:11px;color:#64748b;">${u._id.slice(-6)}</td>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td><span class="role-badge ${u.role}">${u.role}</span></td>
                <td>${new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td>
                    ${u.role !== 'admin' ? `<button class="action-btn delete" onclick="deleteUser('${u._id}','${u.name}')">Delete</button>` : '<span class="status-badge delivered">Protected</span>'}
                </td>
            </tr>
        `).join('');
    } catch (e) {
        showToast('Failed to load users: ' + e.message, 'error');
    }
}

async function deleteUser(id, name) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
        await api(`/admin/users/${id}`, { method: 'DELETE' });
        showToast(`User ${name} deleted.`);
        loadUsers();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

/* ═══════════════════════════════════════════
   MATERIALS INVENTORY
   ═══════════════════════════════════════════ */
async function loadMaterials() {
    try {
        const { data } = await api('/admin/materials');
        const tbody = document.querySelector('#page-inventory tbody');
        if (!tbody) return;

        tbody.innerHTML = data.map(m => {
            const pct = Math.min(100, (m.stock / (m.lowStockThreshold * 5)) * 100);
            const level = pct < 25 ? 'low' : pct < 50 ? 'medium' : 'good';
            const status = m.stock <= m.lowStockThreshold ? (m.stock <= m.lowStockThreshold * 0.3 ? 'cancelled' : 'dispatched') : 'delivered';
            const statusText = m.stock <= m.lowStockThreshold ? (m.stock <= m.lowStockThreshold * 0.3 ? 'Critical' : 'Low') : 'Adequate';
            const approvalBadge = m.isApproved
                ? '<span style="color:#10b981;font-size:12px;font-weight:600;">✅ Approved</span>'
                : '<span style="color:#facc15;font-size:12px;font-weight:600;">⏳ Pending</span>';
            const approvalBtn = m.isApproved
                ? `<button class="action-btn delete" onclick="toggleMaterialApproval('${m._id}','${m.name}',false)">Unapprove</button>`
                : `<button class="action-btn approve" onclick="toggleMaterialApproval('${m._id}','${m.name}',true)">Approve</button>`;
            return `
                <tr>
                    <td>${m.name}</td>
                    <td>${m.category}</td>
                    <td>${rupees(m.price)}/${m.unit || 'unit'}</td>
                    <td>
                        <div class="stock-bar-wrap">
                            <div class="stock-bar"><div class="fill ${level}" style="width:${pct}%"></div></div>
                            <div class="stock-label">${m.stock.toLocaleString()}</div>
                        </div>
                    </td>
                    <td><span class="status-badge ${status}">${statusText}</span></td>
                    <td>${approvalBadge}</td>
                    <td>
                        <div class="action-btns">
                            ${approvalBtn}
                            <button class="action-btn delete" onclick="deleteMaterial('${m._id}','${m.name}')">Delete</button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    } catch (e) {
        showToast('Failed to load materials: ' + e.message, 'error');
    }
}

async function deleteMaterial(id, name) {
    if (!confirm(`Delete material "${name}"?`)) return;
    try {
        await api(`/admin/materials/${id}`, { method: 'DELETE' });
        showToast(`${name} deleted.`);
        dashboardLoaded = false;
        loadMaterials();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// Add material modal
document.querySelector('[data-open-modal]')?.addEventListener('click', () => {
    document.getElementById('materialModal')?.classList.add('active');
});
document.querySelector('.modal-close')?.addEventListener('click', () => {
    document.getElementById('materialModal')?.classList.remove('active');
});

// Add material submit
document.querySelector('.btn-modal.primary')?.addEventListener('click', async () => {
    const inputs = document.querySelectorAll('#materialModal .modal-body input, #materialModal .modal-body select');
    const [nameEl, catEl, priceEl, stockEl, supplierEl] = inputs;

    if (!nameEl?.value || !priceEl?.value || !stockEl?.value) {
        showToast('Fill all required fields.', 'error');
        return;
    }
    try {
        await api('/admin/materials', {
            method: 'POST',
            body: {
                name: nameEl.value,
                category: catEl?.value || 'Other',
                price: Number(priceEl.value),
                stock: Number(stockEl.value),
                unit: 'units',
                lowStockThreshold: Math.floor(Number(stockEl.value) * 0.1),
            }
        });
        showToast('Material added!');
        document.getElementById('materialModal')?.classList.remove('active');
        inputs.forEach(i => { if (i.tagName === 'INPUT') i.value = ''; });
        dashboardLoaded = false;
        loadMaterials();
    } catch (e) {
        showToast(e.message, 'error');
    }
});

/* ═══════════════════════════════════════════
   AI ANALYTICS
   ═══════════════════════════════════════════ */
let analyticsLoaded = false;
async function loadAnalytics() {
    if (analyticsLoaded) return;
    try {
        const { data } = await api('/admin/analytics');

        // Stage detection chart
        const sc = document.getElementById('stageChart');
        if (sc && !sc._done) {
            sc._done = true;
            const stages = data.stageDetection || {};
            new Chart(sc, {
                type: 'bar',
                data: {
                    labels: Object.keys(stages).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
                    datasets: [{
                        label: 'AI Detections (%)',
                        data: Object.values(stages),
                        backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#fbbf24', '#8b5cf6'],
                        borderRadius: 8, barThickness: 28
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } },
                        y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { weight: 600 } } }
                    }
                }
            });
        }

        // Top materials chart
        const tmc = document.getElementById('topMaterialsChart');
        if (tmc && !tmc._done && data.topMaterials?.length) {
            tmc._done = true;
            new Chart(tmc, {
                type: 'doughnut',
                data: {
                    labels: data.topMaterials.map(m => m.name),
                    datasets: [{
                        data: data.topMaterials.map(m => m.orders),
                        backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#fbbf24', '#8b5cf6'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '60%',
                    plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 }, padding: 10 } } }
                }
            });
        }
        analyticsLoaded = true;
    } catch (e) {
        showToast('Failed to load analytics: ' + e.message, 'error');
    }
}

/* ═══════════════════════════════════════════
   REPORTS (Revenue)
   ═══════════════════════════════════════════ */
let reportsLoaded = false;
async function loadReports() {
    if (reportsLoaded) return;
    try {
        const { data } = await api('/admin/reports');
        const { data: dashData } = await api('/admin/dashboard');

        // Update report summary cards
        const cards = document.querySelectorAll('#page-reports .summary-card h3');
        if (cards[0]) cards[0].textContent = shortRupees(dashData.totalRevenue);
        if (cards[1]) cards[1].textContent = dashData.totalOrders;
        if (cards[2]) cards[2].textContent = '2.4 hrs';
        if (cards[3]) cards[3].textContent = '4.7/5';

        // Revenue chart
        const rc = document.getElementById('revenueChart');
        if (rc && !rc._done) {
            rc._done = true;
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const labels = data.monthlyRevenue?.map(r => months[r._id - 1] || `M${r._id}`) || ['Feb'];
            const values = data.monthlyRevenue?.map(r => r.revenue / 100000) || [0];

            new Chart(rc, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Revenue (₹ Lakhs)',
                        data: values,
                        backgroundColor: 'rgba(249,115,22,0.7)',
                        borderRadius: 8, barThickness: 32
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } }
                    }
                }
            });
        }
        reportsLoaded = true;
    } catch (e) {
        showToast('Failed to load reports: ' + e.message, 'error');
    }
}

/* ═══════════════════════════════════════════
   SETTINGS — Change Password
   ═══════════════════════════════════════════ */
window.changeAdminPassword = async function () {
    const curr = document.getElementById('settCurrentPass')?.value;
    const newp = document.getElementById('settNewPass')?.value;

    if (!curr || !newp) { showToast('Fill in both fields.', 'error'); return; }
    if (newp.length < 6) { showToast('New password must be at least 6 characters.', 'error'); return; }

    try {
        await api('/admin/settings/password', { method: 'PUT', body: { currentPassword: curr, newPassword: newp } });
        showToast('Password updated successfully!');
        document.getElementById('settCurrentPass').value = '';
        document.getElementById('settNewPass').value = '';
    } catch (e) {
        showToast(e.message, 'error');
    }
};

/* ═══════════════════════════════════════════
   ADD USER (Admin)
   ═══════════════════════════════════════════ */
window.addNewUser = async function () {
    const name = document.getElementById('newUserName')?.value.trim();
    const email = document.getElementById('newUserEmail')?.value.trim();
    const password = document.getElementById('newUserPass')?.value;
    const role = document.getElementById('newUserRole')?.value || 'customer';

    if (!name || !email || !password) { showToast('Fill all fields.', 'error'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }

    try {
        const { message } = await api('/admin/users', { method: 'POST', body: { name, email, password, role } });
        showToast(message || 'User created!');
        document.getElementById('addUserModal')?.classList.remove('active');
        document.getElementById('newUserName').value = '';
        document.getElementById('newUserEmail').value = '';
        document.getElementById('newUserPass').value = '';
        loadUsers();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

/* ─── Init ─── */
loadDashboard();

/* ═══════════════════════════════════════════
   COMPANIES MANAGEMENT
   ═══════════════════════════════════════════ */
async function loadCompanies() {
    try {
        const { data } = await api('/admin/companies');
        const tbody = document.getElementById('companiesTableBody');
        if (!tbody) return;

        // Update badge
        const badge = document.querySelector('[data-page="page-companies"] .badge');
        if (badge) badge.textContent = data.length;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b;">No companies registered yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(c => {
            const statusBadge = c.isApproved
                ? '<span class="status-badge delivered">Approved</span>'
                : '<span class="status-badge dispatched">Pending</span>';
            const actionBtn = c.isApproved
                ? `<button class="action-btn delete" onclick="toggleCompany('${c._id}','${c.name}',false)">Suspend</button>`
                : `<button class="action-btn approve" onclick="toggleCompany('${c._id}','${c.name}',true)">Approve</button>`;

            return `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.user?.name || '—'}</td>
                    <td>${c.email || c.user?.email || '—'}</td>
                    <td>${c.phone || '—'}</td>
                    <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.address || '—'}</td>
                    <td>${statusBadge}</td>
                    <td><div class="action-btns">${actionBtn}</div></td>
                </tr>`;
        }).join('');
    } catch (e) {
        showToast('Failed to load companies: ' + e.message, 'error');
    }
}

window.toggleCompany = async function (id, name, approve) {
    try {
        await api(`/admin/company/${id}/approve`, { method: 'PATCH', body: { approve } });
        showToast(`${name} ${approve ? 'approved' : 'suspended'}.`);
        dashboardLoaded = false;
        loadCompanies();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

window.toggleMaterialApproval = async function (id, name, approve) {
    try {
        await api(`/admin/material/${id}/approve`, { method: 'PATCH', body: { approve } });
        showToast(`${name} ${approve ? 'approved' : 'unapproved'}.`);
        dashboardLoaded = false;
        loadMaterials();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

/* ═══════════════════════════════════════════
   DRIVERS MANAGEMENT
   ═══════════════════════════════════════════ */
let allDrivers = [];
let driverFilter = 'all';

async function loadDrivers() {
    try {
        const { data } = await api('/admin/drivers');
        allDrivers = data;

        // Update badge
        const badge = document.querySelector('[data-page="page-drivers"] .badge');
        if (badge) badge.textContent = data.length;

        renderDriverStats(data);
        renderDrivers(data);
    } catch (e) {
        showToast('Failed to load drivers: ' + e.message, 'error');
    }
}

function renderDriverStats(drivers) {
    const total = drivers.length;
    const pending = drivers.filter(d => d.verificationStatus === 'Pending').length;
    const approved = drivers.filter(d => d.verificationStatus === 'Approved').length;
    const suspended = drivers.filter(d => d.verificationStatus === 'Suspended').length;

    const t = document.getElementById('statTotalDrivers');
    const p = document.getElementById('statPendingDrivers');
    const a = document.getElementById('statApprovedDrivers');
    const s = document.getElementById('statSuspendedDrivers');

    if (t) t.textContent = total;
    if (p) p.textContent = pending;
    if (a) a.textContent = approved;
    if (s) s.textContent = suspended;
}

function renderDrivers(drivers) {
    const tbody = document.getElementById('driversTableBody');
    if (!tbody) return;

    const filtered = driverFilter === 'all' ? drivers : drivers.filter(d => d.verificationStatus === driverFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#64748b;">No ${driverFilter === 'all' ? '' : driverFilter.toLowerCase()} drivers found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(d => {
        const vStatus = d.verificationStatus || 'Pending';
        const statusClass = vStatus.toLowerCase();
        const gpsStr = d.gps
            ? `${d.gps.latitude.toFixed(4)}, ${d.gps.longitude.toFixed(4)}`
            : '<span style="color:#94a3b8;">No GPS</span>';

        // Build action buttons based on verificationStatus per spec
        let actionBtns = '';
        if (vStatus === 'Pending') {
            actionBtns = `
                <button class="action-btn approve" onclick="updateDriverVerification('${d._id}','Approved')">✅ Approve</button>
                <button class="action-btn cancel" onclick="updateDriverVerification('${d._id}','Rejected')">❌ Reject</button>
                <button class="action-btn delete" onclick="deleteDriver('${d._id}','${d.name}')">Delete</button>`;
        } else if (vStatus === 'Approved') {
            actionBtns = `
                <button class="action-btn suspend" onclick="updateDriverVerification('${d._id}','Suspended')">🚫 Suspend</button>
                <button class="action-btn delete" onclick="deleteDriver('${d._id}','${d.name}')">Delete</button>`;
        } else if (vStatus === 'Rejected') {
            actionBtns = `
                <button class="action-btn approve" onclick="updateDriverVerification('${d._id}','Approved')">✅ Approve</button>
                <button class="action-btn delete" onclick="deleteDriver('${d._id}','${d.name}')">Delete</button>`;
        } else if (vStatus === 'Suspended') {
            actionBtns = `
                <button class="action-btn approve" onclick="updateDriverVerification('${d._id}','Approved')">✅ Re-Approve</button>
                <button class="action-btn delete" onclick="deleteDriver('${d._id}','${d.name}')">Delete</button>`;
        }

        return `
            <tr>
                <td><strong>${d.name}</strong></td>
                <td>${d.phone}</td>
                <td>${d.vehicle} <span style="color:#94a3b8;font-size:11px;">(${d.vehicleType || 'Truck'})</span></td>
                <td>${d.company?.name || '<span style="color:#94a3b8;">—</span>'}</td>
                <td><span style="font-family:monospace;font-size:12px;">${d.licenseNumber || '—'}</span></td>
                <td><span class="status-badge ${statusClass}">${vStatus}</span></td>
                <td>${d.accountCreated ? '<span style="color:#10b981;font-size:12px;font-weight:600;">✅ Active</span>' : '<span style="color:#f59e0b;font-size:12px;font-weight:600;">⏳ Not Yet</span>'}</td>
                <td style="font-size:11px;">${gpsStr}</td>
                <td><div class="action-btns">${actionBtns}</div></td>
            </tr>`;
    }).join('');
}

window.addNewDriver = async function () {
    const name = document.getElementById('newDriverName')?.value.trim();
    const phone = document.getElementById('newDriverPhone')?.value.trim();
    const vehicleNumber = document.getElementById('newDriverVehicle')?.value.trim();
    const vehicleType = document.getElementById('newDriverVehicleType')?.value || 'Truck';
    const license = document.getElementById('newDriverLicense')?.value.trim();

    if (!name || !phone || !vehicleNumber || !license) { showToast('Fill all fields.', 'error'); return; }

    try {
        await api('/drivers', {
            method: 'POST',
            body: {
                name, phone, vehicleNumber, vehicleType,
                licenseNumber: license,
                verificationStatus: 'Approved' // Admin added drivers are pre-approved
            }
        });
        showToast(`Driver ${name} added and approved!`);
        document.getElementById('addDriverModal')?.classList.remove('active');
        document.getElementById('newDriverName').value = '';
        document.getElementById('newDriverPhone').value = '';
        document.getElementById('newDriverVehicle').value = '';
        loadDrivers();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

window.updateDriverVerification = async function (id, status) {
    try {
        await api(`/admin/drivers/${id}/approve`, { method: 'PATCH', body: { status } });
        showToast(`Driver status updated to ${status}.`);
        loadDrivers();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

window.deleteDriver = async function (id, name) {
    if (!confirm(`Are you sure you want to delete driver "${name}"? This action cannot be undone.`)) return;
    try {
        await api(`/admin/drivers/${id}`, { method: 'DELETE' });
        showToast(`Driver ${name} deleted.`);
        loadDrivers();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

// Tab switching
document.getElementById('driverStatusTabs')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-tab')) {
        document.querySelectorAll('#driverStatusTabs .filter-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        driverFilter = e.target.dataset.status;
        renderDrivers(allDrivers);
    }
});

/* ═══════════════════════════════════════════
   ASSIGN DRIVER TO ORDER
   ═══════════════════════════════════════════ */
let assigningOrderId = null;

window.openAssignDriverModal = async function (orderId) {
    assigningOrderId = orderId;
    document.getElementById('assignOrderIdLabel').textContent = `#${orderId}`;
    document.getElementById('assignDriverModal').classList.add('active');

    const list = document.getElementById('availableDriversList');
    list.innerHTML = 'Loading available drivers...';

    try {
        const { data } = await api('/admin/drivers');
        // Only show Available + Approved drivers
        const available = data.filter(d => d.status === 'Available' && d.verificationStatus === 'Approved');
        if (available.length === 0) {
            list.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No available approved drivers. All drivers are busy or pending verification.</p>';
            return;
        }

        list.innerHTML = available.map(d => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
                <div>
                    <strong>${d.name}</strong>
                    <div style="font-size:12px;color:#64748b;">${d.vehicle} • ${d.phone}</div>
                </div>
                <button class="action-btn approve" onclick="assignDriverToOrder('${d._id}','${d.name}')">Assign</button>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = `<p style="color:#ef4444;">Error: ${e.message}</p>`;
    }
};

window.assignDriverToOrder = async function (driverId, driverName) {
    if (!assigningOrderId) return;
    try {
        await api(`/orders/${assigningOrderId}/assign-driver`, {
            method: 'PATCH',
            body: { driverId },
        });
        showToast(`Driver ${driverName} assigned to ${assigningOrderId}!`);
        document.getElementById('assignDriverModal').classList.remove('active');
        dashboardLoaded = false;
        loadOrders();
        loadDrivers();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

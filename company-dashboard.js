/* ============================================
   BUILDEASY COMPANY DASHBOARD — JavaScript
   API-Connected SPA for Company Portal
   ============================================ */

const API = 'http://localhost:5000/api';
const TOKEN = localStorage.getItem('token');
const USER = JSON.parse(localStorage.getItem('user') || '{}');

/* ─── Auth Guard ─── */
if (!TOKEN || !USER || localStorage.getItem('role') !== 'company') {
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

/* ─── Format ─── */
function rupees(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function shortRupees(n) {
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return rupees(n);
}

/* ─── Set Company Info ─── */
const companyName = USER.companyName || USER.name || 'Company';
const initials = companyName.slice(0, 2).toUpperCase();
document.getElementById('sidebarCompanyName').textContent = companyName;
document.getElementById('topbarCompanyName').textContent = companyName;
document.getElementById('sidebarAvatar').textContent = initials;
document.getElementById('topbarAvatar').textContent = initials;

/* ═══════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════ */
const navItems = document.querySelectorAll('.nav-item[data-page]');
const pages = document.querySelectorAll('.cd-page');

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
        if (bc) bc.textContent = `Company / ${label}`;

        if (pageId === 'page-dashboard') loadDashboard();
        if (pageId === 'page-materials') loadMaterials();
        if (pageId === 'page-orders') loadOrders();
        if (pageId === 'page-drivers') loadDrivers();
        if (pageId === 'page-profile') loadProfile();

        document.getElementById('cdSidebar')?.classList.remove('open');
    });
});

document.querySelector('.menu-toggle')?.addEventListener('click', () => {
    document.getElementById('cdSidebar')?.classList.toggle('open');
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
        const { data } = await api('/company/dashboard');
        document.getElementById('statMaterials').textContent = data.totalMaterials || 0;
        document.getElementById('statOrders').textContent = data.totalOrders || 0;
        document.getElementById('statDrivers').textContent = data.totalDrivers || 0;
        document.getElementById('statPending').textContent = data.pendingOrders || 0;
        document.getElementById('statRevenue').textContent = shortRupees(data.totalRevenue || 0);
        document.getElementById('statLowStock').textContent = data.lowStockAlerts || 0;

        // Show company code
        const codeEl = document.getElementById('companyCodeDisplay');
        if (codeEl && data.companyCode) codeEl.textContent = data.companyCode;

        // Show approval banner if company is not approved
        if (data.isApproved === false) {
            document.getElementById('approvalBanner').style.display = 'flex';
            document.getElementById('sidebarApprovalStatus').textContent = '⚠️ Pending Approval';
        } else {
            document.getElementById('approvalBanner').style.display = 'none';
            document.getElementById('sidebarApprovalStatus').textContent = '✅ Approved';
        }

        document.getElementById('orderBadge').textContent = data.pendingOrders || 0;
    } catch (e) {
        showToast('Failed to load dashboard: ' + e.message, 'error');
    }
}

/* ═══════════════════════════════════════════
   MATERIALS
   ═══════════════════════════════════════════ */
async function loadMaterials() {
    try {
        const { data } = await api('/company/materials');
        const tbody = document.getElementById('materialsTableBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#64748b;">No materials yet. Click "+ Add Material" to get started.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(m => {
            const stockBadge = m.stock <= (m.lowStockThreshold || 50)
                ? `<span style="color:#f87171;font-size:11px;font-weight:600;">⚠️ Low</span>`
                : `<span style="color:#34d399;font-size:11px;">In Stock</span>`;
            return `
            <tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.category || '—'}</td>
                <td>${rupees(m.price)}/${m.unit || 'unit'}</td>
                <td>${(m.stock || 0).toLocaleString()} ${stockBadge}</td>
                <td><span class="status-badge ${m.isApproved ? 'approved' : 'pending-approval'}">${m.isApproved ? '✅ Approved' : '⏳ Pending'}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick='editMaterial(${JSON.stringify(m)})'>Edit</button>
                        <button class="action-btn delete" onclick="deleteMaterial('${m._id}','${m.name}')">Delete</button>
                    </div>
                </td>
            </tr>
        `}).join('');
    } catch (e) {
        showToast('Failed to load materials: ' + e.message, 'error');
    }
}

document.getElementById('btnAddMaterial')?.addEventListener('click', () => {
    document.getElementById('addMaterialModal')?.classList.add('active');
});

document.getElementById('btnSubmitMaterial')?.addEventListener('click', async () => {
    const name = document.getElementById('matName')?.value.trim();
    const category = document.getElementById('matCategory')?.value;
    const price = Number(document.getElementById('matPrice')?.value);
    const stock = Number(document.getElementById('matStock')?.value);
    const unit = document.getElementById('matUnit')?.value.trim() || 'bags';

    if (!name || !price || !stock) { showToast('Fill all required fields.', 'error'); return; }

    try {
        await api('/company/materials', {
            method: 'POST',
            body: { name, category, price, stock, unit, lowStockThreshold: Math.floor(stock * 0.1) }
        });
        showToast('Material added! Awaiting admin approval.');
        document.getElementById('addMaterialModal')?.classList.remove('active');
        ['matName', 'matPrice', 'matStock'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        loadMaterials();
    } catch (e) {
        showToast(e.message, 'error');
    }
});

window.deleteMaterial = async function (id, name) {
    if (!confirm(`Delete material "${name}"?`)) return;
    try {
        await api(`/company/materials/${id}`, { method: 'DELETE' });
        showToast(`${name} deleted.`);
        loadMaterials();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

/* ═══════════════════════════════════════════
   ORDERS
   ═══════════════════════════════════════════ */
async function loadOrders() {
    try {
        const { data } = await api('/company/orders');
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#64748b;">No orders yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(o => {
            const payStatus = o.paymentStatus || 'Unpaid';
            const payColor = payStatus === 'Paid' ? 'background:#059669;color:#fff;' : 'background:#dc2626;color:#fff;';
            const ds = o.deliveryStatus;

            let actions = '';
            if (ds === 'Pending Company Approval' || ds === 'Placed') {
                actions = `<button class="action-btn approve" onclick="updateOrderStatus('${o._id}','Approved by Company')">✅ Approve</button>
                           <button class="action-btn delete" onclick="updateOrderStatus('${o._id}','Rejected by Company')">❌ Reject</button>`;
            } else if (ds === 'Approved by Company' || ds === 'Confirmed') {
                actions = `<button class="action-btn dispatch" onclick="openAssignDriverModal('${o._id}')">🚛 Assign Driver</button>`;
            } else if (ds === 'Driver Assigned') {
                actions = `<span style="font-size:11px;color:#10b981;font-weight:600;">🚛 Driver En Route</span>`;
            } else if (ds === 'Out for Delivery') {
                actions = `<span style="font-size:11px;color:#3b82f6;font-weight:600;">📦 Out for Delivery</span>`;
            } else if (ds === 'Delivered') {
                actions = `<span style="font-size:11px;color:#10b981;font-weight:600;">✅ Delivered</span>`;
            } else if (ds === 'Rejected by Company' || ds === 'Cancelled') {
                actions = `<span style="font-size:11px;color:#ef4444;font-weight:600;">❌ ${ds}</span>`;
            }

            const statusColor = {
                'Pending Company Approval': '#f59e0b',
                'Approved by Company': '#3b82f6',
                'Rejected by Company': '#ef4444',
                'Driver Assigned': '#8b5cf6',
                'Out for Delivery': '#06b6d4',
                'Delivered': '#10b981',
                'Cancelled': '#ef4444',
                'Placed': '#f59e0b', 'Confirmed': '#3b82f6', 'Processing': '#3b82f6', 'Ready': '#8b5cf6',
            }[ds] || '#64748b';

            return `
            <tr>
                <td>#${o.orderId || o._id.slice(-6)}</td>
                <td>${o.customerName || 'Customer'}</td>
                <td>${rupees(o.totalCost || 0)}</td>
                <td><span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:${statusColor}22;color:${statusColor};">${ds}</span></td>
                <td><span style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;${payColor}">${payStatus}</span></td>
                <td><div class="action-btns">${actions}</div></td>
            </tr>`;
        }).join('');
    } catch (e) {
        showToast('Failed to load orders: ' + e.message, 'error');
    }
}

window.updateOrderStatus = async function (orderId, status) {
    try {
        await api(`/company/orders/${orderId}/status`, { method: 'PATCH', body: { status } });
        showToast(`Order → ${status}`);
        loadOrders();
        loadDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

/* ─── Assign Driver ─── */
let assigningOrderId = null;

window.openAssignDriverModal = async function (orderId) {
    assigningOrderId = orderId;
    document.getElementById('assignOrderLabel').textContent = `#${orderId.slice(-6)}`;
    document.getElementById('assignDriverModal').classList.add('active');

    const list = document.getElementById('availableDriversList');
    list.innerHTML = 'Loading drivers...';

    try {
        const { data } = await api('/company/drivers');
        const available = data.filter(d => d.status === 'Available' && d.verificationStatus === 'Approved');
        if (available.length === 0) {
            list.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No available approved drivers.</p>';
            return;
        }

        list.innerHTML = available.map(d => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.06);margin-bottom:8px;">
                <div>
                    <strong style="color:#f8fafc;">${d.name}</strong>
                    <div style="font-size:12px;color:#64748b;">${d.vehicle} • ${d.phone}</div>
                </div>
                <button class="action-btn approve" onclick="assignDriver('${d._id}','${d.name}')">Assign</button>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = `<p style="color:#ef4444;">Error: ${e.message}</p>`;
    }
};

window.assignDriver = async function (driverId, driverName) {
    if (!assigningOrderId) return;
    try {
        await api(`/company/orders/${assigningOrderId}/assign-driver`, {
            method: 'PATCH', body: { driverId }
        });
        showToast(`Driver ${driverName} assigned!`);
        document.getElementById('assignDriverModal').classList.remove('active');
        loadOrders();
        loadDrivers();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

/* ═══════════════════════════════════════════
   DRIVERS
   ═══════════════════════════════════════════ */
async function loadDrivers() {
    try {
        const { data } = await api('/company/drivers');
        const tbody = document.getElementById('driversTableBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#64748b;">No drivers yet. Click "+ Add Driver".</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(d => {
            const statusClass = d.status === 'Available' ? 'approved' : 'Pending';
            const vStatus = d.verificationStatus || 'Pending';
            const vColors = { Pending: '#f59e0b', Approved: '#10b981', Rejected: '#ef4444', Suspended: '#f97316' };
            const vColor = vColors[vStatus] || '#64748b';
            const accountBadge = d.accountCreated
                ? `<span style="font-size:11px;font-weight:600;color:#10b981;">✅ Active</span>`
                : `<span style="font-size:11px;font-weight:600;color:#f59e0b;">⏳ Pending Approval</span>`;
            return `
            <tr>
                <td><strong>${d.name}</strong></td>
                <td style="font-size:12px;">${d.email || '—'}</td>
                <td>${d.phone}</td>
                <td style="font-size:12px;">${d.licenseNumber || '—'}</td>
                <td>${d.vehicle} <span style="color:#64748b;font-size:11px;">(${d.vehicleType || 'Truck'})</span></td>
                <td><span style="color:${vColor};font-weight:600;font-size:12px;">${vStatus}</span></td>
                <td>${accountBadge}</td>
                <td>
                    <div class="action-btns">
                        ${d.status !== 'Busy' ? `<button class="action-btn delete" onclick="deleteDriver('${d._id}','${d.name}')">Delete</button>` : '<span style="font-size:11px;color:#94a3b8;">On delivery</span>'}
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        showToast('Failed to load drivers: ' + e.message, 'error');
    }
}

document.getElementById('btnAddDriver')?.addEventListener('click', () => {
    document.getElementById('addDriverModal')?.classList.add('active');
});

document.getElementById('btnSubmitDriver')?.addEventListener('click', async () => {
    const name = document.getElementById('drvName')?.value.trim();
    const email = document.getElementById('drvEmail')?.value.trim();
    const password = document.getElementById('drvPassword')?.value;
    const phone = document.getElementById('drvPhone')?.value.trim();
    const licenseNumber = document.getElementById('drvLicense')?.value.trim();
    const vehicleNumber = document.getElementById('drvVehicle')?.value.trim();
    const vehicleType = document.getElementById('drvVehicleType')?.value || 'Truck';

    if (!name || !email || !password || !phone || !licenseNumber || !vehicleNumber) {
        showToast('Please fill all fields.', 'error'); return;
    }
    if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error'); return;
    }

    try {
        await api('/company/drivers', { method: 'POST', body: { name, email, password, phone, licenseNumber, vehicleNumber, vehicleType } });
        showToast(`Driver ${name} added! Awaiting admin approval.`);
        document.getElementById('addDriverModal')?.classList.remove('active');
        ['drvName', 'drvEmail', 'drvPassword', 'drvPhone', 'drvLicense', 'drvVehicle'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        loadDrivers();
    } catch (e) {
        showToast(e.message, 'error');
    }
});

window.deleteDriver = async function (id, name) {
    if (!confirm(`Delete driver "${name}"?`)) return;
    try {
        await api(`/company/drivers/${id}`, { method: 'DELETE' });
        showToast(`Driver ${name} deleted.`);
        loadDrivers();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

/* ─── Init ─── */
loadDashboard();

/* ═══════════════════════════════════════════
   EDIT MATERIAL
   ═══════════════════════════════════════════ */
window.editMaterial = function (m) {
    document.getElementById('editMatId').value = m._id;
    document.getElementById('editMatName').value = m.name || '';
    document.getElementById('editMatCategory').value = m.category || 'Other';
    document.getElementById('editMatPrice').value = m.price || '';
    document.getElementById('editMatStock').value = m.stock || '';
    document.getElementById('editMatUnit').value = m.unit || 'unit';
    document.getElementById('editMaterialModal').classList.add('active');
};

document.getElementById('btnUpdateMaterial')?.addEventListener('click', async () => {
    const id = document.getElementById('editMatId')?.value;
    const name = document.getElementById('editMatName')?.value.trim();
    const category = document.getElementById('editMatCategory')?.value;
    const price = Number(document.getElementById('editMatPrice')?.value);
    const stock = Number(document.getElementById('editMatStock')?.value);
    const unit = document.getElementById('editMatUnit')?.value.trim() || 'unit';

    if (!id || !name || !price) { showToast('Fill required fields.', 'error'); return; }

    try {
        await api(`/company/materials/${id}`, {
            method: 'PUT',
            body: { name, category, price, stock, unit }
        });
        showToast('Material updated!');
        document.getElementById('editMaterialModal')?.classList.remove('active');
        loadMaterials();
    } catch (e) {
        showToast(e.message, 'error');
    }
});

/* ═══════════════════════════════════════════
   PROFILE
   ═══════════════════════════════════════════ */
async function loadProfile() {
    try {
        const { data } = await api('/company/profile');
        document.getElementById('profCode').textContent = data.companyCode || '—';
        document.getElementById('profName').textContent = data.name || '—';
        document.getElementById('profEmail').textContent = data.email || '—';
        document.getElementById('profPhone').textContent = data.phone || '—';
        document.getElementById('profGST').textContent = data.gstNumber || '—';
        document.getElementById('profBizType').textContent = data.businessType || '—';
        document.getElementById('profAddress').textContent = data.address || '—';
        document.getElementById('profDesc').textContent = data.description || 'No description added.';
        document.getElementById('profApproval').innerHTML = data.isApproved
            ? '<span style="color:#10b981;font-weight:600;">✅ Approved</span>'
            : '<span style="color:#facc15;font-weight:600;">⏳ Pending Approval</span>';
        document.getElementById('profCreated').textContent = data.createdAt
            ? new Date(data.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
            : '—';
        document.getElementById('profLocation').textContent = data.location?.coordinates
            ? `${data.location.coordinates[1]}, ${data.location.coordinates[0]}`
            : '—';
        document.getElementById('profOwner').textContent = data.owner?.name || '—';
    } catch (e) {
        showToast('Failed to load profile: ' + e.message, 'error');
    }
}


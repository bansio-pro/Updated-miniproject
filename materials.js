/* ============================================
   BUILDEASY — Materials Page JavaScript
   Fetch products, cart system, order placement
   ============================================ */

const API_BASE = 'http://localhost:5000/api';

// ─── STATE ───────────────────────────────────
let allMaterials = [];
let searchTerm = '';
let cart = JSON.parse(sessionStorage.getItem('be_cart') || '[]');

// ─── MATERIAL CATALOG (fallback if API empty) ──
const FALLBACK_MATERIALS = [
    { _id: 'f1', name: 'OPC Cement 53 Grade', category: 'Cement', price: 400, unit: 'bag', stock: 200 },
    { _id: 'f2', name: 'PPC Cement', category: 'Cement', price: 370, unit: 'bag', stock: 150 },
    { _id: 'f3', name: 'UltraTech Cement', category: 'Cement', price: 420, unit: 'bag', stock: 100 },
    { _id: 'f4', name: 'River Sand (Fine)', category: 'Sand', price: 2800, unit: 'ton', stock: 80 },
    { _id: 'f5', name: 'M-Sand (Manufactured)', category: 'Sand', price: 1400, unit: 'ton', stock: 120 },
    { _id: 'f6', name: 'TMT Steel 10mm', category: 'Steel', price: 65, unit: 'kg', stock: 500 },
    { _id: 'f7', name: 'TMT Steel 12mm', category: 'Steel', price: 68, unit: 'kg', stock: 400 },
    { _id: 'f8', name: 'TMT Steel 16mm', category: 'Steel', price: 72, unit: 'kg', stock: 300 },
    { _id: 'f9', name: 'Red Bricks (Standard)', category: 'Bricks', price: 9.25, unit: 'piece', stock: 5000 },
    { _id: 'f10', name: 'Fly Ash Bricks', category: 'Bricks', price: 7.50, unit: 'piece', stock: 3000 },
    { _id: 'f11', name: 'AAC Blocks', category: 'Bricks', price: 55, unit: 'piece', stock: 800 },
    { _id: 'f12', name: 'Aggregate 20mm', category: 'Aggregates', price: 1800, unit: 'ton', stock: 100 },
    { _id: 'f13', name: 'Aggregate 40mm', category: 'Aggregates', price: 1650, unit: 'ton', stock: 80 },
    { _id: 'f14', name: 'Asian Paints Apex', category: 'Paint', price: 320, unit: 'litre', stock: 200 },
    { _id: 'f15', name: 'Berger WeatherCoat', category: 'Paint', price: 280, unit: 'litre', stock: 150 },
];

// ─── ICON MAP ─────────────────────────────────
const CATEGORY_ICONS = {
    Cement: '🧱',
    Sand: '🏖️',
    Steel: '🔩',
    Bricks: '🧱',
    Aggregates: '🪨',
    Paint: '🎨',
    Tiles: '🪟',
    Other: '📦',
};

// ─── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await fetchMaterials();
    renderProducts();
    renderCart();
    updateCartBadge();
    bindEvents();
}

// ─── COLLECT FILTER PARAMS ────────────────────
function getFilterParams() {
    const params = new URLSearchParams();

    // Material type checkboxes
    const checked = document.querySelectorAll('#typeFilters input[type="checkbox"]:checked');
    if (checked.length > 0) {
        const types = Array.from(checked).map(cb => cb.value);
        params.set('type', types.join(','));
    }

    // Price range dropdown
    const priceRange = document.getElementById('priceRange');
    if (priceRange && priceRange.value) {
        const [min, max] = priceRange.value.split('-');
        if (min) params.set('minPrice', min);
        if (max) params.set('maxPrice', max);
    }

    // Sort dropdown
    const sortBy = document.getElementById('sortBy');
    if (sortBy && sortBy.value) {
        params.set('sort', sortBy.value);
    }

    // Search text
    if (searchTerm) {
        params.set('search', searchTerm);
    }

    return params;
}

// ─── CHECK IF FILTERS ARE ACTIVE ──────────────
function hasActiveFilters() {
    const checked = document.querySelectorAll('#typeFilters input[type="checkbox"]:checked');
    const priceRange = document.getElementById('priceRange');
    const sortBy = document.getElementById('sortBy');
    return checked.length > 0 || (priceRange && priceRange.value) || (sortBy && sortBy.value) || searchTerm;
}

// ─── FETCH MATERIALS ──────────────────────────
async function fetchMaterials() {
    try {
        const params = getFilterParams();
        const queryStr = params.toString();
        const url = `${API_BASE}/materials${queryStr ? '?' + queryStr : ''}`;

        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
            allMaterials = data.data;
        } else if (data.success && data.data.length === 0) {
            allMaterials = [];
        } else {
            allMaterials = FALLBACK_MATERIALS;
        }
    } catch (err) {
        console.warn('[Materials] API unavailable, using fallback catalog.', err);
        allMaterials = FALLBACK_MATERIALS;
    }
}

// ─── UPDATE UI AFTER FILTER CHANGE ────────────
async function applyFiltersAndRender() {
    await fetchMaterials();
    renderProducts();

    // Toggle clear filters button visibility
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) {
        clearBtn.classList.toggle('visible', hasActiveFilters());
    }
}

// ─── CLEAR ALL FILTERS ───────────────────────
function clearAllFilters() {
    // Uncheck all type checkboxes
    document.querySelectorAll('#typeFilters input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });

    // Reset dropdowns
    const priceRange = document.getElementById('priceRange');
    if (priceRange) priceRange.value = '';
    const sortBy = document.getElementById('sortBy');
    if (sortBy) sortBy.value = '';

    // Reset search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    searchTerm = '';

    // Hide clear button
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) clearBtn.classList.remove('visible');

    applyFiltersAndRender();
}

// ─── RENDER PRODUCTS ──────────────────────────
function renderProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    const filtered = allMaterials;

    // Update result count
    const countEl = document.getElementById('resultCount');
    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-grid" style="grid-column: 1 / -1;">
                <span class="empty-icon">🔍</span>
                <h3>No materials found</h3>
                <p>Try a different search or filter combination</p>
            </div>`;
        return;
    }

    grid.innerHTML = filtered.map(mat => {
        const icon = CATEGORY_ICONS[mat.category] || '📦';
        const cssClass = (mat.category || 'other').toLowerCase();
        const cartItem = cart.find(c => c.id === mat._id);
        const qty = cartItem ? cartItem.qty : 1;
        const isInCart = !!cartItem;

        // Stock status
        let stockBadge = '';
        const stock = mat.stock ?? 0;
        if (stock <= 0) {
            stockBadge = '<span class="stock-badge out-of-stock">Out of Stock</span>';
        } else if (stock <= (mat.lowStockThreshold || 50)) {
            stockBadge = '<span class="stock-badge low-stock">Low Stock</span>';
        } else {
            stockBadge = '<span class="stock-badge in-stock">In Stock</span>';
        }

        // Company info
        const company = mat.company || {};
        const companyName = company.name || 'BuildEasy Direct';
        const companyAddr = company.address || '';
        const isVerified = company.isApproved !== false;
        const verifiedBadge = isVerified
            ? '<span class="verified-badge">✅ Verified Supplier</span>'
            : '';
        const companyId = company._id || '';

        // Material image
        const matImage = mat.image && mat.image !== 'https://via.placeholder.com/400x300?text=Material'
            ? mat.image
            : `https://via.placeholder.com/400x300?text=${encodeURIComponent(mat.name)}`;

        return `
        <div class="product-card fade-in" data-id="${mat._id}">
            <div class="product-icon-area">
                <img src="${matImage}" alt="${mat.name}" class="product-image"
                    onerror="this.onerror=null;this.src='https://via.placeholder.com/400x300?text=${encodeURIComponent(mat.category)}'">
                <div class="icon-badge ${cssClass}">${icon}</div>
                ${stockBadge}
            </div>
            <div class="product-body">
                <div class="product-category">${mat.category}</div>
                <div class="product-name">${mat.name}</div>
                <div class="product-price">₹${mat.price.toLocaleString('en-IN')} <span class="unit">/ ${mat.unit || 'unit'}</span></div>
                <div class="product-supplier">
                    <div class="supplier-name">🏢 ${companyName}</div>
                    ${companyAddr ? `<div class="supplier-addr">📍 ${companyAddr}</div>` : ''}
                    ${verifiedBadge}
                </div>
                <div class="product-actions">
                    <div class="qty-control">
                        <button class="qty-btn" onclick="changeCardQty('${mat._id}', -1)">−</button>
                        <input type="number" class="qty-input" id="qty-${mat._id}" min="1" max="${stock || 999}" value="${qty}">
                        <button class="qty-btn" onclick="changeCardQty('${mat._id}', 1)">+</button>
                    </div>
                    <button class="btn-add-cart ${isInCart ? 'added' : ''}" id="btn-${mat._id}"
                        onclick="addToCart('${mat._id}')" ${stock <= 0 ? 'disabled' : ''}>
                        ${isInCart ? '✓ Added' : '🛒 Add'}
                    </button>
                    <button class="btn-view-details" onclick="viewDetails('${mat._id}','${companyId}')">
                        👁️ Details
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Re-observe fade-in
    document.querySelectorAll('.product-card.fade-in:not(.visible)').forEach(el => {
        setTimeout(() => el.classList.add('visible'), 50);
    });
}

// ─── CARD QUANTITY ─────────────────────────────
function changeCardQty(id, delta) {
    const input = document.getElementById(`qty-${id}`);
    if (!input) return;
    let val = parseInt(input.value) || 1;
    val = Math.max(1, val + delta);
    input.value = val;
}

// ─── ADD TO CART ──────────────────────────────
function addToCart(id) {
    const mat = allMaterials.find(m => m._id === id);
    if (!mat) return;

    const qtyInput = document.getElementById(`qty-${id}`);
    const qty = parseInt(qtyInput?.value) || 1;

    const companyId = mat.company?._id || null;
    const companyName = mat.company?.name || 'BuildEasy Direct';

    // Prevent mixing materials from different companies
    if (cart.length > 0 && companyId) {
        const existingCompany = cart[0].companyId;
        if (existingCompany && existingCompany !== companyId) {
            showToast(`⚠️ Cart already has items from "${cart[0].companyName}". Clear cart first to order from a different supplier.`, 'error');
            return;
        }
    }

    const existing = cart.find(c => c.id === id);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({
            id: mat._id,
            name: mat.name,
            category: mat.category,
            price: mat.price,
            unit: mat.unit || 'unit',
            qty: qty,
            companyId: companyId,
            companyName: companyName,
        });
    }

    saveCart();
    updateCartBadge();
    renderCart();

    // Visual feedback on card button
    const btn = document.getElementById(`btn-${id}`);
    if (btn) {
        btn.classList.add('added');
        btn.innerHTML = '✓ Added';
        setTimeout(() => {
            btn.classList.remove('added');
            btn.innerHTML = '🛒 Add';
        }, 1500);
    }

    showToast(`${mat.name} × ${qty} added to cart`, 'success');
}

// ─── VIEW DETAILS (redirect to order page with params) ─────
function viewDetails(materialId, companyId) {
    window.location.href = `materials.html?materialId=${materialId}&companyId=${companyId}&view=detail`;
}

// ─── CART RENDERING ───────────────────────────
function renderCart() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    if (!container || !footer) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <span class="empty-cart-icon">🛒</span>
                <h3>Cart is empty</h3>
                <p>Add materials to get started</p>
            </div>`;
        footer.style.display = 'none';
        return;
    }

    footer.style.display = 'block';

    container.innerHTML = cart.map(item => {
        const icon = CATEGORY_ICONS[item.category] || '📦';
        const subtotal = item.price * item.qty;
        return `
        <div class="cart-item">
            <div class="cart-item-icon">${icon}</div>
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div class="cart-item-price">₹${item.price.toLocaleString('en-IN')} / ${item.unit}</div>
            </div>
            <div class="cart-item-qty">
                <button onclick="updateCartQty('${item.id}', -1)">−</button>
                <span>${item.qty}</span>
                <button onclick="updateCartQty('${item.id}', 1)">+</button>
            </div>
            <div class="cart-item-subtotal">
                <div class="sub-total">₹${subtotal.toLocaleString('en-IN')}</div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" title="Remove">✕</button>
        </div>`;
    }).join('');

    const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
    document.getElementById('cartSubtotal').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    document.getElementById('cartTotal').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
}

// ─── CART OPERATIONS ──────────────────────────
function updateCartQty(id, delta) {
    const item = cart.find(c => c.id === id);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart();
    renderCart();
    updateCartBadge();
}

function removeFromCart(id) {
    cart = cart.filter(c => c.id !== id);
    saveCart();
    renderCart();
    updateCartBadge();
    renderProducts(); // Reset "Added" state on card
}

function clearCart() {
    cart = [];
    saveCart();
    renderCart();
    updateCartBadge();
    renderProducts();
    showToast('Cart cleared', 'info');
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
    document.getElementById('cartOverlay').classList.toggle('open');
}

function saveCart() {
    sessionStorage.setItem('be_cart', JSON.stringify(cart));
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const count = cart.reduce((sum, c) => sum + c.qty, 0);
    badge.textContent = count;
    badge.classList.toggle('empty', count === 0);
}

// ─── PLACE ORDER ──────────────────────────────
async function placeOrder() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please login to place an order', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        return;
    }

    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }

    const addressField = document.getElementById('deliveryAddress');
    const address = addressField?.value.trim();
    if (!address) {
        showToast('Please enter a delivery address', 'error');
        addressField?.focus();
        return;
    }

    const btn = document.getElementById('btnPlaceOrder');
    btn.classList.add('loading');
    btn.disabled = true;
    btn.innerHTML = '⏳ Placing Order...';

    try {
        const materials = cart.map(c => ({
            name: c.name,
            qty: `${c.qty} ${c.unit}`,
            price: c.price * c.qty,
        }));

        const res = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                projectLocation: address,
                deliveryAddress: address,
                materials: materials,
            }),
        });

        const result = await res.json();

        if (!res.ok || !result.success) {
            throw new Error(result.message || 'Failed to place order');
        }

        // Success!
        const orderId = result.data.orderId || result.data._id;
        document.getElementById('successOrderId').textContent = orderId;

        // Clear cart + address
        cart = [];
        saveCart();
        renderCart();
        updateCartBadge();
        renderProducts();
        if (addressField) addressField.value = '';

        // Close cart sidebar, show success modal
        document.getElementById('cartSidebar').classList.remove('open');
        document.getElementById('cartOverlay').classList.remove('open');
        document.getElementById('successModal').classList.add('open');

    } catch (err) {
        console.error('[PlaceOrder]', err);
        showToast(err.message || 'Failed to place order. Try again.', 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
        btn.innerHTML = '📦 Place Order';
    }
}

function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('open');
}

// ─── GEOLOCATION ──────────────────────────────
function useCurrentLocation() {
    const btn = document.getElementById('btnGetLocation');
    const btnIcon = document.getElementById('locBtnIcon');
    const btnText = document.getElementById('locBtnText');
    const status = document.getElementById('locationStatus');
    const addressField = document.getElementById('deliveryAddress');

    // Check if geolocation is supported
    if (!navigator.geolocation) {
        setLocationStatus('error', '❌ Geolocation is not supported by your browser');
        btn.classList.add('error');
        setTimeout(() => btn.classList.remove('error'), 3000);
        return;
    }

    // Check if running on secure context (localhost or HTTPS)
    if (!window.isSecureContext) {
        setLocationStatus('error', '🔒 Geolocation requires HTTPS or localhost');
        btn.classList.add('error');
        setTimeout(() => btn.classList.remove('error'), 3000);
        return;
    }

    // Show loading state
    btn.disabled = true;
    btnIcon.textContent = '⏳';
    btnText.textContent = 'Detecting location...';
    setLocationStatus('loading', '📡 Requesting location access...');

    navigator.geolocation.getCurrentPosition(
        // Success callback
        (position) => {
            const lat = position.coords.latitude.toFixed(6);
            const lng = position.coords.longitude.toFixed(6);

            if (addressField) {
                addressField.value = `Latitude: ${lat}, Longitude: ${lng}`;
                addressField.focus();
            }

            btn.disabled = false;
            btn.classList.add('success');
            btnIcon.textContent = '✓';
            btnText.textContent = 'Location detected!';
            setLocationStatus('success', `✓ Location: ${lat}, ${lng}`);

            // Reset button after 3 seconds
            setTimeout(() => {
                btn.classList.remove('success');
                btnIcon.textContent = '📍';
                btnText.textContent = 'Use My Current Location';
            }, 3000);

            showToast('Location detected successfully!', 'success');
        },
        // Error callback
        (error) => {
            btn.disabled = false;
            btn.classList.add('error');
            btnIcon.textContent = '📍';
            btnText.textContent = 'Use My Current Location';

            let msg = '';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    msg = '❌ Location permission denied. Please allow location access in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    msg = '❌ Location unavailable. Please try again or enter address manually.';
                    break;
                case error.TIMEOUT:
                    msg = '⏰ Location request timed out. Please try again.';
                    break;
                default:
                    msg = '❌ Unable to get location. Please enter address manually.';
            }

            setLocationStatus('error', msg);
            showToast('Failed to detect location', 'error');

            setTimeout(() => btn.classList.remove('error'), 3000);
        },
        // Options
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
        }
    );
}

function setLocationStatus(type, message) {
    const status = document.getElementById('locationStatus');
    if (!status) return;
    status.className = `location-status ${type}`;
    status.textContent = message;
}

// ─── EVENT BINDINGS ───────────────────────────
function bindEvents() {
    // Search input with debounce
    const searchInput = document.getElementById('searchInput');
    let searchTimer = null;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                applyFiltersAndRender();
            }, 300);
        });
    }

    // Material type tag checkboxes
    document.querySelectorAll('#typeFilters input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            applyFiltersAndRender();
        });
    });

    // Price range dropdown
    const priceRange = document.getElementById('priceRange');
    if (priceRange) {
        priceRange.addEventListener('change', () => {
            applyFiltersAndRender();
        });
    }

    // Sort dropdown
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
        sortBy.addEventListener('change', () => {
            applyFiltersAndRender();
        });
    }
}

// ─── TOAST ────────────────────────────────────
function showToast(msg, type = 'success') {
    const container = document.getElementById('matToastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `mat-toast ${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.innerHTML = `<span>${icons[type] || '•'}</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}


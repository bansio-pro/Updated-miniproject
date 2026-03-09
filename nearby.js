/* ============================================
   BUILDEASY — Nearby Companies Search
   Geo-Based Proximity Search
   ============================================ */

const API_BASE = 'http://localhost:5000/api';

/* ─── Auto-Detect Location ─── */
function detectLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }
    const btn = document.querySelector('.btn-detect');
    btn.textContent = '⏳ Detecting...';

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            document.getElementById('searchLat').value = pos.coords.latitude.toFixed(6);
            document.getElementById('searchLng').value = pos.coords.longitude.toFixed(6);
            btn.textContent = '📍 Detected!';
            setTimeout(() => { btn.textContent = '📍 Detect'; }, 2000);
        },
        (err) => {
            alert('Location detection failed: ' + err.message);
            btn.textContent = '📍 Detect';
        }
    );
}

/* ─── Search Nearby Companies ─── */
async function searchNearby() {
    const lat = parseFloat(document.getElementById('searchLat').value);
    const lng = parseFloat(document.getElementById('searchLng').value);
    const radius = document.getElementById('searchRadius').value;

    if (isNaN(lat) || isNaN(lng)) {
        alert('Please enter valid latitude and longitude.');
        return;
    }

    const grid = document.getElementById('resultsGrid');
    const count = document.getElementById('resultsCount');
    grid.innerHTML = '<div class="empty-results"><div class="emoji">⏳</div><h3>Searching...</h3></div>';

    try {
        const res = await fetch(`${API_BASE}/companies/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
        const result = await res.json();

        if (!res.ok || !result.success) {
            grid.innerHTML = `<div class="empty-results"><div class="emoji">❌</div><h3>Error</h3><p>${result.message || 'Search failed.'}</p></div>`;
            count.textContent = '';
            return;
        }

        const companies = result.data;
        count.textContent = `${companies.length} compan${companies.length !== 1 ? 'ies' : 'y'} found within ${(parseInt(radius) / 1000)}km`;

        if (companies.length === 0) {
            grid.innerHTML = '<div class="empty-results"><div class="emoji">🔍</div><h3>No companies found</h3><p>Try increasing the search radius or changing your location.</p></div>';
            return;
        }

        grid.innerHTML = companies.map((c, i) => `
            <div class="company-card" id="company-${i}">
                <div class="card-badge">✅ Verified Supplier</div>
                <h3>${c.name}</h3>
                <div class="meta">📍 ${c.address || 'Address not provided'}</div>
                <div class="meta">📞 ${c.phone || '—'}</div>
                <div class="meta">📧 ${c.email || '—'}</div>
                <button class="btn-materials" onclick="loadMaterials('${c._id}', ${i})">
                    📦 View Materials
                </button>
                <div class="materials-expand" id="materials-${i}">
                    <h4>Available Materials</h4>
                    <div class="mat-list" id="mat-list-${i}">Loading...</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        grid.innerHTML = `<div class="empty-results"><div class="emoji">⚠️</div><h3>Connection Error</h3><p>Could not reach the server. Make sure it's running.</p></div>`;
        count.textContent = '';
    }
}

/* ─── Load Materials for a Company ─── */
async function loadMaterials(companyId, index) {
    const expand = document.getElementById(`materials-${index}`);
    const list = document.getElementById(`mat-list-${index}`);

    if (expand.classList.contains('open')) {
        expand.classList.remove('open');
        return;
    }

    expand.classList.add('open');
    list.innerHTML = 'Loading...';

    try {
        const res = await fetch(`${API_BASE}/companies/${companyId}/materials`);
        const result = await res.json();

        if (!result.success || result.data.length === 0) {
            list.innerHTML = '<p style="color:#94a3b8;font-size:13px;">No approved materials listed yet.</p>';
            return;
        }

        list.innerHTML = result.data.map(m => `
            <div class="mat-item">
                <span class="mat-name">${m.name} <span style="color:#94a3b8;font-size:11px;">(${m.category || '—'})</span></span>
                <span class="mat-price">₹${Number(m.price).toLocaleString('en-IN')}/${m.unit || 'unit'}</span>
            </div>
        `).join('');
    } catch (error) {
        list.innerHTML = '<p style="color:#ef4444;font-size:13px;">Failed to load materials.</p>';
    }
}

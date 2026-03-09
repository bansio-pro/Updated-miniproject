/* ============================================
   BUILDEASY — Material Estimation & AI Analyzer
   ============================================ */

/* -------- MANUAL MATERIAL ESTIMATION -------- */
function calculateEstimation() {
    const length = parseFloat(document.getElementById('estLength').value);
    const width = parseFloat(document.getElementById('estWidth').value);
    const height = parseFloat(document.getElementById('estHeight').value) || 3;
    const stage = document.getElementById('estStage').value;
    const type = document.getElementById('estType').value;

    if (!length || !width) {
        alert('Please enter length and width.');
        return;
    }

    const area = length * width;
    const volume = area * height;
    const perimeter = 2 * (length + width);
    const wallArea = perimeter * height;
    const multiplier = type === 'premium' ? 1.3 : 1;

    let materials = [];

    switch (stage) {
        case 'foundation':
            materials = [
                { icon: '🧱', cls: 'cement', name: 'Cement', qty: (volume * 0.22 * multiplier).toFixed(1) + ' bags', note: 'OPC 53 Grade' },
                { icon: '🏖️', cls: 'sand', name: 'Sand', qty: (volume * 0.015 * multiplier).toFixed(2) + ' tons', note: 'River / M-Sand' },
                { icon: '🪨', cls: 'aggregate', name: 'Aggregate', qty: (volume * 0.03 * multiplier).toFixed(2) + ' tons', note: '20mm Crushed Stone' },
                { icon: '🔩', cls: 'steel', name: 'Steel', qty: (area * 3.2 * multiplier).toFixed(1) + ' kg', note: 'TMT Fe-500D' },
                { icon: '💧', cls: 'water', name: 'Water', qty: (volume * 30 * multiplier).toFixed(0) + ' litres', note: 'Clean potable water' },
                { icon: '🧱', cls: 'bricks', name: 'Bricks', qty: '—', note: 'Not needed at this stage' },
            ];
            break;
        case 'brickwork':
            materials = [
                { icon: '🧱', cls: 'bricks', name: 'Bricks', qty: (wallArea * 48 * multiplier).toFixed(0) + ' pcs', note: 'Standard red bricks' },
                { icon: '🧱', cls: 'cement', name: 'Cement', qty: (wallArea * 0.3 * multiplier).toFixed(1) + ' bags', note: 'PPC / OPC' },
                { icon: '🏖️', cls: 'sand', name: 'Sand', qty: (wallArea * 0.012 * multiplier).toFixed(2) + ' tons', note: 'Coarse Sand' },
                { icon: '💧', cls: 'water', name: 'Water', qty: (wallArea * 22 * multiplier).toFixed(0) + ' litres', note: 'For mortar mixing' },
                { icon: '🔩', cls: 'steel', name: 'Steel', qty: (wallArea * 0.5 * multiplier).toFixed(1) + ' kg', note: 'Lintel bars' },
                { icon: '🪨', cls: 'aggregate', name: 'Aggregate', qty: '—', note: 'Minimal at this stage' },
            ];
            break;
        case 'roofing':
            materials = [
                { icon: '🧱', cls: 'cement', name: 'Cement', qty: (area * 0.45 * multiplier).toFixed(1) + ' bags', note: 'OPC 53 Grade' },
                { icon: '🔩', cls: 'steel', name: 'Steel', qty: (area * 4.5 * multiplier).toFixed(1) + ' kg', note: 'TMT 10mm & 12mm' },
                { icon: '🏖️', cls: 'sand', name: 'Sand', qty: (area * 0.02 * multiplier).toFixed(2) + ' tons', note: 'Coarse Sand' },
                { icon: '🪨', cls: 'aggregate', name: 'Aggregate', qty: (area * 0.04 * multiplier).toFixed(2) + ' tons', note: '12mm & 20mm Jelly' },
                { icon: '💧', cls: 'water', name: 'Water', qty: (area * 35 * multiplier).toFixed(0) + ' litres', note: 'Curing water' },
                { icon: '🧱', cls: 'bricks', name: 'Shuttering', qty: (area * 1.1).toFixed(1) + ' sqft', note: 'Plywood sheets' },
            ];
            break;
        case 'plastering':
            materials = [
                { icon: '🧱', cls: 'cement', name: 'Cement', qty: (wallArea * 0.18 * multiplier).toFixed(1) + ' bags', note: 'PPC Cement' },
                { icon: '🏖️', cls: 'sand', name: 'Sand', qty: (wallArea * 0.01 * multiplier).toFixed(2) + ' tons', note: 'Fine Plastering Sand' },
                { icon: '💧', cls: 'water', name: 'Water', qty: (wallArea * 18 * multiplier).toFixed(0) + ' litres', note: 'For curing' },
                { icon: '🪨', cls: 'aggregate', name: 'POP/Putty', qty: (wallArea * 0.08 * multiplier).toFixed(1) + ' kg', note: 'Wall putty' },
                { icon: '🔩', cls: 'steel', name: 'Chicken Mesh', qty: (wallArea * 0.1).toFixed(1) + ' sqm', note: 'For crack prevention' },
                { icon: '🧱', cls: 'bricks', name: 'Primer', qty: (wallArea * 0.1).toFixed(1) + ' litres', note: 'White cement primer' },
            ];
            break;
        case 'finishing':
            materials = [
                { icon: '🎨', cls: 'cement', name: 'Paint', qty: (wallArea * 0.14 * multiplier).toFixed(1) + ' litres', note: 'Interior emulsion' },
                { icon: '🧱', cls: 'bricks', name: 'Tiles', qty: (area * 1.05 * multiplier).toFixed(1) + ' sqft', note: 'Vitrified / Ceramic' },
                { icon: '🧱', cls: 'sand', name: 'Tile Adhesive', qty: (area * 0.2 * multiplier).toFixed(1) + ' kg', note: 'For tile fixing' },
                { icon: '🪨', cls: 'aggregate', name: 'Putty', qty: (wallArea * 0.12 * multiplier).toFixed(1) + ' kg', note: 'Final wall putty' },
                { icon: '💧', cls: 'water', name: 'Primer', qty: (wallArea * 0.08 * multiplier).toFixed(1) + ' litres', note: 'Exterior + Interior' },
                { icon: '🔩', cls: 'steel', name: 'Hardware', qty: '1 set', note: 'Door handles, hinges' },
            ];
            break;
    }

    const grid = document.getElementById('resultGrid');
    grid.innerHTML = materials.map(m => `
        <div class="result-item">
            <div class="r-icon ${m.cls}">${m.icon}</div>
            <div class="r-data">
                <h4>${m.name}: ${m.qty}</h4>
                <p>${m.note}</p>
            </div>
        </div>
    `).join('');

    const panel = document.getElementById('manualResult');
    panel.classList.add('visible');

    // Update progress
    setProgress(3);
}

/* -------- PROGRESS STEPPER -------- */
function setProgress(step) {
    for (let i = 1; i <= 4; i++) {
        const ps = document.getElementById('ps' + i);
        const pc = document.getElementById('pc' + i);
        ps.classList.remove('active', 'done');
        if (pc) pc.classList.remove('active');

        if (i < step) {
            ps.classList.add('done');
            if (pc) pc.classList.add('active');
        } else if (i === step) {
            ps.classList.add('active');
            if (pc) pc.classList.add('active');
        }
    }
}

/* -------- DRAG & DROP + FILE UPLOAD -------- */
let selectedFile = null; // Store the uploaded file for API submission

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewImg = document.getElementById('previewImg');
    const analyzeBtn = document.getElementById('analyzeBtn');

    if (!dropZone) return;

    ['dragover', 'dragenter'].forEach(evt => {
        dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, () => dropZone.classList.remove('dragover'));
    });

    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleFile(file);
        else if (file) alert('⚠️ Please upload an image file (JPG, PNG, or WEBP).');
    });

    dropZone.addEventListener('click', e => {
        if (e.target.tagName !== 'SPAN') fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) handleFile(fileInput.files[0]);
    });

    function handleFile(file) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            alert('⚠️ Invalid file type. Please upload JPG, PNG, or WEBP images only.');
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            alert('⚠️ File too large. Maximum size is 10MB.');
            return;
        }

        selectedFile = file; // Store for later API call

        const reader = new FileReader();
        reader.onload = e => {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            analyzeBtn.disabled = false;
            // Hide the text prompts
            dropZone.querySelector('.drop-icon').style.display = 'none';
            dropZone.querySelector('h3').style.display = 'none';
            dropZone.querySelectorAll('p').forEach(p => p.style.display = 'none');
            setProgress(2);
        };
        reader.readAsDataURL(file);
    }

    // Listen for manual input changes to update progress
    ['estLength', 'estWidth', 'estHeight'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => setProgress(1));
    });
});

/* -------- STAGE LABEL MAP -------- */
const stageLabelMap = {
    foundation: '🏗️ Foundation Stage',
    brickwork: '🧱 Brickwork Stage',
    roofing: '🏠 Roofing Stage',
    plastering: '🪣 Plastering Stage',
    finishing: '✨ Finishing Stage',
    completed: '✅ Construction Complete'
};

/* -------- PRIORITY ICON MAP -------- */
const priorityIconMap = {
    'Essential': '🧱',
    'Critical': '🔩',
    'Required': '🏖️',
    'Important': '🪨',
    'Next Step': '🎨',
    'Completed': '✅'
};

/* -------- AI IMAGE ANALYSIS (Real API Call) -------- */
// API base URL — uses relative path if served from backend, otherwise localhost:5000
const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';

async function analyzeImage() {
    const scanOverlay = document.getElementById('scanOverlay');
    const aiResult = document.getElementById('aiResult');
    const analyzeBtn = document.getElementById('analyzeBtn');

    if (!selectedFile) {
        alert('Please upload an image first.');
        return;
    }

    // Show scanning animation
    scanOverlay.classList.add('active');
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '⏳ Analyzing...';
    aiResult.classList.remove('visible');

    try {
        // Build FormData with the image
        const formData = new FormData();
        formData.append('siteImage', selectedFile);

        // Send to backend API
        const response = await fetch(API_BASE + '/api/estimate/analyze', {
            method: 'POST',
            body: formData
        });

        // Check HTTP status first
        if (!response.ok) {
            let errorMsg = `Server error (${response.status})`;
            try {
                const errData = await response.json();
                errorMsg = errData.message || errorMsg;
            } catch (e) { /* response wasn't JSON */ }
            throw new Error(errorMsg);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Analysis failed');
        }

        // Hide scanning overlay
        scanOverlay.classList.remove('active');

        // Render detected stage badge
        const stageLabel = stageLabelMap[data.detectedStage] || `🏗️ ${data.detectedStage}`;
        document.getElementById('stageBadge').textContent = stageLabel;

        // Animate confidence bar
        document.getElementById('confValue').textContent = data.confidence + '%';
        setTimeout(() => {
            document.getElementById('confFill').style.width = data.confidence + '%';
        }, 100);

        // Render current stage materials
        const recGrid = document.getElementById('recGrid');
        recGrid.innerHTML = '';

        if (data.currentStageMaterials && data.currentStageMaterials.length > 0) {
            recGrid.innerHTML += `<div style="grid-column: 1/-1; margin-bottom: 4px;">
                <h4 style="font-size:14px; font-weight:700; color:var(--grey-800); display:flex; align-items:center; gap:6px;">
                    📦 Current Stage Materials (${stageLabel})
                </h4>
            </div>`;

            recGrid.innerHTML += data.currentStageMaterials.map(m => `
                <div class="rec-card">
                    <div class="rec-icon">${priorityIconMap[m.priority] || '📦'}</div>
                    <div class="rec-info">
                        <h5>${m.name}</h5>
                        <p>${m.quantity}</p>
                    </div>
                    <div class="rec-tag">${m.priority}</div>
                </div>
            `).join('');
        }

        // Render next stage materials
        if (data.nextStage && data.nextStage !== 'completed' && data.nextStageMaterials && data.nextStageMaterials.length > 0) {
            const nextLabel = stageLabelMap[data.nextStage] || data.nextStage;
            recGrid.innerHTML += `<div style="grid-column: 1/-1; margin-top: 16px; margin-bottom: 4px;">
                <h4 style="font-size:14px; font-weight:700; color:var(--orange-600); display:flex; align-items:center; gap:6px;">
                    ➜ Next Stage Materials (${nextLabel})
                </h4>
            </div>`;

            recGrid.innerHTML += data.nextStageMaterials.map(m => `
                <div class="rec-card" style="border-color: var(--orange-200); background: #fff7ed;">
                    <div class="rec-icon">${priorityIconMap[m.priority] || '📦'}</div>
                    <div class="rec-info">
                        <h5>${m.name}</h5>
                        <p>${m.quantity}</p>
                    </div>
                    <div class="rec-tag">${m.priority}</div>
                </div>
            `).join('');
        } else if (data.nextStage === 'completed') {
            recGrid.innerHTML += `<div style="grid-column: 1/-1; margin-top: 16px; padding: 16px; background: #ecfdf5; border-radius: 12px; text-align: center;">
                <p style="font-size: 15px; font-weight: 700; color: #059669;">✅ This is the final stage — construction is nearing completion!</p>
            </div>`;
        }

        // Show mode indicator
        if (data.mode === 'fallback') {
            recGrid.innerHTML += `<div style="grid-column: 1/-1; margin-top: 12px; padding: 10px 14px; background: #fef3c7; border-radius: 10px; font-size: 12px; color: #92400e;">
                ⚠️ Running in demo mode — add your Gemini API key in the backend .env file for real AI analysis.
            </div>`;
        }

        aiResult.classList.add('visible');
        setProgress(3);

    } catch (error) {
        console.error('Analysis error:', error);
        scanOverlay.classList.remove('active');
        alert('❌ Analysis failed: ' + error.message + '\nPlease try again.');
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '🤖 Analyze Construction Stage';
    }
}

/* ============================================
   BUILDEASY — Login Page Scripts
   Connected to Express Backend API
   ============================================ */

const API_BASE = 'http://localhost:5000/api';
let selectedRole = 'customer';
let currentView = 'login'; // 'login' | 'signup' | 'forgot'

/* -------- ROLE TOGGLE -------- */
function selectRole(role) {
    selectedRole = role;
    const slider = document.getElementById('roleSlider');
    const btns = document.querySelectorAll('.role-btn');

    btns.forEach(b => b.classList.remove('active'));
    document.querySelector(`.role-btn[data-role="${role}"]`).classList.add('active');

    slider.classList.remove('admin', 'company', 'driver');
    if (role === 'admin') slider.classList.add('admin');
    else if (role === 'company') slider.classList.add('company');
    else if (role === 'driver') slider.classList.add('driver');
}

/* -------- TOGGLE PASSWORD VISIBILITY -------- */
function togglePassword(inputId) {
    const input = document.getElementById(inputId || 'loginPassword');
    const btn = input.parentElement.querySelector('.toggle-pass');
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁';
    }
}

/* -------- VIEW SWITCHING -------- */
function showLoginForm() {
    currentView = 'login';
    document.getElementById('loginFormSection').style.display = 'block';
    document.getElementById('signupFormSection').style.display = 'none';
    document.getElementById('forgotFormSection').style.display = 'none';
    document.getElementById('companySignupSection').style.display = 'none';
    document.getElementById('cardTitle').textContent = 'Login to Continue';
    document.getElementById('cardSubtitle').textContent = 'Sign in to your BuildEasy account';
    document.getElementById('cardIcon').textContent = '👋';
    document.getElementById('roleToggleWrap').style.display = 'block';
}

function showSignupForm() {
    currentView = 'signup';
    document.getElementById('loginFormSection').style.display = 'none';
    document.getElementById('signupFormSection').style.display = 'block';
    document.getElementById('forgotFormSection').style.display = 'none';
    document.getElementById('companySignupSection').style.display = 'none';
    document.getElementById('cardTitle').textContent = 'Create Account';
    document.getElementById('cardSubtitle').textContent = 'Register as a customer to get started';
    document.getElementById('cardIcon').textContent = '🚀';
    document.getElementById('roleToggleWrap').style.display = 'none';
}

function showForgotPassword() {
    currentView = 'forgot';
    document.getElementById('loginFormSection').style.display = 'none';
    document.getElementById('signupFormSection').style.display = 'none';
    document.getElementById('forgotFormSection').style.display = 'block';
    document.getElementById('companySignupSection').style.display = 'none';
    document.getElementById('cardTitle').textContent = 'Reset Password';
    document.getElementById('cardSubtitle').textContent = 'Enter your email and a new password';
    document.getElementById('cardIcon').textContent = '🔑';
    document.getElementById('roleToggleWrap').style.display = 'none';
}

function showCompanySignupForm() {
    currentView = 'companySignup';
    document.getElementById('loginFormSection').style.display = 'none';
    document.getElementById('signupFormSection').style.display = 'none';
    document.getElementById('forgotFormSection').style.display = 'none';
    document.getElementById('companySignupSection').style.display = 'block';
    document.getElementById('cardTitle').textContent = 'Register Company';
    document.getElementById('cardSubtitle').textContent = 'List your materials on BuildEasy marketplace';
    document.getElementById('cardIcon').textContent = '🏢';
    document.getElementById('roleToggleWrap').style.display = 'none';
}

/* -------- HANDLE LOGIN -------- */
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('btnLogin');

    if (!email || !password) {
        showToast('Please fill in all fields.', 'error');
        return false;
    }

    // Show loading spinner
    btn.classList.add('loading');

    try {
        // Use different endpoint for driver login
        const loginUrl = selectedRole === 'driver'
            ? `${API_BASE}/auth/login-driver`
            : `${API_BASE}/auth/login`;

        const bodyData = selectedRole === 'driver'
            ? { email, password }
            : { email, password, role: selectedRole };

        const res = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData),
        });

        const result = await res.json();
        btn.classList.remove('loading');

        if (!res.ok || !result.success) {
            showToast(result.message || 'Login failed. Please try again.', 'error');
            return false;
        }

        // Store JWT token, user data, and role in localStorage
        localStorage.setItem('token', result.token);
        localStorage.setItem('role', result.role || result.data.role);
        localStorage.setItem('user', JSON.stringify(result.data));

        showToast(result.message || 'Login successful! Redirecting...', 'success');

        // Redirect based on role
        setTimeout(() => {
            const role = result.data.role || result.role;
            if (role === 'admin') {
                window.location.href = 'admin.html';
            } else if (role === 'company') {
                window.location.href = 'company-dashboard.html';
            } else if (role === 'driver') {
                window.location.href = 'driver-dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 1200);
    } catch (error) {
        btn.classList.remove('loading');
        console.error('Login error:', error);
        showToast('Server unavailable. Please try again later.', 'error');
    }

    return false;
}

/* -------- HANDLE SIGNUP -------- */
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const password = document.getElementById('signupPassword')?.value;
    const btn = document.getElementById('btnSignup');

    if (!name || !email || !password) {
        showToast('Please fill in all fields.', 'error');
        return false;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return false;
    }

    btn.classList.add('loading');

    try {
        // NOTE: No 'role' sent — backend forces 'customer'
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });

        const result = await res.json();
        btn.classList.remove('loading');

        if (!res.ok || !result.success) {
            showToast(result.message || 'Signup failed.', 'error');
            return false;
        }

        // Store token, role, and user data immediately after signup
        localStorage.setItem('token', result.token);
        localStorage.setItem('role', result.role || 'customer');
        localStorage.setItem('user', JSON.stringify(result.data));

        showToast('Account created! Redirecting...', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    } catch (error) {
        btn.classList.remove('loading');
        console.error('Signup error:', error);
        showToast('Server unavailable. Please try again later.', 'error');
    }

    return false;
}

/* -------- HANDLE FORGOT PASSWORD -------- */
async function handleResetPassword(e) {
    e.preventDefault();
    const email = document.getElementById('resetEmail')?.value.trim();
    const newPassword = document.getElementById('resetPassword')?.value;
    const btn = document.getElementById('btnReset');

    if (!email || !newPassword) {
        showToast('Please fill in all fields.', 'error');
        return false;
    }

    if (newPassword.length < 6) {
        showToast('New password must be at least 6 characters.', 'error');
        return false;
    }

    btn.classList.add('loading');

    try {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPassword }),
        });

        const result = await res.json();
        btn.classList.remove('loading');

        if (!res.ok || !result.success) {
            showToast(result.message || 'Password reset failed.', 'error');
            return false;
        }

        showToast(result.message || 'Password reset! You can now login.', 'success');
        // Switch back to login form after reset
        setTimeout(() => { showLoginForm(); }, 1500);
    } catch (error) {
        btn.classList.remove('loading');
        console.error('Reset error:', error);
        showToast('Server unavailable. Please try again later.', 'error');
    }

    return false;
}

/* -------- TOAST NOTIFICATIONS -------- */
function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

/* Legacy compat */
function signupUser() {
    return handleSignup(new Event('submit'));
}
function loginUser() {
    return handleLogin(new Event('submit'));
}

/* -------- COMPANY SIGNUP -------- */
async function handleCompanySignup(e) {
    e.preventDefault();
    const name = document.getElementById('companyOwnerName')?.value.trim();
    const companyName = document.getElementById('companyName')?.value.trim();
    const email = document.getElementById('companyEmail')?.value.trim();
    const password = document.getElementById('companyPassword')?.value;
    const phone = document.getElementById('companyPhone')?.value.trim();
    const address = document.getElementById('companyAddress')?.value.trim();
    const gstNumber = document.getElementById('companyGST')?.value.trim();
    const businessType = document.getElementById('companyBusinessType')?.value;
    const longitude = parseFloat(document.getElementById('companyLng')?.value);
    const latitude = parseFloat(document.getElementById('companyLat')?.value);
    const btn = document.getElementById('btnCompanySignup');

    if (!name || !companyName || !email || !password || isNaN(longitude) || isNaN(latitude)) {
        showToast('Please fill in all required fields.', 'error');
        return false;
    }
    if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return false;
    }

    btn.classList.add('loading');

    try {
        const res = await fetch(`${API_BASE}/auth/register-company`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, companyName, email, password, phone, address, longitude, latitude, gstNumber: gstNumber || undefined, businessType }),
        });

        const result = await res.json();
        btn.classList.remove('loading');

        if (!res.ok || !result.success) {
            showToast(result.message || 'Registration failed.', 'error');
            return false;
        }

        localStorage.setItem('token', result.token);
        localStorage.setItem('role', 'company');
        localStorage.setItem('user', JSON.stringify(result.data));

        showToast(result.message || 'Company registered! Awaiting admin approval.', 'success');
        setTimeout(() => { window.location.href = 'company-dashboard.html'; }, 1500);
    } catch (error) {
        btn.classList.remove('loading');
        console.error('Company signup error:', error);
        showToast('Server unavailable. Please try again later.', 'error');
    }
    return false;
}

/* -------- AUTO-DETECT LOCATION -------- */
function detectCompanyLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation not supported by your browser.', 'error');
        return;
    }
    showToast('Detecting your location...', 'success');
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            document.getElementById('companyLng').value = pos.coords.longitude.toFixed(6);
            document.getElementById('companyLat').value = pos.coords.latitude.toFixed(6);
            showToast('Location detected!', 'success');
        },
        (err) => {
            showToast('Location detection failed: ' + err.message, 'error');
        }
    );
}

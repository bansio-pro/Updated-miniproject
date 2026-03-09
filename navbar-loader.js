// ============================================
// BUILDEASY — Navbar Loader
// Dynamically loads navbar.html via fetch(),
// sets the active link, and applies role-based
// visibility from localStorage auth state.
// ============================================

(function () {
    'use strict';

    /**
     * Load the shared navbar into #navbar-placeholder,
     * then initialise active-link highlighting, auth
     * visibility, hamburger menu, and scroll effects.
     */
    async function loadNavbar() {
        const placeholder = document.getElementById('navbar-placeholder');
        if (!placeholder) return;

        try {
            const res = await fetch('navbar.html');
            if (!res.ok) throw new Error('Failed to load navbar.html');
            placeholder.innerHTML = await res.text();
        } catch (err) {
            console.error('[NavbarLoader]', err);
            return;
        }

        setActiveLink();
        applyAuthVisibility();
        initHamburgerMenu();
        initHeaderScroll();
    }

    // ---------- Active Link Highlighting ----------
    function setActiveLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const links = document.querySelectorAll('#navLinks a');

        links.forEach(link => {
            const href = link.getAttribute('href');
            // Strip hash fragments for comparison
            const linkPage = href.split('#')[0].split('/').pop();
            if (linkPage === currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // ---------- Role-Based Visibility ----------
    function applyAuthVisibility() {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        const myOrders = document.getElementById('navMyOrders');
        const adminDash = document.getElementById('navAdminDash');
        const companyDash = document.getElementById('navCompanyDash');
        const authCta = document.getElementById('navAuthCta');

        if (!token) {
            if (myOrders) myOrders.style.display = 'none';
            if (adminDash) adminDash.style.display = 'none';
            if (companyDash) companyDash.style.display = 'none';
            if (authCta) {
                authCta.textContent = 'Login';
                authCta.href = 'login.html';
                authCta.onclick = null;
            }
            return;
        }

        // Logged in
        if (role === 'admin') {
            if (adminDash) adminDash.style.display = '';
            if (myOrders) myOrders.style.display = 'none';
            if (companyDash) companyDash.style.display = 'none';
        } else if (role === 'company') {
            if (companyDash) companyDash.style.display = '';
            if (adminDash) adminDash.style.display = 'none';
            if (myOrders) myOrders.style.display = 'none';
        } else {
            // customer
            if (myOrders) myOrders.style.display = '';
            if (adminDash) adminDash.style.display = 'none';
            if (companyDash) companyDash.style.display = 'none';
        }

        // Swap Login → Logout
        if (authCta) {
            authCta.textContent = 'Logout';
            authCta.href = '#';
            authCta.onclick = function (e) {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            };
        }
    }

    // ---------- Hamburger Menu ----------
    function initHamburgerMenu() {
        const hamburger = document.getElementById('hamburger');
        const navLinks = document.getElementById('navLinks');

        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navLinks.classList.toggle('open');
            });

            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navLinks.classList.remove('open');
                });
            });
        }
    }

    // ---------- Header Scroll Effect ----------
    function initHeaderScroll() {
        const header = document.getElementById('header');
        if (!header) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // ---------- Run on DOM ready ----------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadNavbar);
    } else {
        loadNavbar();
    }
})();

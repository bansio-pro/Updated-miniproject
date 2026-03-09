// ============================================
// BUILDEASY — Script.js
// Scroll animations, header effects & mobile menu
// ============================================

// (Hamburger menu and header scroll effect
//  are now handled by navbar-loader.js)

// ---------- Scroll Fade-In Animation ----------
const fadeElements = document.querySelectorAll('.fade-in');

if (fadeElements.length > 0) {
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger the animation for elements in the same section
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, index * 80);
                fadeObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    fadeElements.forEach(el => fadeObserver.observe(el));
}

// ---------- Order Material (kept from original) ----------
function orderMaterial(material) {
    alert(material + " added to cart!");
}

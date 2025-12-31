// ==================== //
// LA SANTA CALAVERA    //
// Modern Landing Page  //
// ==================== //

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollAnimations();
    initCounters();
    initCursorGlow();
    initSmoothScroll();
    initImageModal();
    initGallery();
    
    console.log('%c☠ La Santa Calavera ☠', 'font-size: 24px; color: #D4AF37; font-weight: bold; text-shadow: 0 0 10px #D4AF37;');
    console.log('%cDesde las Sombras', 'font-size: 14px; color: #B8B8B8; font-style: italic;');
});

// === NAVIGATION ===
function initNavigation() {
    const nav = document.querySelector('.navigation');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Scroll-based navigation styling
    let lastScroll = 0;
    let ticking = false;
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleNavScroll(nav);
                ticking = false;
            });
            ticking = true;
        }
    });
    
    // Active section highlighting
    window.addEventListener('scroll', () => {
        highlightActiveSection(navLinks);
    });
}

function handleNavScroll(nav) {
    const scrollY = window.scrollY;
    
    if (scrollY > 100) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
}

function highlightActiveSection(navLinks) {
    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.scrollY + 200;
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

// === SCROLL ANIMATIONS ===
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -100px 0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Trigger counter animation if it's a stat card
                if (entry.target.classList.contains('stat-card')) {
                    const counter = entry.target.querySelector('.stat-number');
                    if (counter && !counter.dataset.animated) {
                        animateCounter(counter);
                        counter.dataset.animated = 'true';
                    }
                }
            }
        });
    }, observerOptions);
    
    // Observe all fade-in elements
    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

// === COUNTER ANIMATION ===
function initCounters() {
    // Counters will be triggered by scroll animation
}

function animateCounter(element) {
    const target = parseInt(element.dataset.target);
    if (isNaN(target)) return;
    
    const duration = 2000;
    const startTime = performance.now();
    const startValue = 0;
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (target - startValue) * easeOutQuart);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// === CURSOR GLOW ===
function initCursorGlow() {
    const cursorGlow = document.querySelector('.cursor-glow');
    if (!cursorGlow) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    function animateCursor() {
        // Smooth follow with lerp
        currentX += (mouseX - currentX) * 0.1;
        currentY += (mouseY - currentY) * 0.1;
        
        cursorGlow.style.left = currentX + 'px';
        cursorGlow.style.top = currentY + 'px';
        
        requestAnimationFrame(animateCursor);
    }
    
    animateCursor();
}

// === SMOOTH SCROLL ===
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (!targetElement) return;
            
            const navHeight = document.querySelector('.navigation').offsetHeight;
            const targetPosition = targetElement.offsetTop - navHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        });
    });
    
    // Hero CTA button
    const heroCta = document.querySelector('.hero-cta');
    if (heroCta) {
        heroCta.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector('#historia');
            if (target) {
                const navHeight = document.querySelector('.navigation').offsetHeight;
                window.scrollTo({
                    top: target.offsetTop - navHeight - 20,
                    behavior: 'smooth'
                });
            }
        });
    }
}

// === NEGOCIO CARD INTERACTIONS ===
document.querySelectorAll('.negocio-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.zIndex = '10';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.zIndex = '1';
    });
});

// === TIMELINE MARKERS ===
const timelineMarkers = document.querySelectorAll('.timeline-marker');
timelineMarkers.forEach((marker, index) => {
    marker.style.animationDelay = `${index * 0.2}s`;
});

// === EASTER EGGS ===
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join('') === konamiSequence.join('')) {
        activateGoldMode();
    }
});

function activateGoldMode() {
    document.body.style.transition = 'filter 1s ease';
    document.body.style.filter = 'sepia(50%) saturate(150%)';
    
    // Create gold particles
    for (let i = 0; i < 30; i++) {
        createGoldParticle();
    }
    
    setTimeout(() => {
        document.body.style.filter = 'none';
    }, 3000);
    
    console.log('%c🎉 GOLD MODE ACTIVATED! 🎉', 'font-size: 20px; color: #FFD700; font-weight: bold;');
}

function createGoldParticle() {
    const particle = document.createElement('div');
    particle.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: #D4AF37;
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        left: ${Math.random() * 100}vw;
        top: -20px;
        animation: particleFall ${2 + Math.random() * 2}s linear forwards;
        box-shadow: 0 0 10px rgba(212, 175, 55, 0.8);
    `;
    
    document.body.appendChild(particle);
    
    setTimeout(() => particle.remove(), 4000);
}

// Add particle animation
const style = document.createElement('style');
style.textContent = `
    @keyframes particleFall {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// === IMAGE MODAL ===
function initImageModal() {
    const modal = document.getElementById('imageModal');
    if (!modal) return;
    
    const backdrop = modal.querySelector('.modal-backdrop');
    const closeBtn = modal.querySelector('.modal-close');
    const prevBtn = modal.querySelector('.modal-prev');
    const nextBtn = modal.querySelector('.modal-next');
    const gallery = modal.querySelector('.modal-gallery');
    const counter = modal.querySelector('.modal-counter');
    const title = modal.querySelector('.modal-title');
    
    let currentImages = [];
    let currentIndex = 0;
    
    // Close modal
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        currentImages = [];
        currentIndex = 0;
    }
    
    // Open modal with images
    window.openImageModal = function(images, titleText, startIndex = 0) {
        currentImages = images;
        currentIndex = startIndex;
        title.textContent = titleText;
        
        // Build gallery with subtitles
        gallery.innerHTML = images.map(img => 
            `<div class="modal-slide">
                <img src="${img.src}" alt="${img.alt || ''}" loading="lazy">
                <div class="modal-slide-info">
                    <span class="modal-slide-title">${img.alt || ''}</span>
                    ${img.subtitle ? `<span class="modal-slide-subtitle">${img.subtitle}</span>` : ''}
                </div>
            </div>`
        ).join('');
        
        updateModalView();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };
    
    // Update view
    function updateModalView() {
        gallery.style.transform = `translateX(-${currentIndex * 100}%)`;
        counter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
        
        prevBtn.style.opacity = currentIndex === 0 ? '0.3' : '1';
        nextBtn.style.opacity = currentIndex === currentImages.length - 1 ? '0.3' : '1';
    }
    
    // Navigation
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateModalView();
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentIndex < currentImages.length - 1) {
            currentIndex++;
            updateModalView();
        }
    });
    
    // Close handlers
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;
        
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            currentIndex--;
            updateModalView();
        }
        if (e.key === 'ArrowRight' && currentIndex < currentImages.length - 1) {
            currentIndex++;
            updateModalView();
        }
    });
}

// === GALLERY INITIALIZATION ===
function initGallery() {
    // Casa gallery items
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const img = item.querySelector('img');
            const titleEl = item.querySelector('h4');
            
            // Get all images from casa gallery for slideshow
            const allImages = Array.from(document.querySelectorAll('.casa-gallery .gallery-item')).map(el => ({
                src: el.querySelector('img').src,
                alt: el.querySelector('h4')?.textContent || ''
            }));
            
            // Find current index
            const currentSrc = img.src;
            const startIndex = allImages.findIndex(i => i.src === currentSrc);
            
            window.openImageModal(allImages, 'La Fuente Blanca', startIndex >= 0 ? startIndex : 0);
        });
    });
    
    // Negocio gallery buttons (prepared for future images)
    const galleryBtns = document.querySelectorAll('.negocio-gallery-btn');
    
    galleryBtns.forEach(btn => {
        const galleryId = btn.dataset.gallery;
        
        // Check if images exist for this gallery
        if (window.negocioGalleries && window.negocioGalleries[galleryId]) {
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = 'Bilder anzeigen';
            
            btn.addEventListener('click', () => {
                const galleryData = window.negocioGalleries[galleryId];
                window.openImageModal(galleryData.images, galleryData.title);
            });
        }
    });
}

// Gallery data storage - mit detaillierten Untertiteln basierend auf Dateinamen
window.negocioGalleries = {
    taxi: {
        title: 'El Servicio de Taxi',
        images: [
            { src: 'images/taxi/driver-overview.png', alt: 'Fahrerübersicht', subtitle: 'Alle aktiven Fahrer auf einen Blick' },
            { src: 'images/taxi/taxi-management-tour-view.png', alt: 'Touren Management', subtitle: 'Verwaltung aller laufenden Touren' },
            { src: 'images/taxi/assign-driver-view.png', alt: 'Fahrer Zuweisung', subtitle: 'Fahrer zu Touren zuweisen' },
            { src: 'images/taxi/zielort-view.png', alt: 'Zielorte Verwaltung', subtitle: 'Alle verfügbaren Zielorte' },
            { src: 'images/taxi/destination-detail-view.png', alt: 'Zielort Details', subtitle: 'Detailansicht eines Zielortes' },
            { src: 'images/taxi/key-creation-view.png', alt: 'Schlüssel Erstellung', subtitle: 'Neue Zugangsschlüssel generieren' },
            { src: 'images/taxi/access-key-view.png', alt: 'Zugangsschlüssel', subtitle: 'Übersicht der Zugangsschlüssel' }
        ]
    },
    weekly: {
        title: 'Las Entregas Semanales',
        images: [
            { src: 'images/weekly/wochenabgabe-view.png', alt: 'Wochenabgabe Hauptansicht', subtitle: 'Zentrale Übersicht aller Wochenabgaben' },
            { src: 'images/weekly/weekly-stats.png', alt: 'Wochenstatistiken', subtitle: 'Statistische Auswertung der Woche' },
            { src: 'images/weekly/overall-stats.png', alt: 'Gesamtstatistiken', subtitle: 'Langzeitstatistiken im Überblick' },
            { src: 'images/weekly/family-sammeln-overview.png', alt: 'Sammelabgaben Übersicht', subtitle: 'Familienweite Sammeleingaben' },
            { src: 'images/weekly/family-sammeln-entry-step1.png', alt: 'Sammelabgabe Eingabe', subtitle: 'Neue Sammelabgabe erfassen' },
            { src: 'images/weekly/family-sammeln-entry-post.png', alt: 'Sammelabgabe Bestätigung', subtitle: 'Erfolgreiche Abgabebestätigung' },
            { src: 'images/weekly/family-adjust-tours-view.png', alt: 'Touren Anpassung', subtitle: 'Familientouren bearbeiten' },
            { src: 'images/weekly/verarbeiter-tracking-view.png', alt: 'Verarbeiter Tracking', subtitle: 'Verfolgung der Verarbeitungsprozesse' }
        ]
    },
    tafelrunde: {
        title: 'La Mesa Redonda',
        images: [
            { src: 'images/tafelrunde/main.png', alt: 'Tafelrunden Übersicht', subtitle: 'Alle aktiven Tafelrunden im Blick' },
            { src: 'images/tafelrunde/management.png', alt: 'Tafelrunden Management', subtitle: 'Verwaltung und Koordination' },
            { src: 'images/tafelrunde/erstellen-1.png', alt: 'Erstellen – Schritt 1', subtitle: 'Neue Tafelrunde anlegen' },
            { src: 'images/tafelrunde/erstellen-2.png', alt: 'Erstellen – Schritt 2', subtitle: 'Details und Teilnehmer festlegen' }
        ]
    },
    partner: {
        title: 'La Red de Socios',
        images: [
            { src: 'images/partner/partner-dashboard.png', alt: 'Partner Dashboard', subtitle: 'Persönliche Übersicht für Partner' },
            { src: 'images/partner/login.png', alt: 'Partner Login', subtitle: 'Sicherer Zugang zum System' },
            { src: 'images/partner/request-access.png', alt: 'Zugang beantragen', subtitle: 'Partnerschaft anfragen' },
            { src: 'images/partner/request-submitted.png', alt: 'Antrag eingereicht', subtitle: 'Bestätigung der Anfrage' },
            { src: 'images/partner/submitted-request-partner.png', alt: 'Eingereichte Anfrage', subtitle: 'Status der Partneranfrage' },
            { src: 'images/partner/partner-management-requestmanagement.png', alt: 'Anfragen Management', subtitle: 'Verwaltung eingehender Anfragen' },
            { src: 'images/partner/request-management-internal.png', alt: 'Interne Verwaltung', subtitle: 'Internes Anfragen-Processing' },
            { src: 'images/partner/listenfuehrung-vorschlag-partner.png', alt: 'Listenführungs-Vorschlag', subtitle: 'Partner-Vorschläge für Listen' },
            { src: 'images/partner/map-vorschlag-partner.png', alt: 'Kartenvorschlag', subtitle: 'POI-Vorschlag einreichen' },
            { src: 'images/partner/map-delete-vorschlag-partner.png', alt: 'Vorschlag löschen', subtitle: 'Vorschlag zurückziehen' },
            { src: 'images/partner/tafelrunde-access-partner.png', alt: 'Tafelrunden-Zugang', subtitle: 'Partner-Zugriff auf Tafelrunden' }
        ]
    },
    map: {
        title: 'El Mapa Interactivo',
        images: [
            { src: 'images/map/map-overview-with-details.png', alt: 'Kartenübersicht', subtitle: 'Vollständige Kartenansicht mit Details' },
            { src: 'images/map/map-roxwood.png', alt: 'Roxwood Gebiet', subtitle: 'Detailkarte der Roxwood Region' },
            { src: 'images/map/map-cayo.png', alt: 'Cayo Perico', subtitle: 'Die Insel im Überblick' },
            { src: 'images/map/new-poi-creation.png', alt: 'POI erstellen', subtitle: 'Neuen Point of Interest anlegen' },
            { src: 'images/map/poi-created.png', alt: 'POI erstellt', subtitle: 'Erfolgreiche POI-Erstellung' },
            { src: 'images/map/polygon-marker-showcase-step1.png', alt: 'Polygon – Schritt 1', subtitle: 'Gebietsmarkierung beginnen' },
            { src: 'images/map/polygon-marker-showcase-step2.png', alt: 'Polygon – Schritt 2', subtitle: 'Gebietsgrenzen definieren' },
            { src: 'images/map/polygon-marker-showcase-created.png', alt: 'Polygon erstellt', subtitle: 'Fertige Gebietsmarkierung' },
            { src: 'images/map/map-vorschlag-view.png', alt: 'Vorschläge verwalten', subtitle: 'Eingereichte Kartenvorschläge' }
        ]
    },
    bloodlist: {
        title: 'La Lista de Sangre',
        images: [
            { src: 'images/bloodlist/overview.png', alt: 'Blutliste Übersicht', subtitle: 'Alle Mitglieder auf einen Blick' },
            { src: 'images/bloodlist/bloodin-view.png', alt: 'Blood In Zeremonie', subtitle: 'Aufnahme neuer Familienmitglieder' },
            { src: 'images/bloodlist/bloodout-view.png', alt: 'Blood Out Zeremonie', subtitle: 'Ausscheiden aus der Familie' },
            { src: 'images/bloodlist/history.png', alt: 'Blutliste Historie', subtitle: 'Chronik aller Zeremonien' }
        ]
    },
    roster: {
        title: 'La Organización',
        images: [
            { src: 'images/roster/main-view.png', alt: 'Aufstellungssystem', subtitle: 'Hierarchie und Struktur der Familie' },
            { src: 'images/abmeldung/main-view.png', alt: 'Abmeldungssystem', subtitle: 'Verwaltung von Abwesenheiten' }
        ]
    }
};

// === VISIBILITY CHANGE ===
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.title = '¡Vuelve pronto! | La Santa Calavera';
    } else {
        document.title = 'La Santa Calavera | Desde las Sombras';
    }
});

// === PERFORMANCE LOG ===
window.addEventListener('load', () => {
    if (window.performance && window.performance.timing) {
        const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
        console.log(`%c⚡ Page loaded in ${loadTime}ms`, 'color: #4A8522; font-weight: bold;');
    }
});

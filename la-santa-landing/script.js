// ==================== //
// LA SANTA - Enhanced JS   //
// ==================== //

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            
            // Trigger counter animation for stat cards
            if (entry.target.classList.contains('stat-card-enhanced')) {
                const statNumber = entry.target.querySelector('.stat-number');
                if (statNumber && !statNumber.dataset.animated) {
                    animateCounter(statNumber);
                    statNumber.dataset.animated = 'true';
                }
            }
        }
    });
}, observerOptions);

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initializeAnimations();
    initializeNavigation();
    initializeScrollEffects();
    initializeRangCards();
    createParticles();
    initializeTooltips();
    
    console.log('%c🎉 La Santa - Sistema Iniciado 🎉', 'font-size: 20px; color: #D4AF37; font-weight: bold;');
    console.log('%cLealtad. Honor. Sangre.', 'font-size: 14px; color: #F4E4A7; font-style: italic;');
});

// Initialize fade-in animations
function initializeAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');
    
    fadeElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        observer.observe(el);
    });
}

// Navigation scroll behavior
function initializeNavigation() {
    const nav = document.querySelector('.navigation');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    // Smooth scroll for anchor links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const navHeight = nav.offsetHeight;
                const targetPosition = targetSection.offsetTop - navHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Navigation background on scroll
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
    
    // Scroll indicator click
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            const historiaSection = document.querySelector('#historia');
            if (historiaSection) {
                historiaSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
}

// Parallax and scroll effects
function initializeScrollEffects() {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        // Parallax for hero
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.5}px)`;
            hero.style.opacity = 1 - (scrolled / 1000);
        }
        
        // Active section highlighting in nav
        highlightActiveSection();
    });
}

// Highlight active section in navigation
function highlightActiveSection() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    let current = '';
    const scrollPosition = window.pageYOffset + 200;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${current}`) {
            link.style.color = 'var(--gold-primary)';
        }
    });
}

// Rang cards hover effects
function initializeRangCards() {
    const rangCards = document.querySelectorAll('.rang-detailed, .rang-compact, .valor-card, .sistema-card');
    
    rangCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // Golden glow effect on headers
            const header = this.querySelector('h3, h4');
            if (header) {
                header.style.textShadow = '0 0 20px rgba(212, 175, 55, 0.8)';
            }
            
            // Icon animation
            const icon = this.querySelector('.rang-icon, .valor-icon, .sistema-icon');
            if (icon) {
                icon.style.transform = 'scale(1.1) rotate(5deg)';
                icon.style.transition = 'transform 0.3s ease';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            const header = this.querySelector('h3, h4');
            if (header) {
                header.style.textShadow = '';
            }
            
            const icon = this.querySelector('.rang-icon, .valor-icon, .sistema-icon');
            if (icon) {
                icon.style.transform = '';
            }
        });
    });
}

// Counter animation for statistics
function animateCounter(element) {
    const target = parseInt(element.dataset.target) || parseInt(element.textContent);
    const duration = 2000; // 2 seconds
    const fps = 60;
    const increment = target / (duration / (1000 / fps));
    let current = 0;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 1000 / fps);
}

// Golden particles effect in hero
function createParticles() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 3 + 1;
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        const duration = Math.random() * 10 + 5;
        const delay = Math.random() * 5;
        const drift = Math.random() * 100 - 50;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(212, 175, 55, ${Math.random() * 0.5 + 0.3});
            border-radius: 50%;
            pointer-events: none;
            left: ${startX}%;
            top: ${startY}%;
            animation: floatParticle ${duration}s linear infinite;
            animation-delay: ${delay}s;
            box-shadow: 0 0 ${size * 2}px rgba(212, 175, 55, 0.5);
        `;
        
        hero.appendChild(particle);
    }
    
    // Add float animation dynamically
    if (!document.querySelector('#particle-animation')) {
        const style = document.createElement('style');
        style.id = 'particle-animation';
        style.textContent = `
            @keyframes floatParticle {
                0% {
                    transform: translateY(0) translateX(0);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% {
                    transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Tooltips for interactive elements
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(el => {
        el.addEventListener('mouseenter', function(e) {
            const tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';
            tooltip.textContent = this.dataset.tooltip;
            tooltip.style.cssText = `
                position: absolute;
                background: var(--dark-accent);
                color: var(--gold-light);
                padding: 8px 15px;
                border-radius: 5px;
                font-size: 0.9rem;
                pointer-events: none;
                z-index: 10000;
                border: 1px solid var(--gold-dark);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
            `;
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + window.pageYOffset + 'px';
            
            this.tooltipElement = tooltip;
        });
        
        el.addEventListener('mouseleave', function() {
            if (this.tooltipElement) {
                this.tooltipElement.remove();
                this.tooltipElement = null;
            }
        });
    });
}

// Timeline marker pulse effect
function initializeTimelineMarkers() {
    const markers = document.querySelectorAll('.timeline-marker');
    
    markers.forEach((marker, index) => {
        setTimeout(() => {
            marker.style.animation = 'pulse 2s ease-in-out infinite';
        }, index * 200);
    });
}

// Smooth reveal for timeline items
const timelineObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateX(0)';
        }
    });
}, { threshold: 0.3 });

document.querySelectorAll('.timeline-item').forEach((item, index) => {
    item.style.opacity = '0';
    item.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    
    if (index % 2 === 0) {
        item.style.transform = 'translateX(-50px)';
    } else {
        item.style.transform = 'translateX(50px)';
    }
    
    timelineObserver.observe(item);
});

// Sistema cards reveal animation
const sistemaObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, index * 50);
        }
    });
}, { threshold: 0.2 });

document.querySelectorAll('.sistema-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    sistemaObserver.observe(card);
});

// Keyboard shortcuts (easter egg)
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join('') === konamiSequence.join('')) {
        activateKonamiEasterEgg();
    }
    
    // Secret key: 'L' for Lealtad
    if (e.key === 'l' && e.ctrlKey) {
        activateLealtadMode();
    }
});

function activateKonamiEasterEgg() {
    const body = document.body;
    
    // Rainbow hue rotation
    body.style.transition = 'filter 2s ease';
    body.style.filter = 'hue-rotate(180deg) saturate(150%)';
    
    // Confetti effect
    createConfetti();
    
    setTimeout(() => {
        body.style.filter = 'none';
    }, 5000);
    
    console.log('%c🎉 KONAMI CODE ACTIVATED! 🎉', 'font-size: 24px; color: #FFD700; font-weight: bold; text-shadow: 0 0 10px #D4AF37;');
    console.log('%cLealtad. Honor. Sangre.', 'font-size: 16px; color: #F4E4A7; font-style: italic;');
}

function activateLealtadMode() {
    const allText = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, li');
    
    allText.forEach(el => {
        el.style.transition = 'all 0.5s ease';
        el.style.color = 'var(--gold-primary)';
    });
    
    setTimeout(() => {
        allText.forEach(el => {
            el.style.color = '';
        });
    }, 3000);
    
    console.log('%c⚡ LEALTAD MODE ACTIVATED! ⚡', 'font-size: 20px; color: #D4AF37; font-weight: bold;');
}

function createConfetti() {
    const colors = ['#D4AF37', '#F4E4A7', '#FFD700', '#B8941E'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            top: -20px;
            opacity: 1;
            pointer-events: none;
            z-index: 10000;
            animation: confettiFall ${Math.random() * 3 + 2}s linear forwards;
            transform: rotate(${Math.random() * 360}deg);
        `;
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 5000);
    }
    
    // Add confetti animation
    if (!document.querySelector('#confetti-animation')) {
        const style = document.createElement('style');
        style.id = 'confetti-animation';
        style.textContent = `
            @keyframes confettiFall {
                to {
                    transform: translateY(100vh) rotate(720deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Log version info
console.log('%cLa Santa - Landing Page v2.0', 'color: #D4AF37; font-size: 16px; font-weight: bold;');
console.log('%cDesde las Sombras', 'color: #B8B8B8; font-style: italic;');
console.log('%c25 Hermanos | 9 Meses | 16 Sistemas | 1 Familia', 'color: #F4E4A7;');

// Performance monitoring
if (window.performance && window.performance.timing) {
    window.addEventListener('load', () => {
        const perfData = window.performance.timing;
        const loadTime = perfData.loadEventEnd - perfData.navigationStart;
        console.log(`%c⚡ Page loaded in ${loadTime}ms`, 'color: #2D5016; font-weight: bold;');
    });
}

// Smooth scroll polyfill for older browsers
if (!('scrollBehavior' in document.documentElement.style)) {
    const scrollToElement = (element) => {
        const targetPosition = element.offsetTop - 80;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 1000;
        let start = null;
        
        const animation = (currentTime) => {
            if (start === null) start = currentTime;
            const timeElapsed = currentTime - start;
            const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
        };
        
        const easeInOutQuad = (t, b, c, d) => {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        };
        
        requestAnimationFrame(animation);
    };
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) scrollToElement(target);
        });
    });
}

// Initialize timeline markers after DOM load
setTimeout(initializeTimelineMarkers, 500);

// Visibility change handler
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('%cHasta luego, Hermano...', 'color: #B8B8B8; font-style: italic;');
    } else {
        console.log('%c¡Bienvenido de vuelta!', 'color: #D4AF37; font-weight: bold;');
    }
});

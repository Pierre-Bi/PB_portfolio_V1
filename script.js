/* =========================================
   5. PRELOADER (SESSION UNIQUE)
   ========================================= */
window.addEventListener('load', () => {
    const loader = document.getElementById('preloader');
    
    if (loader) {
        // On regarde dans la mémoire du navigateur si on est déjà passé
        const hasVisited = sessionStorage.getItem('hasVisited');

        if (hasVisited) {
            // C'est un retour sur l'accueil -> On cache tout de suite
            loader.style.display = 'none';
        } else {
            // C'est la première visite -> On joue l'animation
            
            // On note le passage pour la prochaine fois
            sessionStorage.setItem('hasVisited', 'true');

            // On attend 2.5 secondes (temps de lecture)
            setTimeout(() => {
                loader.classList.add('loader-hidden');
                
                // On supprime l'élément une fois l'animation finie
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 1000); 
            }, 2500); 
        }
    }
});

/* =========================================
   1. HORLOGE (STRASBOURG TIME)
   ========================================= */
function updateClock() {
    const clockElement = document.getElementById('clock');
    if (!clockElement) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris'
    });
    clockElement.textContent = timeString;
}
setInterval(updateClock, 1000);
updateClock();

/* =========================================
   2. THÈME (DARK / LIGHT MODE)
   ========================================= */
const toggleBtn = document.getElementById('theme-toggle-btn');
const html = document.documentElement;

const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    html.setAttribute('data-theme', savedTheme);
    updateIcon(savedTheme);
}

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme);
    });
}

function updateIcon(theme) {
    if (!toggleBtn) return;
    const icon = toggleBtn.querySelector('i');
    if (theme === 'light') {
        icon.classList.replace('ph-moon', 'ph-sun');
    } else {
        icon.classList.replace('ph-sun', 'ph-moon');
    }
}

/* =========================================
   3. CARROUSEL 3D (ULTRA FLUIDE)
   ========================================= */
const carousel = document.querySelector(".carousel");
const cards = document.querySelectorAll(".card");
const scene = document.querySelector(".scene");

if (carousel && cards.length > 0) {
    
    // --- Configuration ---
    const numCards = cards.length;
    const theta = 360 / numCards; 
    let radius = Math.round((cards[0].offsetWidth / 2) / Math.tan(Math.PI / numCards));

    // --- VARIABLES DE MOUVEMENT ---
    
    // Navigation (Scroll)
    let targetRot = 0;   
    let currentRot = 0;

    // Tilt (Souris)
    let targetTiltX = 0; 
    let currentTiltX = 0;
    let targetTiltY = 0; 
    let currentTiltY = 0;

    // --- RÉGLAGES "LUXE" ---
    // C'est ici que se joue la fluidité :
    const tiltLimit = 7;      // Angle très faible (7°) pour la subtilité
    const rotSmoothing = 0.05; // Inertie Scroll (Lourd)
    const tiltSmoothing = 0.04; // Inertie Souris (Très fluide, comme dans l'eau)

    // --- A. INITIALISATION ---
    cards.forEach((card, index) => {
        card.style.transform = `rotateY(${index * theta}deg) translateZ(${radius + 50}px)`;
    });

    // --- B. MÉMOIRE ---
    const savedAngle = sessionStorage.getItem('carouselAngle');
    if (savedAngle) {
        const saved = parseFloat(savedAngle);
        targetRot = saved;
        currentRot = saved;
    }

    // --- C. BOUCLE D'ANIMATION (MOTEUR PHYSIQUE) ---
    function animate() {
        // 1. Lissage Scroll
        currentRot += (targetRot - currentRot) * rotSmoothing;

        // 2. Lissage Tilt (C'est ici que la fluidité opère)
        currentTiltX += (targetTiltX - currentTiltX) * tiltSmoothing;
        currentTiltY += (targetTiltY - currentTiltY) * tiltSmoothing;

        // 3. Arrondi (Anti-aliasing)
        const r = Math.round(currentRot * 1000) / 1000;
        const tx = Math.round(currentTiltX * 1000) / 1000;
        const ty = Math.round(currentTiltY * 1000) / 1000;

        // 4. Application
        carousel.style.transform = `rotateY(${r}deg) rotateX(${tx}deg) rotateY(${ty}deg)`;

        requestAnimationFrame(animate);
    }
    animate();


    // --- D. CAPTURE SOURIS (DOUCEUR) ---
    window.addEventListener('mousemove', (e) => {
        if (!carousel) return;

        // Position de la souris (-1 à 1)
        const x = (window.innerWidth / 2 - e.pageX) / (window.innerWidth / 2);
        const y = (window.innerHeight / 2 - e.pageY) / (window.innerHeight / 2);

        // AXE Y (Gauche/Droite)
        // Souris à droite -> On regarde à droite
        targetTiltY = -x * tiltLimit;  
        
        // AXE X (Haut/Bas)
        // Souris en haut -> On regarde en haut
        // On inverse le calcul de Y pour avoir le comportement naturel
        const y_natural = -y; // -1 en haut, 1 en bas
        targetTiltX = y_natural * tiltLimit; 
    });


    // --- E. NAVIGATION SCROLL ---
    window.addEventListener('wheel', (e) => {
        if (!carousel) return;
        const speed = 0.4; 
        targetRot -= e.deltaY * speed;
    });


    // --- F. DRAG (SOURIS/TOUCH) ---
    let isDown = false;
    let startX;
    let startRot;

    if (scene) {
        scene.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX;
            startRot = targetRot;
            carousel.style.cursor = 'grabbing';
        });

        window.addEventListener('mouseup', () => {
            isDown = false;
            carousel.style.cursor = 'grab';
        });

        scene.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX;
            const walk = (x - startX) * 0.8;
            targetRot = startRot + walk;
        });
        
        // --- TOUCH : snap + inertie ---
        let touchLastX = 0, touchLastT = 0, touchVel = 0;

        function snapToCard() {
            targetRot = Math.round(targetRot / theta) * theta;
        }

        scene.addEventListener('touchstart', (e) => {
            isDown     = true;
            startX     = e.touches[0].pageX;
            startRot   = targetRot;
            touchLastX = startX;
            touchLastT = Date.now();
            touchVel   = 0;
        }, { passive: true });

        scene.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            e.preventDefault(); // bloque le scroll page pendant le swipe
            const x   = e.touches[0].pageX;
            const now = Date.now();
            const dt  = Math.max(now - touchLastT, 1);
            touchVel   = (x - touchLastX) / dt; // px/ms
            touchLastX = x;
            touchLastT = now;
            targetRot  = startRot + (x - startX) * 1.2;
        }, { passive: false });

        scene.addEventListener('touchend', () => {
            isDown     = false;
            targetRot += touchVel * 150; // momentum : vitesse → degrés
            snapToCard();
        });

        scene.addEventListener('touchcancel', () => {
            isDown = false;
            snapToCard();
        });
    }


    // --- G. SAUVEGARDE CLIC ---
    cards.forEach((card, index) => {
        card.addEventListener('click', (e) => {
            if (isDown) return; 

            // Angle idéal
            const idealAngle = -(index * theta);
            
            // Optimisation pour éviter les tours complets
            const currentRound = Math.round(targetRot / 360);
            const optimizedAngle = idealAngle + (currentRound * 360);

            sessionStorage.setItem('carouselAngle', optimizedAngle);
        });
    });

    // --- H. RESIZE ---
    window.addEventListener('resize', () => {
        radius = Math.round((cards[0].offsetWidth / 2) / Math.tan(Math.PI / numCards));
        cards.forEach((card, index) => {
            card.style.transform = `rotateY(${index * theta}deg) translateZ(${radius + 50}px)`;
        });
    });
}

/* =========================================
   ACCESSIBILITÉ : NAVIGATION CLAVIER CARROUSEL
   ========================================= */
document.querySelectorAll('.card[role="link"]').forEach((card) => {
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const href = card.getAttribute('onclick').match(/'([^']+)'/)?.[1];
            if (href) window.location.href = href;
        }
    });
});

/* =========================================
   4. ANIMATION ARCHIVE
   ========================================= */
const archiveItems = document.querySelectorAll('.archive-item');
if (archiveItems.length > 0) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    archiveItems.forEach((item, index) => {
        item.style.transitionDelay = `${index * 50}ms`;
        item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(item);
    });

    
}

/* =========================================
   7. SCROLL REVEAL (PAGES PROJET)
   ========================================= */
if (document.body.classList.contains('page-scrollable')) {
    const revealTargets = document.querySelectorAll(
        '.glass-panel, .project-hero, .gallery-large, .gallery-small, .gallery-row-3'
    );

    revealTargets.forEach(el => el.classList.add('reveal'));

    const revealObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });

    revealTargets.forEach((el, i) => {
        el.style.transitionDelay = `${(i % 3) * 90}ms`;
        revealObs.observe(el);
    });
}

/* =========================================
   6. FOOTER (ANNÉE AUTOMATIQUE)
   ========================================= */
const footerYear = document.getElementById('footer-year');
if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
}


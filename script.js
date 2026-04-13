/* =========================================
   0. TRANSITION : CARROUSEL QUI TOMBE
   ========================================= */
(function () {
    const BG = '#0a0a0a';

    const curtain = document.createElement('div');
    curtain.id = 'page-curtain';

    /* ── ENTRÉE : on fixe opacity:1 AVANT l'ajout au DOM ──
       Ainsi le premier pixel rendu est déjà noir — zéro flash */
    const isEntering = !!sessionStorage.getItem('pageTransition');
    if (isEntering) {
        sessionStorage.removeItem('pageTransition');
        curtain.style.cssText = `
            position:fixed;inset:0;background:${BG};
            z-index:9998;opacity:1;pointer-events:all;transition:none;
        `;
    }

    document.body.appendChild(curtain);

    /* Démarrer la révélation — noir se dissout pendant que la page monte */
    if (isEntering) {
        setTimeout(() => {
            curtain.style.transition    = 'opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1)';
            curtain.style.opacity       = '0';
            curtain.style.pointerEvents = 'none';
        }, 200);
    }

    /* ── SORTIE : chute visible, puis noir arrive ── */
    window.curtainOut = function (cb) {
        // Teinte la curtain avec la couleur accent du projet en cours
        const accent = getComputedStyle(document.body).getPropertyValue('--project-accent').trim();
        if (accent) {
            curtain.style.background = `radial-gradient(ellipse at 50% 60%, ${accent} 0%, ${BG} 65%)`;
        } else {
            curtain.style.background = BG;
        }

        // 1. La scène s'effondre (hésitation → gravité → blur)
        const scene = document.querySelector('.scene');
        if (scene) scene.classList.add('page-falling');

        // 2. Le noir arrive après 200ms — on voit bien la chute d'abord
        setTimeout(() => {
            curtain.style.transition    = 'opacity 0.45s cubic-bezier(0.4, 0, 1, 1)';
            curtain.style.opacity       = '1';
            curtain.style.pointerEvents = 'all';
        }, 200);

        // 3. Naviguer une fois le noir total (200 + 450 + marge)
        setTimeout(cb, 720);
    };
})();

/* =========================================
   CURSEUR CUSTOM
   ========================================= */
(function () {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const dot  = document.createElement('div'); dot.id = 'cursor-dot';
    const ring = document.createElement('div'); ring.id = 'cursor-ring';
    // Cachés jusqu'au premier mouvement de souris — évite le glissement depuis le coin
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    let mx = 0, my = 0;
    let rx = 0, ry = 0;
    let ready = false;

    document.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        if (!ready) {
            // Premier mouvement : snap le ring à la position exacte
            rx = mx; ry = my;
            ready = true;
            dot.style.opacity  = '1';
            ring.style.opacity = '1';
        }
        dot.style.left = mx + 'px';
        dot.style.top  = my + 'px';
    });

    (function loop() {
        if (ready) {
            rx += (mx - rx) * 0.11;
            ry += (my - ry) * 0.11;
            ring.style.left = Math.round(rx * 10) / 10 + 'px';
            ring.style.top  = Math.round(ry * 10) / 10 + 'px';
        }
        requestAnimationFrame(loop);
    })();

    const hoverSel = 'a, button, .card, .mosaic-cell, .dock-item, .project-nav-arrow, .archive-item, .about-photo-frame, label, input, [role="link"]';
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest(hoverSel)) document.body.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest(hoverSel)) document.body.classList.remove('cursor-hover');
    });
    document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
    document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'));
    document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => {
        if (ready) { dot.style.opacity = '1'; ring.style.opacity = '1'; }
    });
})();

/* =========================================
   5. PRELOADER (SESSION UNIQUE)
   ========================================= */
window.addEventListener('load', () => {
    const loader = document.getElementById('preloader');

    if (loader) {
        const hasVisited = sessionStorage.getItem('hasVisited');

        if (hasVisited) {
            // Retour sur l'accueil → masquer immédiatement
            loader.style.display = 'none';
        } else {
            sessionStorage.setItem('hasVisited', 'true');

            setTimeout(() => {
                loader.classList.add('loader-hidden');

                setTimeout(() => {
                    loader.style.display = 'none';
                }, 1000);
            }, 1200);
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
    const tiltLimit = 9;       // Légèrement plus prononcé
    const rotSmoothing = 0.05;  // Inertie Scroll (Lourd)
    const tiltSmoothing = 0.045; // Inertie Souris (fluide)

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

        // 4. Application — tilt sur la scène, spin sur le carrousel
        if (scene && !scene.classList.contains('page-falling')) {
            scene.style.transform = `rotateX(${tx}deg) rotateY(${ty}deg)`;
        }
        carousel.style.transform = `rotateY(${r}deg)`;

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


    // --- G. CLIC : SAUVEGARDE + EFFET TUNNEL ---
    cards.forEach((card, index) => {
        // Récupère le href depuis l'onclick inline et le désactive
        const match = card.getAttribute('onclick')?.match(/'([^']+)'/);
        const href = match ? match[1] : null;
        if (href) card.setAttribute('onclick', 'void(0)');

        card.addEventListener('click', () => {
            if (isDown) return;

            const idealAngle   = -(index * theta);
            const currentRound = Math.round(targetRot / 360);
            const optimizedAngle = idealAngle + (currentRound * 360);
            sessionStorage.setItem('carouselAngle', optimizedAngle);

            if (href) {
                sessionStorage.setItem('pageTransition', '1');
                curtainOut(() => { window.location.href = href; });
            }
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
   BACK DES CARTES : copie du fond du front
   ========================================= */
document.querySelectorAll('.card').forEach(card => {
    const front = card.querySelector('.card-front');
    const back  = card.querySelector('.card-back');
    if (!front || !back) return;
    back.style.backgroundImage    = front.style.backgroundImage;
    back.style.backgroundColor    = front.style.backgroundColor;
    back.style.backgroundSize     = 'cover';
    back.style.backgroundPosition = 'center';
});

/* =========================================
   NAVIGATION INTER-PROJETS (transition fluide)
   ========================================= */
document.querySelectorAll('.project-nav-arrow, .next-project-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        e.preventDefault();
        sessionStorage.setItem('pageTransition', '1');
        window.curtainOut(() => { window.location.href = href; });
    });
});

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
   4. ANIMATION ARCHIVE (SCROLL REVEAL)
   ========================================= */
const archiveWrappers = document.querySelectorAll('.archive-item-wrapper');
if (archiveWrappers.length > 0) {
    const archiveObs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                archiveObs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

    archiveWrappers.forEach((item, index) => {
        // Décalage en paires (colonne gauche/droite) comme sur les pages projet
        item.style.transitionDelay = `${(index % 2) * 100}ms`;
        archiveObs.observe(item);
    });
}

/* =========================================
   PARALLAX IMAGES MOSAIC (PAGES PROJET)
   ========================================= */
if (document.body.classList.contains('page-scrollable')) {
    const parallaxImgs = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? []
        : document.querySelectorAll('.mosaic-cell:not(.mosaic-text-cell) img');

    if (parallaxImgs.length > 0) {
        function updateParallax() {
            const viewH = window.innerHeight;
            parallaxImgs.forEach(img => {
                const cell = img.parentElement;
                const rect = cell.getBoundingClientRect();
                // -1 quand la cellule est en bas, +1 quand elle est en haut
                const progress = (viewH / 2 - (rect.top + rect.height / 2)) / (viewH / 2 + rect.height / 2);
                const offset = Math.max(-14, Math.min(14, progress * 14));
                img.style.setProperty('--parallax-y', offset.toFixed(2) + 'px');
            });
        }
        window.addEventListener('scroll', updateParallax, { passive: true });
        updateParallax();
    }
}

/* =========================================
   PROGRESS BAR DE LECTURE (PAGES PROJET)
   ========================================= */
if (document.body.classList.contains('page-scrollable')) {
    const bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);

    window.addEventListener('scroll', () => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = total > 0 ? (window.scrollY / total * 100) + '%' : '0%';
    }, { passive: true });
}

/* =========================================
   8. SCROLL REVEAL (PAGES PROJET)
   ========================================= */
if (document.body.classList.contains('page-scrollable')) {
    const revealTargets = document.querySelectorAll(
        '.glass-panel, .project-hero, .gallery-large, .gallery-small, .gallery-row-3, .mosaic-cell'
    );

    revealTargets.forEach(el => el.classList.add('reveal'));

    const revealObs = new IntersectionObserver((entries) => {
        // Trier les cellules visibles par position (haut → bas, gauche → droite)
        const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => {
                const dy = a.boundingClientRect.top - b.boundingClientRect.top;
                return Math.abs(dy) > 10 ? dy : a.boundingClientRect.left - b.boundingClientRect.left;
            });

        visible.forEach((entry, i) => {
            entry.target.style.transitionDelay = `${i * 55}ms`;
            entry.target.classList.add('is-visible');
            revealObs.unobserve(entry.target);
        });
    }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });

    revealTargets.forEach(el => revealObs.observe(el));
}

/* =========================================
   6. FOOTER (ANNÉE AUTOMATIQUE)
   ========================================= */
const footerYear = document.getElementById('footer-year');
if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
}


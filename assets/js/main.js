import { isMobile } from './utility.js';
import { openModal, closeModal, nextDay, prevDay, renderCurrentView, loadPlanning, hideTip, showTip, startTipTimer, getTipPhase, setTipPhase } from './features.js';

// - - - - - - - Éléments DOM - - - - - - - //

const content = document.getElementById('content');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const dots = document.querySelectorAll('.dot');
const specialiteName = document.getElementById('specialite-name');
const navLeft = document.getElementById('nav-left');
const navRight = document.getElementById('nav-right');
const tip = document.getElementById('tip');
const viewBtns = document.querySelectorAll('.toggle .btn');
const specialites = ['SLAM', 'SISR'];

// - - - - - - - État - - - - - - - //

let currentSpecialite = localStorage.getItem('specialite') || 'SLAM';
let currentView = localStorage.getItem('view') || 'day';
let hasInteracted = localStorage.getItem('tip') === 'true';
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;
let lastWheelTime = 0;

// - - - - - - - Fonctions principales - - - - - - - //

// Met à jour l'état des flèches de navigation
function updateNavArrows() {
    const currentIndex = specialites.indexOf(currentSpecialite);

    navRight.disabled = currentIndex === specialites.length - 1;
    navLeft.disabled = currentIndex === 0;
}

// Marque l'astuce comme vue
function markTipAsSeen() {
    hasInteracted = true;
    localStorage.setItem('tip', 'true');
    hideTip();
}

// Change de spécialité
function switchSpecialite(newSpecialite, fromInteraction = false) {
    if (newSpecialite === currentSpecialite) return;

    currentSpecialite = newSpecialite;
    localStorage.setItem('specialite', currentSpecialite);

    specialiteName.textContent = currentSpecialite;
    dots.forEach(dot => dot.classList.toggle('active',
        dot.dataset.specialite === currentSpecialite)
    );

    updateNavArrows();
    loadPlanning(currentSpecialite, currentView);

    // Gestion des phases de l'astuce
    if (fromInteraction && isMobile() && !hasInteracted) {
        if (getTipPhase() === 1 && currentSpecialite === 'SISR') {
            setTipPhase(2);
            setTimeout(() => showTip('right', hasInteracted), 500);
        } else if (getTipPhase() === 2 && currentSpecialite === 'SLAM') {
            markTipAsSeen();
        }
    }

    if (fromInteraction) {
        hideTip();
        startTipTimer(hasInteracted);
    }
}

// Gère le glissement tactile
function handleSwipe() {
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    const minSwipe = 50;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) >= minSwipe) {
        const currentIndex = specialites.indexOf(currentSpecialite);

        if (diffX > 0 && currentIndex < specialites.length - 1) {
            switchSpecialite(specialites[currentIndex + 1], true);
        } else if (diffX < 0 && currentIndex > 0) {
            switchSpecialite(specialites[currentIndex - 1], true);
        }
    } else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) >= minSwipe && currentView === 'day') {
        diffY > 0 ? nextDay() : prevDay();
    }
}

// - - - - - - - Constant Events - - - - - - - //

dots.forEach(dot => {
    dot.addEventListener('click', () => switchSpecialite(dot.dataset.specialite, true));
});

navLeft.addEventListener('click', () => {
    const currentIndex = specialites.indexOf(currentSpecialite);

    if (currentIndex > 0) {
        switchSpecialite(specialites[currentIndex - 1], true);
    }
});

navRight.addEventListener('click', () => {
    const currentIndex = specialites.indexOf(currentSpecialite);

    if (currentIndex < specialites.length - 1) {
        switchSpecialite(specialites[currentIndex + 1], true);
    }
});

viewBtns.forEach(btn => btn.addEventListener('click', () => {
    const newView = btn.dataset.view;

    if (newView === currentView) return;

    currentView = newView;
    localStorage.setItem('view', currentView);

    viewBtns.forEach(b => b.classList.toggle('active', b.dataset.view === currentView));
    renderCurrentView(currentView);
}));

content.addEventListener('click', e => {
    const eventEl = e.target.closest('.event');

    if (eventEl && !eventEl.classList.contains('lunch')) {
        openModal(JSON.parse(decodeURIComponent(eventEl.dataset.event)));
    }
});

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => e.target === modal && closeModal());
tip.addEventListener('click', markTipAsSeen);

// - - - - - - - Document Events - - - - - - - //

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchmove', e => {
    if (currentView === 'day') {
        const diffY = Math.abs(touchStartY - e.changedTouches[0].screenY);
        const diffX = Math.abs(touchStartX - e.changedTouches[0].screenX);
        if (diffY > diffX && diffY > 10) e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
}, { passive: true });

document.addEventListener('wheel', e => {
    const now = Date.now();
    if (now - lastWheelTime < 300) return;

    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) {
        lastWheelTime = now;
        const currentIndex = specialites.indexOf(currentSpecialite);

        if (e.deltaX > 0 && currentIndex < specialites.length - 1) {
            switchSpecialite(specialites[currentIndex + 1], true);
        } else if (e.deltaX < 0 && currentIndex > 0) {
            switchSpecialite(specialites[currentIndex - 1], true);
        }
    } else if (currentView === 'day' && Math.abs(e.deltaY) > 30) {
        lastWheelTime = now;
        e.deltaY > 0 ? nextDay() : prevDay();
    }
}, { passive: true });

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    if (currentView === 'day') {
        if (e.key === 'ArrowDown') nextDay();
        else if (e.key === 'ArrowUp') prevDay();
    }
});

// - - - - - - - Function Calls - - - - - - - //

specialiteName.textContent = currentSpecialite;
dots.forEach(dot => dot.classList.toggle('active', dot.dataset.specialite === currentSpecialite));
viewBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === currentView));

updateNavArrows();
loadPlanning(currentSpecialite, currentView);
startTipTimer(hasInteracted);

setInterval(() => {
    loadPlanning(currentSpecialite, currentView);
}, 300000);
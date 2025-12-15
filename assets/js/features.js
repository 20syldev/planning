import {
    formatDate, formatTime, formatDayName, formatDayDate,
    getWeekNumber, isToday, parseUTC,
    isCurrentEvent, isMobile,
} from './utility.js';

// - - - - - - - Éléments DOM - - - - - - - //

const content = document.getElementById('content');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const tip = document.getElementById('tip');
const hand = document.getElementById('hand');

// - - - - - - - État - - - - - - - //

let allDays = [];
let allEvents = [];
let currentDayIndex = 0;
let tipTimeout = null;
let tipPhase = 0;
let isAnimating = false;

// - - - - - - - Fonctions de groupage - - - - - - - //

// Groupe les événements par jour
export function groupByDay(events) {
    const days = {};

    events.filter(e => e.subject?.trim()).forEach(event => {
        const date = parseUTC(event.start);
        const dayKey = date.toDateString();

        if (!days[dayKey]) days[dayKey] = { date, events: [] };

        days[dayKey].events.push(event);
    });

    return Object.values(days).sort((a, b) => a.date - b.date);
}

// Groupe les événements par semaine
export function groupByWeek(events) {
    const weeks = {};

    events.filter(e => e.subject?.trim()).forEach(event => {
        const date = parseUTC(event.start);
        const weekNum = getWeekNumber(date);
        const year = date.getFullYear();

        const weekKey = `${year}-W${weekNum}`;
        if (!weeks[weekKey]) weeks[weekKey] = { weekNum, year, days: {} };

        const dayKey = date.toDateString();
        if (!weeks[weekKey].days[dayKey]) weeks[weekKey].days[dayKey] = { date, events: [] };

        weeks[weekKey].days[dayKey].events.push(event);
    });

    return Object.values(weeks)
        .sort((a, b) => a.year - b.year || a.weekNum - b.weekNum)
        .map(week => ({ ...week, days: Object.values(week.days).sort((a, b) => a.date - b.date) }));
}

// Ajoute la pause déjeuner entre les cours
export function addLunchBreak(events) {
    if (events.length < 2) return events;

    const sorted = [...events].sort((a, b) => parseUTC(a.start) - parseUTC(b.start));
    const result = [];

    for (let i = 0; i < sorted.length; i++) {
        result.push(sorted[i]);

        if (i < sorted.length - 1) {
            const currentEnd = parseUTC(sorted[i].end);
            const nextStart = parseUTC(sorted[i + 1].start);
            const endHour = currentEnd.getHours();
            const startHour = nextStart.getHours();
            const gap = (nextStart - currentEnd) / 60000;

            if (endHour >= 11 && endHour <= 13 && startHour >= 12 && startHour <= 14 && gap >= 30) {
                result.push({
                    subject: 'Pause déjeuner',
                    start: sorted[i].end,
                    end: sorted[i + 1].start,
                    isLunch: true
                });
            }
        }
    }

    return result;
}

// Trouve l'index du jour actuel ou suivant
export function findCurrentOrNextDayIndex() {
    const now = new Date();
    const today = now.toDateString();

    let index = allDays.findIndex(day => day.date.toDateString() === today);
    if (index === -1) index = allDays.findIndex(day => day.date >= now);

    return index === -1 ? 0 : index;
}

// - - - - - - - Fonctions de modale - - - - - - - //

// Ouvre la modale de détail
export function openModal(event) {
    const start = parseUTC(event.start);
    const end = parseUTC(event.end);
    const isCurrent = isCurrentEvent(event);

    modalBody.innerHTML = `
        <div class="title">
            ${event.subject}
            ${isCurrent ? '<span class="badge current">En cours</span>' : ''}
        </div>
        <div class="time">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            ${formatTime(start)} - ${formatTime(end)}
        </div>
        <div class="info">
            <div class="item">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>${formatDate(start)}</span>
            </div>
            ${event.type ? `
                <div class="item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span>${event.type}</span>
                </div>
            ` : ''}
            ${event.teacher ? `
                <div class="item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <span>${event.teacher}</span>
                </div>
            ` : ''}
            ${event.classes?.filter(c => c.trim()).length ? `
                <div class="item">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <span>${event.classes.join(', ')}</span>
                </div>
            ` : ''}
        </div>
        ${event.memo ? `
            <div class="memo">
                <div class="label">Note</div>
                <div class="text">${event.memo}</div>
            </div>
        ` : ''}
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Ferme la modale
export function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// - - - - - - - Fonctions de rendu - - - - - - - //

// Génère le HTML d'un événement
export function renderEvent(event) {
    const start = parseUTC(event.start);
    const end = parseUTC(event.end);
    const isCurrent = isCurrentEvent(event);
    const eventData = encodeURIComponent(JSON.stringify(event));

    return `
        <div class="event${isCurrent ? ' current' : ''}${event.isLunch ? ' lunch' : ''}" data-event="${eventData}">
            <div class="header">
                <div class="title">
                    ${event.subject}
                    ${isCurrent ? '<span class="badge current">En cours</span>' : ''}
                </div>
                <div class="time">${formatTime(start)} - ${formatTime(end)}</div>
            </div>
            <div class="details">
                ${event.type ? `
                    <div class="detail">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        ${event.type}
                    </div>
                ` : ''}
                ${event.teacher ? `
                    <div class="detail">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        ${event.teacher}
                    </div>
                ` : ''}
                ${event.classes?.filter(c => c.trim()).length ? `
                    <div class="detail">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        ${event.classes.join(', ')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Génère la carte du jour
function renderDayCard(day, direction = null) {
    const weekNum = getWeekNumber(day.date);
    const isTodayCard = isToday(day.date);

    return `
        <div class="card${direction ? ` ${direction}` : ''}${isTodayCard ? ' today' : ''}">
            <div class="header">
                <span class="date">${formatDate(day.date)}</span>
                <span class="week">S${weekNum}</span>
                ${isTodayCard ? '<span class="badge today">Aujourd\'hui</span>' : ''}
            </div>
            <div class="events">
                ${addLunchBreak(day.events).map(renderEvent).join('')}
            </div>
            <div class="nav">
                <span>${currentDayIndex + 1} / ${allDays.length}</span>
            </div>
        </div>
    `;
}

// Affiche un jour avec animation
export function showDay(index, direction = null) {
    if (index < 0 || index >= allDays.length || isAnimating) return;

    isAnimating = true;
    currentDayIndex = index;

    content.innerHTML = renderDayCard(allDays[currentDayIndex], direction);
    setTimeout(() => isAnimating = false, 300);
}

// - - - - - - - Fonctions de navigation - - - - - - - //

// Navigation vers le jour suivant
export function nextDay() {
    if (currentDayIndex < allDays.length - 1) showDay(currentDayIndex + 1, 'up');
}

// Navigation vers le jour précédent
export function prevDay() {
    if (currentDayIndex > 0) showDay(currentDayIndex - 1, 'down');
}

// Affiche la vue complète (toutes les semaines)
function renderAllView() {
    const weeks = groupByWeek(allEvents);

    if (weeks.length === 0) return content.innerHTML = '<div class="empty">Aucun cours disponible</div>';

    content.innerHTML = `
        <div class="weeks">
            ${weeks.map(week => `
                <div class="week">
                    <div class="header">
                        <span class="number">Semaine ${week.weekNum}</span>
                    </div>
                    <div class="content">
                        ${week.days.map(day => `
                            <div class="day${isToday(day.date) ? ' today' : ''}">
                                <div class="header">
                                    <span class="name">${formatDayName(day.date)}</span>
                                    <span class="date">${formatDayDate(day.date)}</span>
                                    ${isToday(day.date) ? '<span class="badge today">Aujourd\'hui</span>' : ''}
                                </div>
                                <div class="events">
                                    ${addLunchBreak(day.events).map(renderEvent).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Affiche la vue actuelle
export function renderCurrentView(currentView) {
    if (currentView === 'all') {
        renderAllView();
    } else {
        if (allDays.length === 0) {
            content.innerHTML = '<div class="empty">Aucun cours disponible</div>';
            return;
        }
        currentDayIndex = findCurrentOrNextDayIndex();
        showDay(currentDayIndex);
    }
}

// Charge le planning depuis l'API
export async function loadPlanning(specialite, currentView) {
    content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement du planning...</p></div>';

    try {
        const configResponse = await fetch('config.json');
        const config = await configResponse.json();
        const url = encodeURIComponent(config[specialite.toLowerCase()]);

        const response = await fetch('https://api.sylvain.pro/v3/hyperplanning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `url=${url}&detail=full`
        });

        const data = await response.json();
        allEvents = data;
        allDays = groupByDay(data);

        if (allDays.length === 0 && allEvents.length === 0) {
            content.innerHTML = '<div class="empty">Aucun cours disponible</div>';
            return;
        }
        renderCurrentView(currentView);
    } catch {
        content.innerHTML = '<div class="error"><p>Impossible de charger le planning</p></div>';
    }
}

// - - - - - - - Fonctions d'astuce - - - - - - - //

// Cache l'astuce de glissement
export function hideTip() {
    tip.classList.remove('active');
    hand.classList.remove('left', 'right');

    if (tipTimeout) clearTimeout(tipTimeout);
}

// Affiche l'astuce de glissement
export function showTip(direction, hasInteracted) {
    if (!isMobile() || hasInteracted) return;

    hand.classList.remove('left', 'right');
    hand.classList.add(direction);
    tip.classList.add('active');
}

// Démarre le minuteur de l'astuce
export function startTipTimer(hasInteracted) {
    if (!isMobile() || hasInteracted) return;
    if (tipTimeout) clearTimeout(tipTimeout);

    tipTimeout = setTimeout(() => {
        if (tipPhase === 0) {
            tipPhase = 1;
            showTip('left', hasInteracted);
        }
    }, 30000);
}

// Retourne la phase actuelle de l'astuce
export function getTipPhase() {
    return tipPhase;
}

// Définit la phase de l'astuce
export function setTipPhase(phase) {
    tipPhase = phase;
}

// Retourne l'index du jour actuel
export function getCurrentDayIndex() {
    return currentDayIndex;
}

// Retourne le nombre total de jours
export function getAllDaysLength() {
    return allDays.length;
}

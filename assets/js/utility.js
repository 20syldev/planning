// - - - - - - - Fonctions de formatage - - - - - - - //

// Formate une date en français
export function formatDate(date) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

// Formate une heure
export function formatTime(date) {
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

// Formate le nom du jour
export function formatDayName(date) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(date);
}

// Formate la date courte
export function formatDayDate(date) {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
}

// Calcule le numéro de semaine
export function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// - - - - - - - Fonctions utilitaires - - - - - - - //

// Vérifie si c'est aujourd'hui
export function isToday(date) {
    return date.toDateString() === new Date().toDateString();
}

// Vérifie si un événement est en cours
export function isCurrentEvent(event) {
    const now = new Date();
    return now >= new Date(event.start) && now <= new Date(event.end);
}

// Vérifie si on est sur mobile
export function isMobile() {
    return window.innerWidth < 1024;
}

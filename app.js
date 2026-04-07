// Estado Global
const AppState = {
    currentTrack: null,
    isPlaying: false,
    playlist: [],
    currentIndex: 0,
    history: [],
    favorites: [],
    searchResults: [],
    isSearching: false,
    currentScreen: 'home',
    lastSearchQuery: ''
};

// Configuración
const CONFIG = {
    YOUTUBE_API_KEY: 'AIzaSyAVwaV1q5U_4lpF0ZaKBz_u7JEWiEIzrsc', // Reemplazar con tu API Key
    MAX_HISTORY: 50,
    DEBOUNCE_TIME: 300,
    CACHE_TIME: 3600000 // 1 hora
};

// ==================== INICIALIZACIÓN ==================== */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎵 PWA Music iniciando...');
    
    initializeApp();
    loadStoredData();
    setupEventListeners();
    loadHomeContent();
});

function initializeApp() {
    if (typeof YT === 'undefined') {
        console.warn('YouTube API aún no cargada');
    }
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        console.log('PWA lista para instalar');
    });
}

// ==================== ALMACENAMIENTO LOCAL ==================== */
function loadStoredData() {
    try {
        const stored = localStorage.getItem('pwaMusic');
        if (stored) {
            const data = JSON.parse(stored);
            AppState.history = data.history || [];
            AppState.favorites = data.favorites || [];
        }
    } catch (e) {
        console.error('Error cargando datos almacenados:', e);
    }
}

function saveStoredData() {
    try {
        localStorage.setItem('pwaMusic', JSON.stringify({
            history: AppState.history,
            favorites: AppState.favorites
        }));
    } catch (e) {
        console.error('Error guardando datos:', e);
    }
}

function addToHistory(track) {
    if (AppState.history[0]?.videoId !== track.videoId) {
        AppState.history.unshift(track);
        if (AppState.history.length > CONFIG.MAX_HISTORY) {
            AppState.history.pop();
        }
        saveStoredData();
        updateHistoryUI();
    }
}

function toggleFavorite(track) {
    const index = AppState.favorites.findIndex(t => t.videoId === track.videoId);
    if (index > -1) {
        AppState.favorites.splice(index, 1);
    } else {
        AppState.favorites.unshift(track);
    }
    saveStoredData();
    updateFavoritesUI();
    return index === -1;
}

function isFavorite(videoId) {
    return AppState.favorites.some(t => t.videoId === videoId);
}

// ==================== EVENT LISTENERS ==================== */
function setupEventListeners() {
    // Search page input
    const pageSearchInput = document.getElementById('page-search-input');
    if (pageSearchInput) {
        pageSearchInput.addEventListener('input', debounce(handlePageSearch, CONFIG.DEBOUNCE_TIME));
        pageSearchInput.addEventListener('keypress', handleSearchKeypress);
    }
    
    // Clear search button
    const clearBtn = document.getElementById('page-search-clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            pageSearchInput.value = '';
            document.getElementById('search-page-container').innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <p>Escribe para buscar canciones</p>
                </div>
            `;
        });
    }
    
    // Navigation tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const screen = btn.getAttribute('data-screen');
            console.log('Navegando a:', screen);
            handleNavigation(screen);
        });
    });
    
    // Player controls
    const playerClose = document.getElementById('player-close');
    if (playerClose) {
        playerClose.addEventListener('click', closePlayerModal);
    }
    
    const playerOverlay = document.getElementById('player-overlay');
    if (playerOverlay) {
        playerOverlay.addEventListener('click', closePlayerModal);
    }
    
    // Mini player click
    const miniPlayer = document.getElementById('mini-player');
    if (miniPlayer) {
        miniPlayer.addEventListener('click', openPlayerModal);
    }
}

// ==================== BÚSQUEDA EN PÁGINA ==================== */
function handlePageSearch(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        document.getElementById('search-page-container').innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <p>Escribe para buscar canciones</p>
            </div>
        `;
        return;
    }
    
    AppState.lastSearchQuery = query;
    performSearch(query);
}

function handleSearchKeypress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const query = e.target.value.trim();
        if (query.length > 0) {
            AppState.lastSearchQuery = query;
            performSearch(query);
        }
    }
}

async function performSearch(query) {
    try {
        // Mostrar loading
        const container = document.getElementById('search-page-container');
        container.innerHTML = '<div class="loading-spinner" style="margin: 20px auto;"></div>';
        
        const results = await YouTubeAPI.search(query, 20);
        AppState.searchResults = results;
        
        displayPageSearchResults(results);
    } catch (error) {
        console.error('Error en búsqueda:', error);
        showError('Error al buscar canciones');
    }
}

// Mostrar resultados en página
function displayPageSearchResults(results) {
    const container = document.getElementById('search-page-container');
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <p>No se encontraron resultados para "${AppState.lastSearchQuery}"</p>
            </div>
        `;
    } else {
        container.innerHTML = results.map(track => createTrackListItem(track)).join('');
        
        // Solo agregar evento al botón play, no al item completo
        container.querySelectorAll('.track-list-play').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                playTrack(results[index]);
            });
        });
    }
}

function createTrackListItem(track) {
    return `
        <div class="track-list-item" data-video-id="${track.videoId}">
            <img src="${track.thumbnail}" alt="" class="track-list-thumbnail">
            <div class="track-list-info">
                <div class="track-list-title">${track.title}</div>
                <div class="track-list-channel">${track.channel}</div>
            </div>
            <button class="track-list-play" aria-label="Reproducir">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </button>
        </div>
    `;
}

// ==================== NAVEGACIÓN ==================== */
function handleNavigation(screen) {
    console.log('handleNavigation llamada con:', screen);
    
    // Ocultar pantalla actual
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));
    
    // Mostrar nueva pantalla
    const newScreen = document.getElementById(`${screen}-screen`);
    if (newScreen) {
        newScreen.classList.add('active');
        console.log('Pantalla activada:', screen);
    } else {
        console.error('Pantalla no encontrada:', `${screen}-screen`);
    }
    
    // Actualizar botones nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-screen') === screen) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    AppState.currentScreen = screen;
    
    if (screen === 'favorites') {
        updateFavoritesUI();
    }
}

// ==================== PANTALLA HOME ==================== */
async function loadHomeContent() {
    try {
        console.log('Cargando contenido del home...');
        
        const trends = await YouTubeAPI.search('música trending', 6);
        console.log('Tendencias cargadas:', trends.length);
        displayTracks('trends-container', trends);
        
        const recommended = await YouTubeAPI.search('música electrónica', 6);
        console.log('Recomendados cargados:', recommended.length);
        displayTracks('recommended-container', recommended);
        
        const newReleases = await YouTubeAPI.search('nuevos estrenos', 6);
        console.log('Nuevos lanzamientos cargados:', newReleases.length);
        displayTracks('new-releases-container', newReleases);
        
        updateHistoryUI();
    } catch (error) {
        console.error('Error cargando contenido home:', error);
        showError('Error cargando el contenido');
    }
}

function displayTracks(containerId, tracks) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Contenedor no encontrado:', containerId);
        return;
    }
    
    container.innerHTML = tracks.map(track => createTrackCard(track)).join('');
    
    container.querySelectorAll('.track-card').forEach((card, index) => {
        card.addEventListener('click', () => {
            playTrack(tracks[index]);
        });
    });
}

function createTrackCard(track) {
    return `
        <div class="track-card" data-video-id="${track.videoId}">
            <div class="track-thumbnail">
                <img src="${track.thumbnail}" alt="${track.title}" loading="lazy">
                <div class="track-overlay">
                    <div class="play-icon-overlay">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="track-info">
                <div>
                    <div class="track-title">${track.title}</div>
                    <div class="track-channel">${track.channel}</div>
                </div>
            </div>
        </div>
    `;
}

function updateHistoryUI() {
    if (AppState.history.length > 0) {
        const historySection = document.getElementById('history-section');
        if (historySection) {
            historySection.classList.remove('hidden');
            displayTracks('history-container', AppState.history.slice(0, 6));
        }
    }
}

function updateFavoritesUI() {
    const favoritesContainer = document.getElementById('favorites-main-container');
    
    if (!favoritesContainer) {
        console.error('Contenedor de favoritos no encontrado');
        return;
    }
    
    if (AppState.favorites.length > 0) {
        favoritesContainer.innerHTML = AppState.favorites.map(track => 
            createTrackListItem(track)
        ).join('');
        
        favoritesContainer.querySelectorAll('.track-list-play').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                playTrack(AppState.favorites[index]);
            });
        });
    } else {
        favoritesContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <p>No hay canciones favoritas aún</p>
            </div>
        `;
    }
}

// ==================== REPRODUCTOR ==================== */
function playTrack(track) {
    console.log('Reproduciendo:', track.title);
    AppState.currentTrack = track;
    AppState.playlist = [track];
    AppState.currentIndex = 0;
    
    addToHistory(track);
    PlayerManager.playTrack(track);
    openPlayerModal();
}

function openPlayerModal() {
    if (!AppState.currentTrack) {
        console.error('No hay canción para reproducir');
        return;
    }
    
    const modal = document.getElementById('player-modal');
    console.log('Modal encontrado:', !!modal);
    
    if (modal) {
        console.log('Agregando clase active al modal');
        modal.classList.remove('hidden');
        modal.classList.add('active');
        updatePlayerUI();
        document.body.style.overflow = 'hidden';
        console.log('✅ Modal abierto');
    } else {
        console.error('❌ Modal no encontrado en el DOM');
    }
}

function closePlayerModal() {
    const modal = document.getElementById('player-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.classList.add('hidden');
    }
    document.body.style.overflow = '';
}

function updatePlayerUI() {
    const track = AppState.currentTrack;
    if (!track) return;
    
    const playerTitle = document.getElementById('player-title');
    const playerChannel = document.getElementById('player-channel');
    const playerThumbnail = document.getElementById('player-thumbnail');
    const miniThumbnail = document.getElementById('mini-thumbnail');
    const miniTitle = document.getElementById('mini-title');
    const miniChannel = document.getElementById('mini-channel');
    const miniPlayer = document.getElementById('mini-player');
    
    if (playerTitle) playerTitle.textContent = track.title;
    if (playerChannel) playerChannel.textContent = track.channel;
    if (playerThumbnail) playerThumbnail.src = track.thumbnail;
    
    if (miniThumbnail) miniThumbnail.src = track.thumbnail;
    if (miniTitle) miniTitle.textContent = track.title;
    if (miniChannel) miniChannel.textContent = track.channel;
    
    if (miniPlayer) {
        miniPlayer.classList.remove('hidden');
    }
    
    updateFavoriteButton();
}

function updateFavoriteButton() {
    const btn = document.getElementById('player-favorite-btn');
    if (btn && AppState.currentTrack) {
        if (isFavorite(AppState.currentTrack.videoId)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
}

// ==================== UTILIDADES ==================== */
function debounce(func, time) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), time);
    };
}

function showError(message) {
    console.error(message);
}

console.log('✅ App.js cargado correctamente');

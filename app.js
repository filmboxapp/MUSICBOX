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
    currentScreen: 'home'
};

// Configuración
const CONFIG = {
    YOUTUBE_API_KEY: 'AIzaSyAWEzgmWFg_praDsE2_4axOvRyNBtJHzzc', // Reemplazar con tu API Key
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
    // Petición de permisos para reproducción de audio
    if (typeof YT === 'undefined') {
        console.warn('YouTube API aún no cargada');
    }
    
    // Verificar instalación en pantalla de inicio
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
    // Evitar duplicados consecutivos
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
    return index === -1; // retorna true si fue agregado
}

function isFavorite(videoId) {
    return AppState.favorites.some(t => t.videoId === videoId);
}

// ==================== EVENT LISTENERS ==================== */
function setupEventListeners() {
    // Header search
    document.getElementById('search-toggle').addEventListener('click', toggleSearchBar);
    document.getElementById('search-close').addEventListener('click', closeSearchBar);
    
    // Search input
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce(handleSearch, CONFIG.DEBOUNCE_TIME));
    
    // Navigation tabs
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => handleNavigation(btn.dataset.screen));
    });
    
    // Player controls
    document.getElementById('player-close').addEventListener('click', closePlayerModal);
    document.getElementById('player-overlay').addEventListener('click', closePlayerModal);
    
    // Mini player click
    document.getElementById('mini-player').addEventListener('click', openPlayerModal);
}

// ==================== BÚSQUEDA ==================== */
function toggleSearchBar() {
    const searchBar = document.getElementById('search-bar');
    searchBar.classList.toggle('hidden');
    if (!searchBar.classList.contains('hidden')) {
        document.getElementById('search-input').focus();
    }
}

function closeSearchBar() {
    document.getElementById('search-bar').classList.add('hidden');
    document.getElementById('search-results').classList.add('hidden');
    document.getElementById('search-input').value = '';
}

function handleSearch(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        document.getElementById('search-results').classList.add('hidden');
        return;
    }
    
    searchMusic(query);
}

async function searchMusic(query) {
    try {
        const results = await YouTubeAPI.search(query, 10);
        displaySearchResults(results);
    } catch (error) {
        console.error('Error en búsqueda:', error);
        showError('Error al buscar canciones');
    }
}

function displaySearchResults(results) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = results.map(track => `
        <div class="search-result-item" data-video-id="${track.videoId}">
            <img src="${track.thumbnail}" class="search-result-thumbnail" alt="">
            <div class="search-result-info">
                <div class="search-result-title">${track.title}</div>
                <div class="search-result-channel">${track.channel}</div>
            </div>
        </div>
    `).join('');
    
    resultsContainer.classList.remove('hidden');
    
    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const videoId = item.dataset.videoId;
            const track = results.find(t => t.videoId === videoId);
            playTrack(track);
            closeSearchBar();
        });
    });
}

// ==================== NAVEGACIÓN ==================== */
function handleNavigation(screen) {
    const currentScreen = document.getElementById(`${AppState.currentScreen}-screen`);
    if (currentScreen) {
        currentScreen.classList.remove('active');
    }
    
    const newScreen = document.getElementById(`${screen}-screen`);
    if (newScreen) {
        newScreen.classList.add('active');
    }
    
    // Actualizar botones nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.screen === screen);
    });
    
    AppState.currentScreen = screen;
    
    // Cargar contenido específico
    if (screen === 'favorites') {
        updateFavoritesUI();
    }
}

// ==================== PANTALLA HOME ==================== */
async function loadHomeContent() {
    try {
        // Cargar tendencias
        const trends = await YouTubeAPI.search('música trending', 6);
        displayTracks('trends-container', trends);
        
        // Cargar recomendados
        const recommended = await YouTubeAPI.search('música electrónica', 6);
        displayTracks('recommended-container', recommended);
        
        // Cargar nuevos lanzamientos
        const newReleases = await YouTubeAPI.search('nuevos estrenos', 6);
        displayTracks('new-releases-container', newReleases);
        
        updateHistoryUI();
    } catch (error) {
        console.error('Error cargando contenido home:', error);
        showError('Error cargando el contenido');
    }
}

function displayTracks(containerId, tracks) {
    const container = document.getElementById(containerId);
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
        historySection.classList.remove('hidden');
        displayTracks('history-container', AppState.history.slice(0, 6));
    }
}

function updateFavoritesUI() {
    const favoritesContainer = document.getElementById('favorites-container');
    const favoritesSection = document.getElementById('favorites-section');
    
    if (AppState.favorites.length > 0) {
        favoritesSection.classList.remove('hidden');
        favoritesContainer.innerHTML = AppState.favorites.map(track => 
            createTrackCard(track)
        ).join('');
        
        favoritesContainer.querySelectorAll('.track-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                playTrack(AppState.favorites[index]);
            });
        });
    } else {
        favoritesSection.classList.add('hidden');
    }
}

// ==================== REPRODUCTOR ==================== */
function playTrack(track) {
    AppState.currentTrack = track;
    AppState.playlist = [track];
    AppState.currentIndex = 0;
    
    addToHistory(track);
    openPlayerModal();
    PlayerManager.playTrack(track);
}

function openPlayerModal() {
    if (!AppState.currentTrack) return;
    
    const modal = document.getElementById('player-modal');
    modal.classList.add('active');
    
    // Actualizar interfaz del reproductor
    updatePlayerUI();
    
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
}

function closePlayerModal() {
    document.getElementById('player-modal').classList.remove('active');
    document.body.style.overflow = '';
}

function updatePlayerUI() {
    const track = AppState.currentTrack;
    if (!track) return;
    
    document.getElementById('player-title').textContent = track.title;
    document.getElementById('player-channel').textContent = track.channel;
    document.getElementById('player-thumbnail').src = track.thumbnail;
    
    // Actualizar mini player
    document.getElementById('mini-thumbnail').src = track.thumbnail;
    document.getElementById('mini-title').textContent = track.title;
    document.getElementById('mini-channel').textContent = track.channel;
    
    // Mostrar mini player
    document.getElementById('mini-player').classList.remove('hidden');
    
    // Actualizar estado del botón favorito
    updateFavoriteButton();
}

function updateFavoriteButton() {
    const btn = document.getElementById('player-favorite-btn');
    if (isFavorite(AppState.currentTrack.videoId)) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
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
    // Podrías agregar un toast aquí
}

// Crear pantalla de búsqueda (agregada al HTML al hacer clic)
function createSearchScreen() {
    const screen = document.createElement('section');
    screen.id = 'search-screen';
    screen.className = 'screen';
    screen.innerHTML = `
        <div class="screen-content">
            <div class="section">
                <h2 class="section-title">Resultados de búsqueda</h2>
                <div id="advanced-search-results" class="tracks-grid"></div>
            </div>
        </div>
    `;
    document.querySelector('.main-content').appendChild(screen);
}

// Crear pantalla de favoritos
function createFavoritesScreen() {
    const screen = document.createElement('section');
    screen.id = 'favorites-screen';
    screen.className = 'screen';
    screen.innerHTML = `
        <div class="screen-content">
            <div class="section">
                <h2 class="section-title">Mis Favoritos</h2>
                <div id="favorites-main-container" class="tracks-grid"></div>
            </div>
        </div>
    `;
    document.querySelector('.main-content').appendChild(screen);
}

// Inicializar pantallas
createSearchScreen();
createFavoritesScreen();

console.log('✅ App.js cargado correctamente');

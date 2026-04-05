// Player Manager - Maneja la reproducción con YouTube IFrame API
const PlayerManager = {
    player: null,
    isPlayerReady: false,
    currentTime: 0,
    duration: 0,
    updateInterval: null,

    init() {
        // YouTube API carga automáticamente el callback onYouTubeIframeAPIReady
        window.onYouTubeIframeAPIReady = () => this.onPlayerReady();
        this.setupEventListeners();
    },

    onPlayerReady() {
        console.log('✅ YouTube Player API lista');
        this.isPlayerReady = true;
        
        // Crear un contenedor invisible para el player
        if (!document.getElementById('youtube-player-container')) {
            const container = document.createElement('div');
            container.id = 'youtube-player-container';
            container.style.display = 'none';
            document.body.appendChild(container);
            
            this.player = new YT.Player('youtube-player-container', {
                height: '0',
                width: '0',
                videoId: '',
                events: {
                    'onReady': () => console.log('Player listo'),
                    'onStateChange': (event) => this.onPlayerStateChange(event),
                    'onError': (event) => this.onPlayerError(event)
                }
            });
        }
        
        // Iniciar monitoreo del estado del reproductor
        this.startStateMonitor();
    },

    playTrack(track) {
        if (!this.isPlayerReady) {
            console.warn('Player aún no está listo');
            setTimeout(() => this.playTrack(track), 500);
            return;
        }

        console.log('🎵 Reproduciendo:', track.title);
        this.player.loadVideoById(track.videoId);
        this.player.playVideo();
        AppState.isPlaying = true;
        this.startUpdateInterval();
        this.updatePlayButton();
    },

    play() {
        if (!this.isPlayerReady) return;
        this.player.playVideo();
        AppState.isPlaying = true;
        this.startUpdateInterval();
        this.updatePlayButton();
    },

    pause() {
        if (!this.isPlayerReady) return;
        this.player.pauseVideo();
        AppState.isPlaying = false;
        clearInterval(this.updateInterval);
        this.updatePlayButton();
    },

    stop() {
        if (!this.isPlayerReady) return;
        this.player.stopVideo();
        AppState.isPlaying = false;
        clearInterval(this.updateInterval);
    },

    seek(seconds) {
        if (!this.isPlayerReady) return;
        this.player.seekTo(seconds, true);
    },

    setVolume(volume) {
        if (!this.isPlayerReady) return;
        this.player.setVolume(Math.max(0, Math.min(100, volume)));
    },

    getVolume() {
        return this.isPlayerReady ? this.player.getVolume() : 0;
    },

    getDuration() {
        return this.isPlayerReady ? this.player.getDuration() : 0;
    },

    getCurrentTime() {
        return this.isPlayerReady ? this.player.getCurrentTime() : 0;
    },

    onPlayerStateChange(event) {
        const state = event.data;
        console.log('Estado del player:', state);
        
        switch (state) {
            case YT.PlayerState.PLAYING:
                AppState.isPlaying = true;
                this.startUpdateInterval();
                break;
            case YT.PlayerState.PAUSED:
                AppState.isPlaying = false;
                break;
            case YT.PlayerState.ENDED:
                this.onTrackEnded();
                break;
            case YT.PlayerState.BUFFERING:
                console.log('Buffering...');
                break;
        }
        this.updatePlayButton();
    },

    onPlayerError(event) {
        console.error('Error del player YouTube:', event.data);
        switch (event.data) {
            case 2:
                console.error('Parámetro inválido');
                break;
            case 5:
                console.error('Error HTML5 Player');
                break;
            case 100:
                console.error('Video no encontrado');
                break;
            case 101:
                console.error('Video no puede reproducirse incrustado');
                break;
            case 150:
                console.error('Mismo que 101');
                break;
        }
    },

    onTrackEnded() {
        console.log('Track finalizado');
        AppState.isPlaying = false;
        this.updatePlayButton();
        // Reproducir siguiente si hay playlist
        if (AppState.playlist.length > 1) {
            AppState.currentIndex = (AppState.currentIndex + 1) % AppState.playlist.length;
            this.playTrack(AppState.playlist[AppState.currentIndex]);
        }
    },

    startUpdateInterval() {
        clearInterval(this.updateInterval);
        this.updateInterval = setInterval(() => {
            this.updateProgress();
        }, 1000);
    },

    updateProgress() {
        if (!this.isPlayerReady) return;
        
        this.currentTime = this.getCurrentTime();
        this.duration = this.getDuration();
        
        // Actualizar barra de progreso
        const progressFill = document.getElementById('progress-fill');
        const progressRange = document.getElementById('progress-range');
        
        if (this.duration > 0) {
            const percentage = (this.currentTime / this.duration) * 100;
            progressFill.style.width = percentage + '%';
            progressRange.max = this.duration;
            progressRange.value = this.currentTime;
        }
        
        // Actualizar tiempo actual y total
        document.getElementById('current-time').textContent = this.formatTime(this.currentTime);
        document.getElementById('total-time').textContent = this.formatTime(this.duration);
    },

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const totalSeconds = Math.floor(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },

    // Monitorear cambios de estado en tiempo real
    startStateMonitor() {
        setInterval(() => {
            if (!this.isPlayerReady) return;
            
            const playerState = this.player.getPlayerState();
            
            // -1: desconocido, 0: terminado, 1: reproduciendo, 2: pausado, 3: buffering, 5: video cargado
            if (playerState === 1) {
                // Reproduciendo
                if (!AppState.isPlaying) {
                    AppState.isPlaying = true;
                    this.updatePlayButton();
                }
            } else if (playerState === 2) {
                // Pausado
                if (AppState.isPlaying) {
                    AppState.isPlaying = false;
                    this.updatePlayButton();
                }
            }
        }, 500);
    },

    updatePlayButton() {
        // Actualizar botón principal del reproductor
        const playBtn = document.getElementById('player-play-btn');
        if (playBtn) {
            const playIcon = playBtn.querySelector('.play-icon');
            const pauseIcon = playBtn.querySelector('.pause-icon');
            
            if (AppState.isPlaying) {
                playIcon.classList.add('hidden');
                pauseIcon.classList.remove('hidden');
            } else {
                playIcon.classList.remove('hidden');
                pauseIcon.classList.add('hidden');
            }
        }
        
        // Actualizar mini reproductor
        const miniPlayBtn = document.getElementById('mini-play-btn');
        if (miniPlayBtn) {
            if (AppState.isPlaying) {
                miniPlayBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                `;
            } else {
                miniPlayBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                `;
            }
        }
    },

    setupEventListeners() {
        // Play/Pause principal
        const playerPlayBtn = document.getElementById('player-play-btn');
        if (playerPlayBtn) {
            playerPlayBtn.addEventListener('click', () => {
                if (AppState.isPlaying) {
                    this.pause();
                } else {
                    this.play();
                }
            });
        }

        // Mini play/pause
        const miniPlayBtn = document.getElementById('mini-play-btn');
        if (miniPlayBtn) {
            miniPlayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (AppState.isPlaying) {
                    this.pause();
                } else {
                    this.play();
                }
            });
        }

        // Siguiente
        const nextBtn = document.getElementById('player-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.playNext();
            });
        }

        // Anterior
        const prevBtn = document.getElementById('player-prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.playPrevious();
            });
        }

        // Barra de progreso
        const progressRange = document.getElementById('progress-range');
        if (progressRange) {
            progressRange.addEventListener('change', (e) => {
                this.seek(parseFloat(e.target.value));
            });
        }

        // Botón favorito
        const favoriteBtn = document.getElementById('player-favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => {
                if (!AppState.currentTrack) return;
                const isFav = toggleFavorite(AppState.currentTrack);
                const btn = document.getElementById('player-favorite-btn');
                if (isFav) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Botón agregar a playlist (no implementado aún)
        const playlistBtn = document.getElementById('player-playlist-btn');
        if (playlistBtn) {
            playlistBtn.addEventListener('click', () => {
                console.log('Agregar a playlist - próxima feature');
            });
        }
    },

    playNext() {
        if (AppState.playlist.length === 0) return;
        AppState.currentIndex = (AppState.currentIndex + 1) % AppState.playlist.length;
        this.playTrack(AppState.playlist[AppState.currentIndex]);
    },

    playPrevious() {
        if (AppState.playlist.length === 0) return;
        if (this.currentTime > 3) {
            this.seek(0);
        } else {
            AppState.currentIndex = (AppState.currentIndex - 1 + AppState.playlist.length) % AppState.playlist.length;
            this.playTrack(AppState.playlist[AppState.currentIndex]);
        }
    }
};

// Inicializar player cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    PlayerManager.init();
});

console.log('✅ Player.js cargado correctamente');

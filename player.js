// Player Manager - Maneja la reproducción con YouTube IFrame API

// 🔥 SOLO VARIABLE NUEVA (no afecta nada)
let relatedLoaded = false;

const PlayerManager = {
    player: null,
    isPlayerReady: false,
    currentTime: 0,
    duration: 0,
    updateInterval: null,

    init() {
        window.onYouTubeIframeAPIReady = () => this.onPlayerReady();
        this.setupEventListeners();
    },

    onPlayerReady() {
        console.log('✅ YouTube Player API lista');
        this.isPlayerReady = true;
        
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

        // 🔥 SOLO AÑADIDO (no rompe nada)
        AppState.currentTrack = track;

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
        }
        this.updatePlayButton();
    },

    // 🔥 SOLO MEJORADO (no rompe flujo)
    async onTrackEnded() {
        AppState.isPlaying = false;
        this.updatePlayButton();

        AppState.currentIndex++;

        if (AppState.currentIndex >= AppState.playlist.length) {

            let nuevos = [];

            if (!relatedLoaded && AppState.currentTrack) {
                relatedLoaded = true;
                nuevos = await getRelatedVideos(AppState.currentTrack.videoId);
            } else {
                nuevos = await getRandomVideos();
            }

            AppState.playlist.push(...nuevos);
        }

        this.playTrack(AppState.playlist[AppState.currentIndex]);
    },

    onPlayerError(event) {
        console.error('Error del player YouTube:', event.data);
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

        const progressFill = document.getElementById('progress-fill');
        const progressRange = document.getElementById('progress-range');

        if (this.duration > 0) {
            const percentage = (this.currentTime / this.duration) * 100;
            progressFill.style.width = percentage + '%';
            progressRange.max = this.duration;
            progressRange.value = this.currentTime;
        }

        document.getElementById('current-time').textContent =
            this.formatTime(this.currentTime);
        document.getElementById('total-time').textContent =
            this.formatTime(this.duration);
    },

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    },

    startStateMonitor() {
        setInterval(() => {
            if (!this.isPlayerReady) return;

            const playerState = this.player.getPlayerState();

            if (playerState === 1 && !AppState.isPlaying) {
                AppState.isPlaying = true;
                this.updatePlayButton();
            } else if (playerState === 2 && AppState.isPlaying) {
                AppState.isPlaying = false;
                this.updatePlayButton();
            }
        }, 500);
    },

    updatePlayButton() {
        const playBtn = document.getElementById('player-play-btn');
        if (playBtn) {
            const playIcon = playBtn.querySelector('.play-icon');
            const pauseIcon = playBtn.querySelector('.pause-icon');

            if (playIcon && pauseIcon) {
                if (AppState.isPlaying) {
                    playIcon.classList.add('hidden');
                    pauseIcon.classList.remove('hidden');
                } else {
                    playIcon.classList.remove('hidden');
                    pauseIcon.classList.add('hidden');
                }
            }
        }
    },

    setupEventListeners() {

        // ▶️ play/pause
        document.getElementById('player-play-btn')?.addEventListener('click', () => {
            AppState.isPlaying ? this.pause() : this.play();
        });

        // ⏮️ anterior
        document.getElementById('player-prev-btn')?.addEventListener('click', () => {
            if (!AppState.playlist.length) return;

            AppState.currentIndex =
                (AppState.currentIndex - 1 + AppState.playlist.length) %
                AppState.playlist.length;

            this.playTrack(AppState.playlist[AppState.currentIndex]);
        });

        // ⏭️ siguiente inteligente
        document.getElementById('player-next-btn')?.addEventListener('click', async () => {
            if (!AppState.playlist.length) return;

            AppState.currentIndex++;

            if (AppState.currentIndex >= AppState.playlist.length) {

                let nuevos = [];

                if (!relatedLoaded && AppState.currentTrack) {
                    relatedLoaded = true;
                    nuevos = await getRelatedVideos(AppState.currentTrack.videoId);
                } else {
                    nuevos = await getRandomVideos();
                }

                AppState.playlist.push(...nuevos);
            }

            this.playTrack(AppState.playlist[AppState.currentIndex]);
        });

        // ⟲ retroceder
        document.getElementById('player-rewind-btn')?.addEventListener('click', () => {
            const newTime = Math.max(0, this.getCurrentTime() - 10);
            this.seek(newTime);
        });

        // ⟳ adelantar
        document.getElementById('player-forward-btn')?.addEventListener('click', () => {
            const duration = this.getDuration();
            const newTime = Math.min(duration, this.getCurrentTime() + 10);
            this.seek(newTime);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    PlayerManager.init();
});

console.log('🔥 Player actualizado sin romper nada');

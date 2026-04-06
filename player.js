// Player Manager - Maneja la reproducción con YouTube IFrame API

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
            setTimeout(() => this.playTrack(track), 500);
            return;
        }

        console.log('🎵 Reproduciendo:', track.title);

        AppState.currentTrack = track;
        relatedLoaded = false; // 🔥 reset lógica

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

    seek(seconds) {
        if (!this.isPlayerReady) return;
        this.player.seekTo(seconds, true);
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

    async onTrackEnded() {
        AppState.isPlaying = false;
        this.updatePlayButton();

        AppState.currentIndex++;

        // 🔥 si ya no hay más canciones
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

    updatePlayButton() {
        const playBtn = document.getElementById('player-play-btn');
        if (playBtn) {
            const playIcon = playBtn.querySelector('.play-icon');
            const pauseIcon = playBtn.querySelector('.pause-icon');

            if (AppState.isPlaying) {
                playIcon?.classList.add('hidden');
                pauseIcon?.classList.remove('hidden');
            } else {
                playIcon?.classList.remove('hidden');
                pauseIcon?.classList.add('hidden');
            }
        }
    },

    setupEventListeners() {

        // ▶️ Play/Pause
        document.getElementById('player-play-btn')?.addEventListener('click', () => {
            AppState.isPlaying ? this.pause() : this.play();
        });

        // ⏮️ ANTERIOR
        document.getElementById('player-prev-btn')?.addEventListener('click', () => {
            if (!AppState.playlist.length) return;

            AppState.currentIndex =
                (AppState.currentIndex - 1 + AppState.playlist.length) %
                AppState.playlist.length;

            this.playTrack(AppState.playlist[AppState.currentIndex]);
        });

        // ⏭️ SIGUIENTE (CON LÓGICA INTELIGENTE)
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

        // ⟲ retroceder 10s
        document.getElementById('player-rewind-btn')?.addEventListener('click', () => {
            this.seek(Math.max(0, this.getCurrentTime() - 10));
        });

        // ⟳ adelantar 10s
        document.getElementById('player-forward-btn')?.addEventListener('click', () => {
            this.seek(Math.min(this.getDuration(), this.getCurrentTime() + 10));
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    PlayerManager.init();
});

console.log('🔥 Player PRO listo');

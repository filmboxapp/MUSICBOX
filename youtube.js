// YouTube API Manager
const YouTubeAPI = {
    baseUrl: 'https://www.googleapis.com/youtube/v3',
    cache: new Map(),
    cacheTime: 3600000, // 1 hora

    async search(query, maxResults = 10) {
        try {
            // Verificar cache
            const cacheKey = `search_${query}_${maxResults}`;
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('📦 Usando resultados en caché');
                return cached;
            }

            // IMPORTANTE: Reemplaza con tu API Key
            const apiKey = CONFIG.YOUTUBE_API_KEY;
            
            if (!apiKey || apiKey === 'AIzaSyDvFVnP5Bhl5lXN5bXrOfAcIzpN7XqGr5Q') {
                console.warn('⚠️ API Key no configurada o es de prueba');
                return this.getMockData();
            }

            const params = new URLSearchParams({
                part: 'snippet',
                q: query,
                type: 'video',
                maxResults: maxResults,
                key: apiKey,
                relevanceLanguage: 'es',
                regionCode: 'ES'
            });

            const response = await fetch(`${this.baseUrl}/search?${params}`);
            
            if (!response.ok) {
                if (response.status === 403) {
                    console.error('❌ API Key inválida o cuota excedida');
                    return this.getMockData();
                }
                throw new Error(`Error ${response.status}`);
            }

            const data = await response.json();
            const tracks = this.parseResults(data.items || []);
            
            // Guardar en caché
            this.setCache(cacheKey, tracks);
            
            console.log(`✅ Búsqueda completada: ${tracks.length} resultados`);
            return tracks;

        } catch (error) {
            console.error('❌ Error en búsqueda YouTube:', error);
            return this.getMockData();
        }
    },

    parseResults(items) {
        return items
            .filter(item => item.id.videoId)
            .map(item => ({
                videoId: item.id.videoId,
                title: this.decodeHtml(item.snippet.title),
                channel: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                description: this.decodeHtml(item.snippet.description)
            }));
    },

    decodeHtml(html) {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    },

    setCache(key, value) {
        this.cache.set(key, {
            data: value,
            timestamp: Date.now()
        });
    },

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached) {
            if (Date.now() - cached.timestamp < this.cacheTime) {
                return cached.data;
            }
            this.cache.delete(key);
        }
        return null;
    },

    // Datos mock para pruebas sin API Key
    getMockData() {
        return [
            {
                videoId: 'dQw4w9WgXcQ',
                title: 'Canción de Prueba 1',
                channel: 'Artist Oficial',
                thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
                description: 'Una canción de prueba'
            },
            {
                videoId: '9bZkp7q19f0',
                title: 'Canción de Prueba 2',
                channel: 'Artista 2',
                thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg',
                description: 'Otra canción de prueba'
            },
            {
                videoId: 'kJQP7kiw9Fk',
                title: 'Canción de Prueba 3',
                channel: 'Artista 3',
                thumbnail: 'https://img.youtube.com/vi/kJQP7kiw9Fk/mqdefault.jpg',
                description: 'Más música de prueba'
            },
            {
                videoId: '0VjIjW4it-Q',
                title: 'Canción de Prueba 4',
                channel: 'Artista 4',
                thumbnail: 'https://img.youtube.com/vi/0VjIjW4it-Q/mqdefault.jpg',
                description: 'Canción adicional'
            },
            {
                videoId: 'M7lc1BCxL00',
                title: 'Canción de Prueba 5',
                channel: 'Artista 5',
                thumbnail: 'https://img.youtube.com/vi/M7lc1BCxL00/mqdefault.jpg',
                description: 'Más contenido'
            },
            {
                videoId: '2Vv-BfVoq4g',
                title: 'Canción de Prueba 6',
                channel: 'Artista 6',
                thumbnail: 'https://img.youtube.com/vi/2Vv-BfVoq4g/mqdefault.jpg',
                description: 'Final del lote'
            }
        ];
    }
};

console.log('✅ YouTube.js cargado correctamente');
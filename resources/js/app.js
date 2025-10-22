import './bootstrap';
import '../css/app.css';

const API_BASE = '/api';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80';

const state = {
    playlists: [],
    currentPlaylistId: null,
    currentSongId: null,
    isPlaying: false,
    editingSong: null,
    karaokeIndex: -1,
};

const elements = {};

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '00:00';
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseTimeLabel(label) {
    if (!label) {
        return NaN;
    }
    const parts = label.split(':');
    if (parts.length < 2) {
        return NaN;
    }
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
        return NaN;
    }
    return minutes * 60 + seconds;
}

function parseLyrics(text) {
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [timeLabel, ...lyricParts] = line.split('|');
            const time = parseTimeLabel(timeLabel.trim());
            const lyric = lyricParts.join('|').trim();
            if (!lyric || Number.isNaN(time)) {
                return null;
            }
            return { time, text: lyric };
        })
        .filter(Boolean)
        .sort((a, b) => a.time - b.time);
}

function lyricsToText(lyrics = []) {
    return lyrics
        .map((line) => `${formatTime(Math.max(line.time, 0))}|${line.text}`)
        .join('\n');
}

function normalizeSong(rawSong) {
    if (!rawSong) {
        return null;
    }

    const songId = Number(rawSong.id);
    const playlistId = Number(rawSong.playlistId ?? rawSong.playlist_id);

    const lyrics = Array.isArray(rawSong.lyrics)
        ? rawSong.lyrics
              .map((line) => ({
                  time: Number(line.time),
                  text: typeof line.text === 'string' ? line.text.trim() : '',
              }))
              .filter((line) => !Number.isNaN(line.time) && line.text)
              .sort((a, b) => a.time - b.time)
        : [];

    return {
        id: Number.isNaN(songId) ? rawSong.id : songId,
        playlistId: Number.isNaN(playlistId) ? null : playlistId,
        title: rawSong.title ?? '',
        artist: rawSong.artist ?? '',
        album: rawSong.album ?? '',
        cover: rawSong.cover ?? rawSong.cover_url ?? '',
        audio: rawSong.audio ?? rawSong.audio_url ?? '',
        duration: Number.isFinite(rawSong.duration) ? Number(rawSong.duration) : null,
        lyrics,
    };
}

function normalizePlaylist(rawPlaylist) {
    if (!rawPlaylist) {
        return null;
    }
    const playlistId = Number(rawPlaylist.id);
    return {
        id: Number.isNaN(playlistId) ? rawPlaylist.id : playlistId,
        name: rawPlaylist.name ?? 'Danh sách phát',
        accent: rawPlaylist.accent ?? '#fb7185',
        songs: Array.isArray(rawPlaylist.songs)
            ? rawPlaylist.songs.map(normalizeSong).filter(Boolean)
            : [],
    };
}

function extractData(payload) {
    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
        return payload.data;
    }
    return payload;
}

function getCurrentPlaylist() {
    return state.playlists.find((playlist) => playlist.id === state.currentPlaylistId) ?? null;
}

function getCurrentSong() {
    const playlist = getCurrentPlaylist();
    if (!playlist) {
        return null;
    }
    return playlist.songs.find((song) => song.id === state.currentSongId) ?? null;
}

function setCurrentPlaylist(playlistId, { keepSong = false } = {}) {
    const id = playlistId === null || playlistId === undefined ? null : Number(playlistId);
    state.currentPlaylistId = Number.isNaN(id) ? null : id;
    const playlist = getCurrentPlaylist();
    if (!playlist) {
        state.currentSongId = null;
        return;
    }
    if (keepSong && playlist.songs.some((song) => song.id === state.currentSongId)) {
        return;
    }
    state.currentSongId = playlist.songs[0]?.id ?? null;
}

function setCurrentSong(songId) {
    const id = songId === null || songId === undefined ? null : Number(songId);
    if (Number.isNaN(id)) {
        state.currentSongId = null;
        return;
    }
    const playlist = getCurrentPlaylist();
    if (!playlist) {
        state.currentSongId = null;
        return;
    }
    const songExists = playlist.songs.some((song) => song.id === id);
    state.currentSongId = songExists ? id : playlist.songs[0]?.id ?? null;
}

function setLibrary(playlists = []) {
    const normalized = playlists.map(normalizePlaylist).filter(Boolean);
    state.playlists = normalized;
    if (!normalized.some((playlist) => playlist.id === state.currentPlaylistId)) {
        state.currentPlaylistId = normalized[0]?.id ?? null;
    }
    const playlist = getCurrentPlaylist();
    if (!playlist || !playlist.songs.some((song) => song.id === state.currentSongId)) {
        state.currentSongId = playlist?.songs[0]?.id ?? null;
    }
    updatePlaylistSelect();
    render();
}

function updatePlaylistSelect() {
    if (!elements.playlistSelect) return;
    elements.playlistSelect.innerHTML = '';

    if (state.playlists.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Chưa có danh sách phát';
        option.disabled = true;
        option.selected = true;
        elements.playlistSelect.appendChild(option);
        if (elements.songSubmit) {
            elements.songSubmit.disabled = true;
        }
        return;
    }

    state.playlists.forEach((playlist) => {
        const option = document.createElement('option');
        option.value = String(playlist.id);
        option.textContent = playlist.name;
        elements.playlistSelect.appendChild(option);
    });

    if (state.currentPlaylistId !== null) {
        elements.playlistSelect.value = String(state.currentPlaylistId);
    }

    if (elements.songSubmit) {
        elements.songSubmit.disabled = false;
    }
}

function renderPlaylists() {
    if (!elements.playlistList) return;
    elements.playlistList.innerHTML = '';

    if (state.playlists.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.className = 'rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-300';
        emptyState.textContent = 'Chưa có danh sách phát. Hãy tạo một danh sách mới bên dưới.';
        elements.playlistList.appendChild(emptyState);
        return;
    }

    state.playlists.forEach((playlist) => {
        const item = document.createElement('li');
        item.className = 'playlist-item';
        item.dataset.id = String(playlist.id);
        if (playlist.id === state.currentPlaylistId) {
            item.classList.add('playlist-item--active');
        }

        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'flex flex-col';

        const title = document.createElement('span');
        title.className = 'text-sm font-semibold';
        title.textContent = playlist.name;

        const count = document.createElement('span');
        count.className = 'text-xs uppercase tracking-[0.3em] text-rose-200/70';
        count.textContent = `${playlist.songs.length} bài`;

        titleWrapper.append(title, count);

        const accentDot = document.createElement('span');
        accentDot.className = 'h-2 w-2 rounded-full';
        accentDot.style.background = playlist.accent ?? '#fb7185';

        item.append(titleWrapper, accentDot);
        item.addEventListener('click', () => {
            setCurrentPlaylist(playlist.id);
            setCurrentSong(getCurrentSong()?.id ?? null);
            render();
        });

        elements.playlistList.appendChild(item);
    });
}

function renderSongs() {
    if (!elements.songList) return;
    const playlist = getCurrentPlaylist();
    elements.songList.innerHTML = '';
    elements.songCount.textContent = playlist ? `${playlist.songs.length} bài` : '0 bài';

    if (!playlist) {
        const emptyState = document.createElement('div');
        emptyState.className = 'rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-300';
        emptyState.textContent = 'Chưa có danh sách phát. Hãy tạo một danh sách mới để bắt đầu.';
        elements.songList.appendChild(emptyState);
        return;
    }

    if (playlist.songs.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-300';
        emptyState.textContent = 'Chưa có bài hát. Hãy thêm một bài mới bên dưới!';
        elements.songList.appendChild(emptyState);
        return;
    }

    playlist.songs.forEach((song) => {
        const item = document.createElement('li');
        item.className = 'song-tile';
        item.dataset.id = String(song.id);
        if (song.id === state.currentSongId) {
            item.classList.add('ring-2', 'ring-rose-400/60', 'bg-white/15');
        }

        const cover = document.createElement('div');
        cover.className = 'h-12 w-12 overflow-hidden rounded-xl shadow-lg shadow-black/40';
        cover.innerHTML = `<img src="${song.cover || DEFAULT_COVER}" alt="${song.title}" class="h-full w-full object-cover" />`;

        const infoWrapper = document.createElement('div');
        infoWrapper.className = 'flex flex-col';

        const title = document.createElement('button');
        title.type = 'button';
        title.className = 'text-left text-sm font-semibold text-white hover:underline';
        title.textContent = song.title;
        title.addEventListener('click', () => {
            setCurrentSong(song.id);
            renderPlayer();
            renderKaraoke();
            playCurrent();
        });

        const meta = document.createElement('span');
        meta.className = 'text-xs uppercase tracking-[0.3em] text-rose-200/70';
        meta.textContent = `${song.artist} · ${formatTime(song.duration ?? 0)}`;

        infoWrapper.append(title, meta);

        const actions = document.createElement('div');
        actions.className = 'song-actions';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.textContent = 'Sửa';
        editBtn.addEventListener('click', () => beginEditSong(song, playlist.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Xoá';
        deleteBtn.addEventListener('click', () => {
            removeSong(playlist.id, song.id);
        });

        actions.append(editBtn, deleteBtn);
        item.append(cover, infoWrapper, actions);
        elements.songList.appendChild(item);
    });
}

function renderPlayer() {
    const song = getCurrentSong();
    const playlist = getCurrentPlaylist();
    const audio = elements.audio;

    if (!audio) {
        return;
    }

    if (!song || !playlist) {
        audio.removeAttribute('src');
        delete audio.dataset.songId;
        pauseCurrent();
        elements.playerTitle.textContent = '--';
        elements.playerArtist.textContent = '--';
        elements.playerAlbum.textContent = '';
        elements.playerCover.src = DEFAULT_COVER;
        elements.currentTime.textContent = '00:00';
        elements.totalDuration.textContent = '00:00';
        elements.progress.value = 0;
        return;
    }

    if (audio.dataset.songId !== String(song.id)) {
        audio.src = song.audio;
        audio.dataset.songId = String(song.id);
        audio.load();
        if (state.isPlaying) {
            audio.play().catch(() => {
                state.isPlaying = false;
                updatePlayButton();
            });
        }
    }

    elements.playerTitle.textContent = song.title;
    elements.playerArtist.textContent = song.artist;
    elements.playerAlbum.textContent = song.album ?? '';
    elements.playerCover.src = song.cover || DEFAULT_COVER;
    elements.totalDuration.textContent = formatTime(song.duration ?? audio.duration ?? 0);
}

function renderKaraoke() {
    const container = elements.karaokePanel;
    const song = getCurrentSong();
    state.karaokeIndex = -1;
    container.innerHTML = '';

    if (!song || !song.lyrics || song.lyrics.length === 0) {
        container.innerHTML = '<p class="text-sm text-zinc-300">Chưa có lời karaoke cho bài hát này.</p>';
        return;
    }

    song.lyrics.forEach((line, index) => {
        const row = document.createElement('div');
        row.className = 'lyric-line';
        row.dataset.index = String(index);
        row.dataset.time = String(line.time);
        row.textContent = line.text;
        container.appendChild(row);
    });
}

function updateKaraoke(currentTime) {
    const song = getCurrentSong();
    if (!song || !song.lyrics || song.lyrics.length === 0) {
        return;
    }

    let activeIndex = -1;
    for (let i = 0; i < song.lyrics.length; i += 1) {
        if (currentTime + 0.2 >= song.lyrics[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }

    if (activeIndex === state.karaokeIndex) {
        return;
    }

    state.karaokeIndex = activeIndex;

    elements.karaokePanel.querySelectorAll('.lyric-line').forEach((element, index) => {
        if (index === activeIndex) {
            element.classList.add('lyric-line--active');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            element.classList.remove('lyric-line--active');
        }
    });
}

function updatePlayButton() {
    elements.playIcon.innerHTML = state.isPlaying ? '&#10074;&#10074;' : '&#9658;';
}

function playCurrent() {
    const audio = elements.audio;
    if (!audio) return;
    const song = getCurrentSong();
    if (!song || !song.audio) return;

    if (audio.dataset.songId !== String(song.id)) {
        audio.src = song.audio;
        audio.dataset.songId = String(song.id);
    }

    audio.play()
        .then(() => {
            state.isPlaying = true;
            updatePlayButton();
        })
        .catch(() => {
            state.isPlaying = false;
            updatePlayButton();
        });
}

function pauseCurrent() {
    if (!elements.audio) return;
    elements.audio.pause();
    state.isPlaying = false;
    updatePlayButton();
}

function playPause() {
    if (state.isPlaying) {
        pauseCurrent();
    } else {
        playCurrent();
    }
}

function playNext() {
    const playlist = getCurrentPlaylist();
    if (!playlist || playlist.songs.length === 0) {
        return;
    }
    const index = playlist.songs.findIndex((song) => song.id === state.currentSongId);
    const nextIndex = (index + 1) % playlist.songs.length;
    state.currentSongId = playlist.songs[nextIndex].id;
    renderPlayer();
    renderKaraoke();
    playCurrent();
}

function playPrevious() {
    const playlist = getCurrentPlaylist();
    if (!playlist || playlist.songs.length === 0) {
        return;
    }
    const index = playlist.songs.findIndex((song) => song.id === state.currentSongId);
    const prevIndex = (index - 1 + playlist.songs.length) % playlist.songs.length;
    state.currentSongId = playlist.songs[prevIndex].id;
    renderPlayer();
    renderKaraoke();
    playCurrent();
}

async function apiRequest(path, { method = 'GET', body, headers = {} } = {}) {
    const config = {
        method,
        headers: {
            Accept: 'application/json',
            ...headers,
        },
        credentials: 'same-origin',
    };

    if (body !== undefined) {
        config.body = JSON.stringify(body);
        config.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${path}`, config);
    if (response.status === 204) {
        return null;
    }

    let payload = null;
    const contentType = response.headers.get('Content-Type') ?? '';
    if (contentType.includes('application/json')) {
        payload = await response.json();
    } else {
        payload = await response.text();
    }

    if (!response.ok) {
        let message = 'Yêu cầu không thành công.';
        if (payload && typeof payload === 'object') {
            if (typeof payload.message === 'string') {
                message = payload.message;
            } else if (payload.errors) {
                const firstError = Object.values(payload.errors)[0];
                if (Array.isArray(firstError) && firstError.length > 0) {
                    message = firstError[0];
                }
            }
        } else if (typeof payload === 'string' && payload.trim()) {
            message = payload;
        }
        throw new Error(message);
    }

    return payload;
}

async function loadLibrary() {
    try {
        const payload = await apiRequest('/library');
        const playlists = extractData(payload) ?? [];
        setLibrary(Array.isArray(playlists) ? playlists : []);
    } catch (error) {
        console.error(error);
        if (elements.karaokePanel) {
            elements.karaokePanel.innerHTML = `<p class="text-sm text-rose-300">Không thể tải thư viện nhạc: ${error.message}</p>`;
        }
    }
}

async function addPlaylist(name) {
    try {
        const payload = await apiRequest('/playlists', {
            method: 'POST',
            body: { name },
        });
        const playlistData = extractData(payload);
        const playlist = normalizePlaylist({ ...playlistData, songs: playlistData?.songs ?? [] });
        state.playlists.push(playlist);
        state.currentPlaylistId = playlist.id;
        state.currentSongId = playlist.songs[0]?.id ?? null;
        updatePlaylistSelect();
        render();
    } catch (error) {
        console.error(error);
        alert(`Không thể tạo danh sách phát: ${error.message}`);
    }
}

function findSong(playlistId, songId) {
    const playlist = state.playlists.find((item) => item.id === playlistId);
    if (!playlist) return null;
    return playlist.songs.find((item) => item.id === songId) ?? null;
}

function beginEditSong(song, playlistId) {
    state.editingSong = { songId: song.id, playlistId };
    elements.songForm.title.value = song.title;
    elements.songForm.artist.value = song.artist;
    elements.songForm.album.value = song.album ?? '';
    elements.songForm.cover.value = song.cover ?? '';
    elements.songForm.audio.value = song.audio;
    elements.playlistSelect.value = String(playlistId);
    elements.songForm.lyrics.value = lyricsToText(song.lyrics ?? []);
    elements.formMode.textContent = 'Chỉnh sửa bài hát';
}

function resetSongForm() {
    elements.songForm.reset();
    elements.formMode.textContent = 'Thêm bài hát';
    state.editingSong = null;
    if (state.currentPlaylistId && elements.playlistSelect) {
        elements.playlistSelect.value = String(state.currentPlaylistId);
    }
}

async function upsertSong({ playlistId, song }) {
    const payload = {
        playlist_id: playlistId,
        title: song.title,
        artist: song.artist,
        album: song.album || null,
        cover: song.cover || null,
        audio: song.audio,
        lyrics: song.lyrics ?? [],
        duration: song.duration ?? null,
    };

    try {
        if (state.editingSong) {
            const response = await apiRequest(`/songs/${state.editingSong.songId}`, {
                method: 'PUT',
                body: payload,
            });
            const updatedSong = normalizeSong(extractData(response));
            const previousPlaylistId = state.editingSong.playlistId;
            if (previousPlaylistId !== playlistId) {
                const previousPlaylist = state.playlists.find((item) => item.id === previousPlaylistId);
                if (previousPlaylist) {
                    previousPlaylist.songs = previousPlaylist.songs.filter((item) => item.id !== updatedSong.id);
                }
            }
            const targetPlaylist = state.playlists.find((item) => item.id === playlistId);
            if (targetPlaylist) {
                const index = targetPlaylist.songs.findIndex((item) => item.id === updatedSong.id);
                if (index >= 0) {
                    targetPlaylist.songs[index] = updatedSong;
                } else {
                    targetPlaylist.songs.push(updatedSong);
                }
            }
            state.currentPlaylistId = playlistId;
            state.currentSongId = updatedSong.id;
        } else {
            const response = await apiRequest('/songs', {
                method: 'POST',
                body: payload,
            });
            const createdSong = normalizeSong(extractData(response));
            const playlist = state.playlists.find((item) => item.id === playlistId);
            if (playlist) {
                playlist.songs.push(createdSong);
                state.currentPlaylistId = playlist.id;
                state.currentSongId = createdSong.id;
            }
        }

        render();
        resetSongForm();
    } catch (error) {
        console.error(error);
        alert(`Không thể lưu bài hát: ${error.message}`);
    }
}

async function removeSong(playlistId, songId) {
    const confirmation = window.confirm('Bạn có chắc chắn muốn xoá bài hát này?');
    if (!confirmation) {
        return;
    }

    try {
        await apiRequest(`/songs/${songId}`, { method: 'DELETE' });
        const playlist = state.playlists.find((item) => item.id === playlistId);
        if (playlist) {
            playlist.songs = playlist.songs.filter((song) => song.id !== songId);
        }
        if (state.currentPlaylistId === playlistId && state.currentSongId === songId) {
            const currentPlaylist = getCurrentPlaylist();
            state.currentSongId = currentPlaylist?.songs[0]?.id ?? null;
        }
        if (state.editingSong && state.editingSong.songId === songId) {
            resetSongForm();
        }
        render();
    } catch (error) {
        console.error(error);
        alert(`Không thể xoá bài hát: ${error.message}`);
    }
}

function handleSongFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(elements.songForm);
    const title = formData.get('title')?.toString().trim();
    const artist = formData.get('artist')?.toString().trim();
    const album = formData.get('album')?.toString().trim();
    const cover = formData.get('cover')?.toString().trim();
    const audio = formData.get('audio')?.toString().trim();
    const playlistValue = formData.get('playlist');
    const playlistId = playlistValue !== null ? Number(playlistValue) : NaN;
    const lyricsText = formData.get('lyrics')?.toString() ?? '';

    if (!title || !artist || !audio) {
        alert('Vui lòng nhập đầy đủ tên bài hát, nghệ sĩ và nguồn nhạc.');
        return;
    }

    if (Number.isNaN(playlistId)) {
        alert('Vui lòng chọn danh sách phát.');
        return;
    }

    const existingSong = state.editingSong ? findSong(state.editingSong.playlistId, state.editingSong.songId) : null;

    upsertSong({
        playlistId,
        song: {
            title,
            artist,
            album,
            cover: cover || null,
            audio,
            lyrics: parseLyrics(lyricsText),
            duration: existingSong?.duration ?? null,
        },
    });
}

function handlePlaylistFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(elements.playlistForm);
    const name = formData.get('playlist')?.toString().trim();
    if (!name) return;
    addPlaylist(name);
    elements.playlistForm.reset();
}

function render() {
    renderPlaylists();
    renderSongs();
    renderPlayer();
    renderKaraoke();
}

document.addEventListener('DOMContentLoaded', () => {
    elements.audio = document.querySelector('#player-audio');
    elements.playButton = document.querySelector('[data-play-button]');
    elements.playIcon = document.querySelector('[data-play-icon]');
    elements.prevButton = document.querySelector('[data-prev-button]');
    elements.nextButton = document.querySelector('[data-next-button]');
    elements.progress = document.querySelector('[data-progress]');
    elements.currentTime = document.querySelector('[data-current-time]');
    elements.totalDuration = document.querySelector('[data-total-duration]');
    elements.playerTitle = document.querySelector('[data-player-title]');
    elements.playerArtist = document.querySelector('[data-player-artist]');
    elements.playerAlbum = document.querySelector('[data-player-album]');
    elements.playerCover = document.querySelector('[data-player-cover]');
    elements.playlistList = document.querySelector('[data-playlist-list]');
    elements.songList = document.querySelector('[data-song-list]');
    elements.songCount = document.querySelector('[data-song-count]');
    elements.karaokePanel = document.querySelector('[data-karaoke-panel]');
    elements.songForm = document.querySelector('[data-song-form]');
    elements.playlistSelect = document.querySelector('[data-playlist-select]');
    elements.formMode = document.querySelector('[data-form-mode]');
    elements.cancelEdit = document.querySelector('[data-cancel-edit]');
    elements.playlistForm = document.querySelector('[data-playlist-form]');
    elements.songSubmit = elements.songForm?.querySelector('button[type="submit"]');

    updatePlaylistSelect();
    render();
    updatePlayButton();

    elements.playButton?.addEventListener('click', playPause);
    elements.prevButton?.addEventListener('click', playPrevious);
    elements.nextButton?.addEventListener('click', playNext);

    elements.audio?.addEventListener('timeupdate', () => {
        const { currentTime, duration } = elements.audio;
        elements.currentTime.textContent = formatTime(currentTime);
        const total = getCurrentSong()?.duration ?? duration;
        elements.totalDuration.textContent = formatTime(total);
        if (Number.isFinite(duration) && duration > 0) {
            elements.progress.value = (currentTime / duration) * 100;
        }
        updateKaraoke(currentTime);
    });

    elements.audio?.addEventListener('ended', () => {
        playNext();
    });

    elements.audio?.addEventListener('play', () => {
        state.isPlaying = true;
        updatePlayButton();
    });

    elements.audio?.addEventListener('pause', () => {
        state.isPlaying = false;
        updatePlayButton();
    });

    elements.audio?.addEventListener('loadedmetadata', () => {
        const duration = elements.audio.duration;
        const song = getCurrentSong();
        if (song && Number.isFinite(duration)) {
            song.duration = duration;
            renderSongs();
        }
        elements.totalDuration.textContent = formatTime(duration);
    });

    elements.progress?.addEventListener('input', (event) => {
        const { duration } = elements.audio;
        if (!Number.isFinite(duration) || duration <= 0) {
            return;
        }
        const value = Number(event.target.value);
        elements.audio.currentTime = (value / 100) * duration;
    });

    elements.songForm?.addEventListener('submit', handleSongFormSubmit);
    elements.songForm?.addEventListener('reset', () => {
        setTimeout(() => resetSongForm(), 0);
    });
    elements.cancelEdit?.addEventListener('click', (event) => {
        event.preventDefault();
        resetSongForm();
    });

    elements.playlistForm?.addEventListener('submit', handlePlaylistFormSubmit);

    loadLibrary();
});

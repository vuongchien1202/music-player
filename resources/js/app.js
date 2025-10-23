import './bootstrap';
import '../css/app.css';

const API_BASE = '/api';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80';

const state = {
    playlists: [],
    currentPlaylistId: null,
    currentSongId: null,
    playbackMode: 'normal',
    shuffleQueue: [],
    playbackHistory: [],
    isPlaying: false,
    editingSong: null,
    karaokeIndex: -1,
    form: {
        coverSource: 'url',
        audioSource: 'url',
        coverObjectUrl: null,
        audioObjectUrl: null,
        duration: null,
    },
    lyricsDraft: [],
    equalizer: {
        bass: 0,
        treble: 0,
        preset: 'flat',
    },
    audioSettings: {
        speed: 1,
        pitch: 0,
    },
};

let currentPage = 'home';

const elements = {};

const PLAYBACK_MODE_ORDER = ['normal', 'repeat-all', 'repeat-one', 'shuffle'];

const PLAYBACK_MODE_CONFIG = {
    normal: {
        label: 'Phát tuần tự',
        icon: '▶️',
    },
    'repeat-all': {
        label: 'Lặp playlist',
        icon: '🔁',
    },
    'repeat-one': {
        label: 'Lặp 1 bài',
        icon: '🔂',
    },
    shuffle: {
        label: 'Ngẫu nhiên',
        icon: '🔀',
    },
};

const EQUALIZER_PRESETS = {
    flat: { label: 'Mặc định', bass: 0, treble: 0 },
    pop: { label: 'Pop', bass: 2, treble: 4 },
    rock: { label: 'Rock', bass: 5, treble: 2 },
    jazz: { label: 'Jazz', bass: 3, treble: 3 },
};

const audioEngine = {
    context: null,
    source: null,
    bassFilter: null,
    trebleFilter: null,
    outputGain: null,
};

const MAX_HISTORY = 50;

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

function shuffleArray(items) {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function ensureAudioEngine() {
    if (typeof window === 'undefined') {
        return null;
    }
    const audio = elements.playerAudio;
    if (!audio) {
        return null;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return null;
    }

    if (!audioEngine.context) {
        audioEngine.context = new AudioContextClass();
    }

    if (!audioEngine.source) {
        try {
            audioEngine.source = audioEngine.context.createMediaElementSource(audio);
        } catch (error) {
            console.error('Không thể khởi tạo bộ xử lý âm thanh:', error);
            return audioEngine.context;
        }
        audioEngine.bassFilter = audioEngine.context.createBiquadFilter();
        audioEngine.bassFilter.type = 'lowshelf';
        audioEngine.bassFilter.frequency.value = 200;

        audioEngine.trebleFilter = audioEngine.context.createBiquadFilter();
        audioEngine.trebleFilter.type = 'highshelf';
        audioEngine.trebleFilter.frequency.value = 4000;

        audioEngine.outputGain = audioEngine.context.createGain();

        audioEngine.source.connect(audioEngine.bassFilter);
        audioEngine.bassFilter.connect(audioEngine.trebleFilter);
        audioEngine.trebleFilter.connect(audioEngine.outputGain);
        audioEngine.outputGain.connect(audioEngine.context.destination);
    }

    applyEqualizerSettings();

    return audioEngine.context;
}

function resumeAudioContext() {
    const context = ensureAudioEngine();
    if (context && context.state === 'suspended') {
        context.resume().catch(() => {
            // Ignore resume errors caused by lack of user gesture.
        });
    }
}

function formatDecibel(value) {
    const number = Number(value);
    if (Number.isNaN(number) || !Number.isFinite(number)) {
        return '0 dB';
    }
    const sign = number > 0 ? '+' : '';
    return `${sign}${number.toFixed(0)} dB`;
}

function formatPitch(value) {
    const number = Number(value);
    if (Number.isNaN(number) || !Number.isFinite(number) || number === 0) {
        return '0 st';
    }
    const sign = number > 0 ? '+' : '';
    return `${sign}${number.toFixed(0)} st`;
}

function setPreservesPitch(audio, preserve) {
    if (!audio) return;
    if ('preservesPitch' in audio) {
        audio.preservesPitch = preserve;
    }
    if ('mozPreservesPitch' in audio) {
        audio.mozPreservesPitch = preserve;
    }
    if ('webkitPreservesPitch' in audio) {
        audio.webkitPreservesPitch = preserve;
    }
}

function applyTempoSettings() {
    const audio = elements.playerAudio;
    if (!audio) return;
    const speed = Math.min(1.5, Math.max(0.5, Number(state.audioSettings.speed) || 1));
    const pitchRatio = 2 ** ((Number(state.audioSettings.pitch) || 0) / 12);
    const playbackRate = Math.min(2.5, Math.max(0.25, speed * pitchRatio));
    audio.playbackRate = playbackRate;
    setPreservesPitch(audio, Number(state.audioSettings.pitch) === 0);
    updateTempoLabels();
}

function updateTempoLabels() {
    if (elements.speedControl && Number(elements.speedControl.value) !== Number(state.audioSettings.speed)) {
        elements.speedControl.value = String(state.audioSettings.speed);
    }
    if (elements.speedValue) {
        elements.speedValue.textContent = `${Number(state.audioSettings.speed).toFixed(2)}x`;
    }
    if (elements.pitchControl && Number(elements.pitchControl.value) !== Number(state.audioSettings.pitch)) {
        elements.pitchControl.value = String(state.audioSettings.pitch);
    }
    if (elements.pitchValue) {
        elements.pitchValue.textContent = formatPitch(state.audioSettings.pitch);
    }
}

function applyEqualizerSettings() {
    if (!audioEngine.bassFilter || !audioEngine.trebleFilter) {
        ensureAudioEngine();
    }
    if (audioEngine.bassFilter) {
        audioEngine.bassFilter.gain.value = Number(state.equalizer.bass) || 0;
    }
    if (audioEngine.trebleFilter) {
        audioEngine.trebleFilter.gain.value = Number(state.equalizer.treble) || 0;
    }
}

function updateEqualizerControls() {
    if (elements.eqBass) {
        elements.eqBass.value = String(state.equalizer.bass);
    }
    if (elements.eqBassValue) {
        elements.eqBassValue.textContent = formatDecibel(state.equalizer.bass);
    }
    if (elements.eqTreble) {
        elements.eqTreble.value = String(state.equalizer.treble);
    }
    if (elements.eqTrebleValue) {
        elements.eqTrebleValue.textContent = formatDecibel(state.equalizer.treble);
    }
    if (elements.eqPreset) {
        const option = elements.eqPreset.querySelector(`option[value="${state.equalizer.preset}"]`);
        elements.eqPreset.value = option ? state.equalizer.preset : 'custom';
    }
}

function updatePlaybackModeControl() {
    const config = PLAYBACK_MODE_CONFIG[state.playbackMode] ?? PLAYBACK_MODE_CONFIG.normal;
    if (elements.playbackModeIcon) {
        elements.playbackModeIcon.textContent = config.icon;
    }
    if (elements.playbackModeLabel) {
        elements.playbackModeLabel.textContent = config.label;
    } else if (elements.playbackModeToggle) {
        elements.playbackModeToggle.textContent = `${config.icon} ${config.label}`;
    }
}

function resetPlaybackState({ resetHistory = true } = {}) {
    state.shuffleQueue = [];
    if (resetHistory) {
        state.playbackHistory = [];
    }
}

function rebuildShuffleQueue() {
    const playlist = getCurrentPlaylist();
    if (!playlist) {
        state.shuffleQueue = [];
        return;
    }
    const queue = playlist.songs
        .map((song) => song.id)
        .filter((id) => id !== state.currentSongId);
    state.shuffleQueue = shuffleArray(queue);
}

function prunePlaybackHistory() {
    const playlist = getCurrentPlaylist();
    if (!playlist) {
        state.playbackHistory = [];
        state.shuffleQueue = [];
        return;
    }
    const validIds = new Set(playlist.songs.map((song) => song.id));
    state.playbackHistory = state.playbackHistory.filter((id) => validIds.has(id));
    state.shuffleQueue = state.shuffleQueue.filter((id) => validIds.has(id) && id !== state.currentSongId);
}

function pushSongHistory(songId) {
    if (!songId) return;
    const last = state.playbackHistory[state.playbackHistory.length - 1];
    if (last === songId) {
        return;
    }
    state.playbackHistory.push(songId);
    if (state.playbackHistory.length > MAX_HISTORY) {
        state.playbackHistory.shift();
    }
}

function setPlaybackMode(mode) {
    if (!PLAYBACK_MODE_ORDER.includes(mode)) {
        return;
    }
    if (state.playbackMode === mode) {
        return;
    }
    state.playbackMode = mode;
    if (mode === 'shuffle') {
        rebuildShuffleQueue();
    } else {
        state.shuffleQueue = [];
    }
    prunePlaybackHistory();
    updatePlaybackModeControl();
}

function cyclePlaybackMode() {
    const currentIndex = PLAYBACK_MODE_ORDER.indexOf(state.playbackMode);
    const nextIndex = (currentIndex + 1) % PLAYBACK_MODE_ORDER.length;
    setPlaybackMode(PLAYBACK_MODE_ORDER[nextIndex]);
}

function restartCurrentSong() {
    if (!elements.playerAudio) {
        return;
    }
    elements.playerAudio.currentTime = 0;
    playCurrent();
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
    const previousPlaylistId = state.currentPlaylistId;
    state.currentPlaylistId = Number.isNaN(id) ? null : id;
    if (previousPlaylistId !== state.currentPlaylistId) {
        resetPlaybackState();
    }
    const playlist = getCurrentPlaylist();
    if (!playlist) {
        state.currentSongId = null;
        return;
    }
    if (keepSong && playlist.songs.some((song) => song.id === state.currentSongId)) {
        return;
    }
    state.currentSongId = playlist.songs[0]?.id ?? null;
    prunePlaybackHistory();
    if (state.playbackMode === 'shuffle') {
        rebuildShuffleQueue();
    }
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
    const newSongId = songExists ? id : playlist.songs[0]?.id ?? null;
    state.currentSongId = newSongId;
    if (state.playbackMode === 'shuffle' && newSongId !== null) {
        state.shuffleQueue = state.shuffleQueue.filter((queuedId) => queuedId !== newSongId);
    }
    prunePlaybackHistory();
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
    prunePlaybackHistory();
    if (state.playbackMode === 'shuffle') {
        rebuildShuffleQueue();
    }
    updatePlaylistSelect();
    render();
}

function updatePlaylistSelect() {
    if (elements.playlistSelect) {
        elements.playlistSelect.innerHTML = '';
        if (state.playlists.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Chưa có danh sách phát';
            option.disabled = true;
            option.selected = true;
            elements.playlistSelect.appendChild(option);
            elements.playlistSelect.disabled = true;
        } else {
            state.playlists.forEach((playlist) => {
                const option = document.createElement('option');
                option.value = String(playlist.id);
                option.textContent = playlist.name;
                elements.playlistSelect.appendChild(option);
            });
            elements.playlistSelect.disabled = false;
            if (state.currentPlaylistId !== null) {
                elements.playlistSelect.value = String(state.currentPlaylistId);
            }
        }
    }

    if (elements.playlistTarget) {
        elements.playlistTarget.innerHTML = '';
        if (state.playlists.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Chưa có danh sách phát';
            option.disabled = true;
            option.selected = true;
            elements.playlistTarget.appendChild(option);
            elements.playlistTarget.disabled = true;
            if (elements.songSubmit) {
                elements.songSubmit.disabled = true;
            }
        } else {
            state.playlists.forEach((playlist) => {
                const option = document.createElement('option');
                option.value = String(playlist.id);
                option.textContent = playlist.name;
                elements.playlistTarget.appendChild(option);
            });
            elements.playlistTarget.disabled = false;
            if (state.currentPlaylistId !== null) {
                elements.playlistTarget.value = String(state.currentPlaylistId);
            }
            if (elements.songSubmit) {
                elements.songSubmit.disabled = false;
            }
        }
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
    const mode = elements.songList.dataset.songMode ?? (currentPage === 'songs' ? 'manage' : 'view');
    const showActions = mode === 'manage';
    elements.songList.innerHTML = '';

    if (elements.songCount) {
        elements.songCount.textContent = playlist ? `${playlist.songs.length} bài` : '0 bài';
    }

    const emptyState = document.createElement('div');
    emptyState.className = 'rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-300';

    if (!playlist) {
        emptyState.textContent = mode === 'manage'
            ? 'Chọn một danh sách phát để quản lý bài hát.'
            : 'Chưa có danh sách phát. Hãy tạo một danh sách mới để bắt đầu.';
        elements.songList.appendChild(emptyState);
        return;
    }

    if (playlist.songs.length === 0) {
        emptyState.textContent = mode === 'manage'
            ? 'Danh sách phát này chưa có bài hát. Hãy thêm bài mới ở biểu mẫu bên cạnh.'
            : 'Chưa có bài hát. Hãy thêm một bài mới trong phần quản lý.';
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
            if (state.currentSongId && state.currentSongId !== song.id) {
                pushSongHistory(state.currentSongId);
            }
            setCurrentSong(song.id);
            if (state.playbackMode === 'shuffle') {
                rebuildShuffleQueue();
            }
            renderPlayer();
            renderKaraoke();
            if (currentPage === 'home') {
                playCurrent();
            }
        });

        const meta = document.createElement('span');
        meta.className = 'text-xs uppercase tracking-[0.3em] text-rose-200/70';
        meta.textContent = `${song.artist} · ${formatTime(song.duration ?? 0)}`;

        infoWrapper.append(title, meta);

        item.append(cover, infoWrapper);

        if (showActions) {
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
            item.append(actions);
        }

        elements.songList.appendChild(item);
    });
}

function clearObjectUrl(url) {
    if (url) {
        URL.revokeObjectURL(url);
    }
}

function setCoverPreview(url) {
    if (!elements.coverPreview) return;
    elements.coverPreview.src = url || DEFAULT_COVER;
}

function resetCoverPreview() {
    clearObjectUrl(state.form.coverObjectUrl);
    state.form.coverObjectUrl = null;
    setCoverPreview('');
}

function updateCoverPreviewFromInputs() {
    if (!elements.coverPreview) return;
    if (state.form.coverSource === 'upload' && elements.coverFile?.files?.[0]) {
        clearObjectUrl(state.form.coverObjectUrl);
        state.form.coverObjectUrl = URL.createObjectURL(elements.coverFile.files[0]);
        setCoverPreview(state.form.coverObjectUrl);
        return;
    }

    const url = elements.coverUrl?.value?.trim();
    if (url) {
        setCoverPreview(url);
    } else if (!state.editingSong) {
        setCoverPreview('');
    }
}

function applyCoverSourceVisibility() {
    if (!elements.coverUrl || !elements.coverFile) return;
    if (state.form.coverSource === 'upload') {
        elements.coverUrl.classList.add('hidden');
        elements.coverFile.classList.remove('hidden');
    } else {
        elements.coverFile.classList.add('hidden');
        elements.coverUrl.classList.remove('hidden');
    }
}

function setCoverSource(source) {
    state.form.coverSource = source === 'upload' ? 'upload' : 'url';
    if (state.form.coverSource === 'url') {
        if (elements.coverFile) {
            elements.coverFile.value = '';
        }
        resetCoverPreview();
        updateCoverPreviewFromInputs();
    } else {
        if (elements.coverUrl) {
            elements.coverUrl.value = '';
        }
        resetCoverPreview();
    }
    applyCoverSourceVisibility();
}

function resetAudioPreview() {
    if (!elements.editorAudio) return;
    elements.editorAudio.pause();
    elements.editorAudio.removeAttribute('src');
    elements.editorAudio.load();
    clearObjectUrl(state.form.audioObjectUrl);
    state.form.audioObjectUrl = null;
    state.form.duration = null;
}

function setEditorAudioSource({ type, value }) {
    if (!elements.editorAudio) return;
    resetAudioPreview();

    if (type === 'file' && value instanceof File) {
        state.form.audioObjectUrl = URL.createObjectURL(value);
        elements.editorAudio.src = state.form.audioObjectUrl;
    } else if (type === 'url' && typeof value === 'string' && value.trim()) {
        elements.editorAudio.src = value.trim();
    } else {
        return;
    }

    elements.editorAudio.load();
}

function updateAudioPreviewFromInputs() {
    if (state.form.audioSource === 'upload' && elements.audioFile?.files?.[0]) {
        setEditorAudioSource({ type: 'file', value: elements.audioFile.files[0] });
        return;
    }

    const url = elements.audioUrl?.value?.trim();
    if (url) {
        setEditorAudioSource({ type: 'url', value: url });
    } else if (!state.editingSong) {
        resetAudioPreview();
    }
}

function applyAudioSourceVisibility() {
    if (!elements.audioUrl || !elements.audioFile) return;
    if (state.form.audioSource === 'upload') {
        elements.audioUrl.classList.add('hidden');
        elements.audioFile.classList.remove('hidden');
    } else {
        elements.audioFile.classList.add('hidden');
        elements.audioUrl.classList.remove('hidden');
    }
}

function setAudioSource(source) {
    state.form.audioSource = source === 'upload' ? 'upload' : 'url';
    if (state.form.audioSource === 'url') {
        if (elements.audioFile) {
            elements.audioFile.value = '';
        }
        resetAudioPreview();
        updateAudioPreviewFromInputs();
    } else {
        if (elements.audioUrl) {
            elements.audioUrl.value = '';
        }
        resetAudioPreview();
    }
    applyAudioSourceVisibility();
}

function updatePlaylistPreview() {
    if (!elements.playlistPreviewText) return;
    const name = elements.playlistNameInput?.value?.trim() || 'Danh sách mới';
    elements.playlistPreviewText.textContent = name;
    if (elements.playlistAccentPreview && elements.playlistAccent) {
        const accent = elements.playlistAccent.value || '#fb7185';
        elements.playlistAccentPreview.style.background = accent;
    }
}

function normalizeLyricLine(line) {
    const time = Number.isFinite(line.time) ? Math.max(0, Number(line.time)) : null;
    const text = typeof line.text === 'string' ? line.text : '';
    return { time, text };
}

function setLyricsDraft(lyrics = []) {
    state.lyricsDraft = Array.isArray(lyrics)
        ? lyrics.map((line) => normalizeLyricLine(line)).filter((line) => line.text.trim() !== '')
        : [];
    renderLyricsEditor();
}

function addLyricsLine(line = {}) {
    state.lyricsDraft.push(normalizeLyricLine({ time: null, text: '', ...line }));
    renderLyricsEditor();
}

function removeLyricsLine(index) {
    if (index < 0 || index >= state.lyricsDraft.length) return;
    state.lyricsDraft.splice(index, 1);
    renderLyricsEditor();
}

function assignCurrentTimeToLyric(index) {
    if (!elements.editorAudio || index < 0 || index >= state.lyricsDraft.length) return;
    const { currentTime } = elements.editorAudio;
    state.lyricsDraft[index].time = Number.isFinite(currentTime) ? currentTime : 0;
    renderLyricsEditor();
}

function renderLyricsEditor() {
    if (!elements.lyricsList) return;

    elements.lyricsList.innerHTML = '';

    if (!state.lyricsDraft || state.lyricsDraft.length === 0) {
        if (elements.lyricsEmpty) {
            elements.lyricsEmpty.classList.remove('hidden');
        }
        return;
    }

    if (elements.lyricsEmpty) {
        elements.lyricsEmpty.classList.add('hidden');
    }

    state.lyricsDraft.forEach((line, index) => {
        const item = document.createElement('li');
        item.className = 'flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 sm:flex-row sm:items-center';

        const timeGroup = document.createElement('div');
        timeGroup.className = 'flex flex-col gap-1 sm:w-32';

        const timeLabel = document.createElement('span');
        timeLabel.className = 'text-[0.65rem] uppercase tracking-[0.3em] text-zinc-400';
        timeLabel.textContent = 'Thời gian';

        const timeInput = document.createElement('input');
        timeInput.type = 'text';
        timeInput.className = 'input-field text-sm';
        timeInput.placeholder = '00:00';
        timeInput.value = Number.isFinite(line.time) ? formatTime(Math.max(0, line.time)) : '';
        timeInput.addEventListener('change', (event) => {
            const value = event.target.value.trim();
            const seconds = parseTimeLabel(value);
            if (Number.isNaN(seconds)) {
                state.lyricsDraft[index].time = null;
                event.target.value = '';
            } else {
                state.lyricsDraft[index].time = seconds;
                event.target.value = formatTime(seconds);
            }
        });

        timeGroup.append(timeLabel, timeInput);

        const textGroup = document.createElement('div');
        textGroup.className = 'flex-1';

        const textLabel = document.createElement('span');
        textLabel.className = 'text-[0.65rem] uppercase tracking-[0.3em] text-zinc-400';
        textLabel.textContent = 'Nội dung';

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'input-field';
        textInput.placeholder = 'Nhập lời hát';
        textInput.value = line.text;
        textInput.addEventListener('input', (event) => {
            state.lyricsDraft[index].text = event.target.value;
        });

        textGroup.append(textLabel, textInput);

        const actions = document.createElement('div');
        actions.className = 'flex flex-wrap gap-2';

        const assignButton = document.createElement('button');
        assignButton.type = 'button';
        assignButton.className = 'editor-button';
        assignButton.textContent = 'Gán thời gian';
        assignButton.addEventListener('click', () => assignCurrentTimeToLyric(index));

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'editor-button editor-button--danger';
        removeButton.textContent = 'Xoá dòng';
        removeButton.addEventListener('click', () => removeLyricsLine(index));

        actions.append(assignButton, removeButton);

        item.append(timeGroup, textGroup, actions);
        elements.lyricsList.appendChild(item);
    });
}

function getLyricsForSubmission() {
    if (!state.lyricsDraft || state.lyricsDraft.length === 0) {
        return [];
    }

    return state.lyricsDraft
        .map((line) => ({
            time: Number.isFinite(line.time) ? Math.max(0, Number(line.time)) : null,
            text: (line.text ?? '').trim(),
        }))
        .filter((line) => line.text)
        .map((line) => ({
            time: line.time ?? 0,
            text: line.text,
        }))
        .sort((a, b) => a.time - b.time);
}

function toggleLyricsImportPanel(show) {
    if (!elements.lyricsImportPanel) return;
    const shouldShow = Boolean(show);
    if (shouldShow) {
        elements.lyricsImportPanel.classList.remove('hidden');
        elements.lyricsImportText?.focus();
    } else {
        elements.lyricsImportPanel.classList.add('hidden');
        if (elements.lyricsImportText) {
            elements.lyricsImportText.value = '';
        }
    }
}

function importLyricsFromText(text) {
    if (typeof text !== 'string' || !text.trim()) {
        setLyricsDraft([]);
        return;
    }
    const lyrics = parseLyrics(text);
    setLyricsDraft(lyrics);
}

function renderPlayer() {
    const song = getCurrentSong();
    const playlist = getCurrentPlaylist();
    const audio = elements.playerAudio;

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
        applyTempoSettings();
        applyEqualizerSettings();
        if (state.isPlaying) {
            audio.play().catch(() => {
                state.isPlaying = false;
                updatePlayButton();
            });
        }
    } else {
        applyTempoSettings();
        applyEqualizerSettings();
    }

    elements.playerTitle.textContent = song.title;
    elements.playerArtist.textContent = song.artist;
    elements.playerAlbum.textContent = song.album ?? '';
    elements.playerCover.src = song.cover || DEFAULT_COVER;
    elements.totalDuration.textContent = formatTime(song.duration ?? audio.duration ?? 0);
    updatePlaybackModeControl();
}

function renderKaraoke() {
    const container = elements.karaokePanel;
    const song = getCurrentSong();

    state.karaokeIndex = -1;

    if (!container) {
        return;
    }

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
    const container = elements.karaokePanel;
    const song = getCurrentSong();

    if (!container || !song || !song.lyrics || song.lyrics.length === 0) {
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

    container.querySelectorAll('.lyric-line').forEach((element, index) => {
        if (index === activeIndex) {
            element.classList.add('lyric-line--active');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            element.classList.remove('lyric-line--active');
        }
    });
}

function updatePlayButton() {
    if (!elements.playIcon) {
        return;
    }

    elements.playIcon.innerHTML = state.isPlaying ? '&#10074;&#10074;' : '&#9658;';
}

function playCurrent() {
    const audio = elements.playerAudio;
    if (!audio) return;
    const song = getCurrentSong();
    if (!song || !song.audio) return;

    if (audio.dataset.songId !== String(song.id)) {
        audio.src = song.audio;
        audio.dataset.songId = String(song.id);
    }

    resumeAudioContext();
    applyTempoSettings();
    applyEqualizerSettings();

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
    if (!elements.playerAudio) return;
    elements.playerAudio.pause();
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

function playNext({ auto = false } = {}) {
    const playlist = getCurrentPlaylist();
    if (!playlist || playlist.songs.length === 0) {
        return false;
    }

    if (state.playbackMode === 'repeat-one') {
        restartCurrentSong();
        return true;
    }

    if (state.playbackMode === 'shuffle') {
        if (playlist.songs.length === 1) {
            restartCurrentSong();
            return true;
        }
        if (state.shuffleQueue.length === 0) {
            rebuildShuffleQueue();
        }
        let nextId = state.shuffleQueue.shift();
        if (!nextId || nextId === state.currentSongId) {
            rebuildShuffleQueue();
            nextId = state.shuffleQueue.shift();
        }
        if (!nextId) {
            restartCurrentSong();
            return true;
        }
        if (state.currentSongId) {
            pushSongHistory(state.currentSongId);
        }
        state.currentSongId = nextId;
        prunePlaybackHistory();
        renderPlayer();
        renderKaraoke();
        playCurrent();
        return true;
    }

    const index = playlist.songs.findIndex((song) => song.id === state.currentSongId);
    let nextIndex = index + 1;
    if (index === -1) {
        nextIndex = 0;
    }
    if (nextIndex >= playlist.songs.length) {
        if (state.playbackMode === 'repeat-all') {
            nextIndex = 0;
        } else {
            if (auto) {
                state.isPlaying = false;
                updatePlayButton();
            }
            return false;
        }
    }

    const nextSong = playlist.songs[nextIndex];
    if (!nextSong) {
        return false;
    }
    if (state.currentSongId) {
        pushSongHistory(state.currentSongId);
    }
    state.currentSongId = nextSong.id;
    prunePlaybackHistory();
    renderPlayer();
    renderKaraoke();
    playCurrent();
    return true;
}

function playPrevious() {
    const playlist = getCurrentPlaylist();
    if (!playlist || playlist.songs.length === 0) {
        return;
    }

    if (state.playbackMode === 'repeat-one') {
        restartCurrentSong();
        return;
    }

    if (state.playbackMode === 'shuffle') {
        if (state.currentSongId) {
            state.shuffleQueue = [
                state.currentSongId,
                ...state.shuffleQueue.filter((id) => id !== state.currentSongId),
            ];
        }
        const previousId = state.playbackHistory.pop();
        if (previousId && playlist.songs.some((song) => song.id === previousId)) {
            state.currentSongId = previousId;
            prunePlaybackHistory();
            renderPlayer();
            renderKaraoke();
            playCurrent();
            return;
        }
        if (playlist.songs.length === 1) {
            restartCurrentSong();
            return;
        }
        if (state.shuffleQueue.length === 0) {
            rebuildShuffleQueue();
        }
        const fallback = state.shuffleQueue.shift();
        if (fallback) {
            state.currentSongId = fallback;
            prunePlaybackHistory();
            renderPlayer();
            renderKaraoke();
            playCurrent();
        }
        return;
    }

    const index = playlist.songs.findIndex((song) => song.id === state.currentSongId);
    let prevIndex = index - 1;
    if (index === -1) {
        prevIndex = 0;
    } else if (prevIndex < 0) {
        prevIndex = playlist.songs.length - 1;
    }
    const prevSong = playlist.songs[prevIndex];
    if (!prevSong) {
        return;
    }
    state.currentSongId = prevSong.id;
    prunePlaybackHistory();
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

    if (body instanceof FormData) {
        config.body = body;
    } else if (body !== undefined && body !== null) {
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

async function addPlaylist({ name, accent }) {
    try {
        const payload = await apiRequest('/playlists', {
            method: 'POST',
            body: { name, accent: accent || null },
        });
        const playlistData = extractData(payload);
        const playlist = normalizePlaylist({ ...playlistData, songs: playlistData?.songs ?? [] });
        state.playlists.push(playlist);
        state.currentPlaylistId = playlist.id;
        state.currentSongId = playlist.songs[0]?.id ?? null;
        resetPlaybackState();
        prunePlaybackHistory();
        if (state.playbackMode === 'shuffle') {
            rebuildShuffleQueue();
        }
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
    if (!elements.songForm) return;
    state.editingSong = { songId: song.id, playlistId };

    elements.songForm.title.value = song.title ?? '';
    elements.songForm.artist.value = song.artist ?? '';
    elements.songForm.album.value = song.album ?? '';

    setCoverSource('url');
    if (elements.coverUrl) {
        elements.coverUrl.value = song.cover ?? '';
    }
    resetCoverPreview();
    if (song.cover) {
        setCoverPreview(song.cover);
    } else {
        updateCoverPreviewFromInputs();
    }

    setAudioSource('url');
    if (elements.audioUrl) {
        elements.audioUrl.value = song.audio ?? '';
    }
    setEditorAudioSource({ type: 'url', value: song.audio ?? '' });
    state.form.duration = Number.isFinite(song.duration) ? Number(song.duration) : null;

    if (elements.playlistTarget) {
        elements.playlistTarget.value = String(playlistId);
    }
    if (elements.playlistSelect) {
        elements.playlistSelect.value = String(playlistId);
    }

    state.currentPlaylistId = playlistId;
    setCurrentSong(song.id);

    setLyricsDraft(song.lyrics ?? []);
    toggleLyricsImportPanel(false);

    if (elements.formMode) {
        elements.formMode.textContent = 'Chỉnh sửa bài hát';
    }

    if (typeof elements.songForm.scrollIntoView === 'function') {
        elements.songForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function resetSongForm() {
    if (!elements.songForm) return;
    elements.songForm.reset();
    state.editingSong = null;
    state.form.coverSource = 'url';
    state.form.audioSource = 'url';
    state.form.duration = null;
    resetCoverPreview();
    applyCoverSourceVisibility();
    resetAudioPreview();
    applyAudioSourceVisibility();
    toggleLyricsImportPanel(false);
    setLyricsDraft([]);
    if (elements.formMode) {
        elements.formMode.textContent = 'Thêm bài hát';
    }
    if (state.currentPlaylistId) {
        if (elements.playlistTarget) {
            elements.playlistTarget.value = String(state.currentPlaylistId);
        }
        if (elements.playlistSelect) {
            elements.playlistSelect.value = String(state.currentPlaylistId);
        }
    }
}

async function upsertSong({ playlistId, song }) {
    const formData = new FormData();
    formData.append('playlist_id', String(playlistId));
    formData.append('title', song.title);
    formData.append('artist', song.artist);
    if (song.album) {
        formData.append('album', song.album);
    }

    if (song.coverSource === 'upload' && song.coverFile) {
        formData.append('cover_file', song.coverFile);
    } else if (song.coverSource === 'url' && song.cover) {
        formData.append('cover', song.cover);
    }

    if (song.audioSource === 'upload' && song.audioFile) {
        formData.append('audio_file', song.audioFile);
    } else if (song.audioSource === 'url' && song.audio) {
        formData.append('audio', song.audio);
    }

    if (Number.isFinite(song.duration) && song.duration !== null) {
        formData.append('duration', String(song.duration));
    }

    (song.lyrics ?? []).forEach((line, index) => {
        formData.append(`lyrics[${index}][time]`, String(line.time));
        formData.append(`lyrics[${index}][text]`, line.text);
    });

    try {
        let response;
        if (state.editingSong) {
            formData.append('_method', 'PUT');
            response = await apiRequest(`/songs/${state.editingSong.songId}`, {
                method: 'POST',
                body: formData,
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
            prunePlaybackHistory();
            if (state.playbackMode === 'shuffle') {
                rebuildShuffleQueue();
            }
        } else {
            response = await apiRequest('/songs', {
                method: 'POST',
                body: formData,
            });
            const createdSong = normalizeSong(extractData(response));
            const playlist = state.playlists.find((item) => item.id === playlistId);
            if (playlist) {
                playlist.songs.push(createdSong);
                state.currentPlaylistId = playlist.id;
                state.currentSongId = createdSong.id;
            }
            prunePlaybackHistory();
            if (state.playbackMode === 'shuffle') {
                rebuildShuffleQueue();
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
        state.playbackHistory = state.playbackHistory.filter((id) => id !== songId);
        state.shuffleQueue = state.shuffleQueue.filter((id) => id !== songId);
        prunePlaybackHistory();
        if (state.playbackMode === 'shuffle') {
            rebuildShuffleQueue();
        }
        render();
    } catch (error) {
        console.error(error);
        alert(`Không thể xoá bài hát: ${error.message}`);
    }
}

function handleSongFormSubmit(event) {
    event.preventDefault();
    if (!elements.songForm) return;

    const formData = new FormData(elements.songForm);
    const title = formData.get('title')?.toString().trim();
    const artist = formData.get('artist')?.toString().trim();
    const album = formData.get('album')?.toString().trim() || '';
    const playlistValue = formData.get('playlist');
    const playlistId = playlistValue !== null ? Number(playlistValue) : NaN;

    const coverSource = state.form.coverSource;
    const audioSource = state.form.audioSource;
    const coverUrl = coverSource === 'url' ? elements.coverUrl?.value?.trim() ?? '' : '';
    const coverFile = coverSource === 'upload' ? elements.coverFile?.files?.[0] ?? null : null;
    const audioUrl = audioSource === 'url' ? elements.audioUrl?.value?.trim() ?? '' : '';
    const audioFile = audioSource === 'upload' ? elements.audioFile?.files?.[0] ?? null : null;

    if (!title || !artist) {
        alert('Vui lòng nhập đầy đủ tên bài hát và nghệ sĩ.');
        return;
    }

    if (audioSource === 'upload' ? !audioFile : !audioUrl) {
        alert('Vui lòng cung cấp nguồn nhạc hợp lệ (tệp hoặc đường dẫn).');
        return;
    }

    if (Number.isNaN(playlistId)) {
        alert('Vui lòng chọn danh sách phát.');
        return;
    }

    const existingSong = state.editingSong ? findSong(state.editingSong.playlistId, state.editingSong.songId) : null;
    const durationFromAudio = Number.isFinite(elements.editorAudio?.duration) ? elements.editorAudio.duration : null;
    const duration = Number.isFinite(state.form.duration)
        ? Number(state.form.duration)
        : durationFromAudio ?? existingSong?.duration ?? null;

    const lyrics = getLyricsForSubmission();

    upsertSong({
        playlistId,
        song: {
            title,
            artist,
            album,
            cover: coverUrl || null,
            coverSource,
            coverFile,
            audio: audioUrl || null,
            audioSource,
            audioFile,
            lyrics,
            duration,
        },
    });
}

function handlePlaylistFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(elements.playlistForm);
    const name = formData.get('playlist')?.toString().trim();
    if (!name) return;
    const accent = formData.get('accent')?.toString().trim() || null;
    addPlaylist({ name, accent });
    elements.playlistForm.reset();
    updatePlaylistPreview();
}

function render() {
    renderPlaylists();
    renderSongs();
    renderPlayer();
    renderKaraoke();
}

document.addEventListener('DOMContentLoaded', () => {
    currentPage = document.body?.dataset?.page ?? 'home';

    elements.playerAudio = document.querySelector('#player-audio');
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
    elements.playbackModeToggle = document.querySelector('[data-playback-mode]');
    elements.playbackModeIcon = document.querySelector('[data-playback-mode-icon]');
    elements.playbackModeLabel = document.querySelector('[data-playback-mode-label]');
    elements.speedControl = document.querySelector('[data-speed-control]');
    elements.speedValue = document.querySelector('[data-speed-value]');
    elements.pitchControl = document.querySelector('[data-pitch-control]');
    elements.pitchValue = document.querySelector('[data-pitch-value]');
    elements.eqPreset = document.querySelector('[data-eq-preset]');
    elements.eqBass = document.querySelector('[data-eq-bass]');
    elements.eqTreble = document.querySelector('[data-eq-treble]');
    elements.eqBassValue = document.querySelector('[data-eq-bass-value]');
    elements.eqTrebleValue = document.querySelector('[data-eq-treble-value]');
    elements.playlistList = document.querySelector('[data-playlist-list]');
    elements.songList = document.querySelector('[data-song-list]');
    elements.songCount = document.querySelector('[data-song-count]');
    elements.karaokePanel = document.querySelector('[data-karaoke-panel]');
    elements.songForm = document.querySelector('[data-song-form]');
    elements.playlistSelect = document.querySelector('[data-playlist-select]');
    elements.playlistTarget = document.querySelector('[data-playlist-target]');
    elements.formMode = document.querySelector('[data-form-mode]');
    elements.cancelEdit = document.querySelector('[data-cancel-edit]');
    elements.playlistForm = document.querySelector('[data-playlist-form]');
    elements.songSubmit = elements.songForm?.querySelector('button[type="submit"]');
    elements.playlistAccent = document.querySelector('[data-playlist-accent]');
    elements.playlistAccentPreview = document.querySelector('[data-playlist-accent-preview]');
    elements.playlistPreviewText = document.querySelector('[data-playlist-preview-text]');
    elements.playlistNameInput = document.querySelector('#playlist-name');

    elements.coverSourceRadios = document.querySelectorAll('[data-cover-source]');
    elements.coverUrl = document.querySelector('[data-cover-url]');
    elements.coverFile = document.querySelector('[data-cover-file]');
    elements.coverPreview = document.querySelector('[data-cover-preview]');

    elements.audioSourceRadios = document.querySelectorAll('[data-audio-source]');
    elements.audioUrl = document.querySelector('[data-audio-url]');
    elements.audioFile = document.querySelector('[data-audio-file]');
    elements.editorAudio = document.querySelector('[data-editor-audio]');

    elements.lyricsEditor = document.querySelector('[data-lyrics-editor]');
    elements.lyricsList = elements.lyricsEditor?.querySelector('[data-lyrics-list]');
    elements.lyricsEmpty = elements.lyricsEditor?.querySelector('[data-lyrics-empty]');
    elements.lyricsAdd = elements.lyricsEditor?.querySelector('[data-lyrics-add]');
    elements.lyricsImportToggle = elements.lyricsEditor?.querySelector('[data-lyrics-import-toggle]');
    elements.lyricsImportPanel = elements.lyricsEditor?.querySelector('[data-lyrics-import-panel]');
    elements.lyricsImportText = elements.lyricsEditor?.querySelector('[data-lyrics-import-text]');
    elements.lyricsImportConfirm = elements.lyricsEditor?.querySelector('[data-lyrics-import-confirm]');
    elements.lyricsImportCancel = elements.lyricsEditor?.querySelector('[data-lyrics-import-cancel]');

    applyCoverSourceVisibility();
    applyAudioSourceVisibility();
    updatePlaylistPreview();
    renderLyricsEditor();

    updatePlaylistSelect();
    render();
    updatePlayButton();
    updatePlaybackModeControl();
    updateTempoLabels();
    updateEqualizerControls();
    applyTempoSettings();
    applyEqualizerSettings();

    elements.playButton?.addEventListener('click', playPause);
    elements.prevButton?.addEventListener('click', () => {
        playPrevious();
    });
    elements.nextButton?.addEventListener('click', () => {
        playNext();
    });

    elements.playbackModeToggle?.addEventListener('click', () => {
        cyclePlaybackMode();
    });

    elements.speedControl?.addEventListener('input', (event) => {
        const value = Number(event.target.value);
        if (!Number.isFinite(value)) {
            return;
        }
        state.audioSettings.speed = value;
        applyTempoSettings();
    });

    elements.pitchControl?.addEventListener('input', (event) => {
        const value = Number(event.target.value);
        if (!Number.isFinite(value)) {
            return;
        }
        state.audioSettings.pitch = value;
        applyTempoSettings();
    });

    elements.eqPreset?.addEventListener('change', (event) => {
        const { value } = event.target;
        if (EQUALIZER_PRESETS[value]) {
            state.equalizer.bass = EQUALIZER_PRESETS[value].bass;
            state.equalizer.treble = EQUALIZER_PRESETS[value].treble;
            state.equalizer.preset = value;
            updateEqualizerControls();
            applyEqualizerSettings();
        } else {
            state.equalizer.preset = 'custom';
            updateEqualizerControls();
        }
    });

    elements.eqBass?.addEventListener('input', (event) => {
        state.equalizer.bass = Number(event.target.value);
        state.equalizer.preset = 'custom';
        updateEqualizerControls();
        applyEqualizerSettings();
    });

    elements.eqTreble?.addEventListener('input', (event) => {
        state.equalizer.treble = Number(event.target.value);
        state.equalizer.preset = 'custom';
        updateEqualizerControls();
        applyEqualizerSettings();
    });

    elements.playerAudio?.addEventListener('timeupdate', () => {
        const { currentTime, duration } = elements.playerAudio;
        elements.currentTime.textContent = formatTime(currentTime);
        const total = getCurrentSong()?.duration ?? duration;
        elements.totalDuration.textContent = formatTime(total);
        if (Number.isFinite(duration) && duration > 0) {
            elements.progress.value = (currentTime / duration) * 100;
        }
        updateKaraoke(currentTime);
    });

    elements.playerAudio?.addEventListener('ended', () => {
        const advanced = playNext({ auto: true });
        if (!advanced && elements.playerAudio) {
            elements.playerAudio.currentTime = 0;
        }
    });

    elements.playerAudio?.addEventListener('play', () => {
        state.isPlaying = true;
        updatePlayButton();
        resumeAudioContext();
        applyTempoSettings();
        applyEqualizerSettings();
    });

    elements.playerAudio?.addEventListener('pause', () => {
        state.isPlaying = false;
        updatePlayButton();
    });

    elements.playerAudio?.addEventListener('loadedmetadata', () => {
        const duration = elements.playerAudio.duration;
        const song = getCurrentSong();
        if (song && Number.isFinite(duration)) {
            song.duration = duration;
            renderSongs();
        }
        elements.totalDuration.textContent = formatTime(duration);
    });

    elements.progress?.addEventListener('input', (event) => {
        const { duration } = elements.playerAudio;
        if (!Number.isFinite(duration) || duration <= 0) {
            return;
        }
        const value = Number(event.target.value);
        elements.playerAudio.currentTime = (value / 100) * duration;
    });

    elements.playlistSelect?.addEventListener('change', (event) => {
        const value = Number(event.target.value);
        if (!Number.isNaN(value)) {
            setCurrentPlaylist(value);
            render();
            if (elements.playlistTarget) {
                elements.playlistTarget.value = String(value);
            }
        }
    });

    elements.playlistTarget?.addEventListener('change', (event) => {
        const value = Number(event.target.value);
        if (!Number.isNaN(value)) {
            setCurrentPlaylist(value, { keepSong: true });
            render();
        }
    });

    elements.coverSourceRadios?.forEach((radio) => {
        radio.addEventListener('change', (event) => {
            setCoverSource(event.target.value);
        });
    });

    elements.coverUrl?.addEventListener('input', updateCoverPreviewFromInputs);
    elements.coverFile?.addEventListener('change', updateCoverPreviewFromInputs);

    elements.audioSourceRadios?.forEach((radio) => {
        radio.addEventListener('change', (event) => {
            setAudioSource(event.target.value);
        });
    });

    elements.audioUrl?.addEventListener('input', updateAudioPreviewFromInputs);
    elements.audioFile?.addEventListener('change', updateAudioPreviewFromInputs);

    elements.editorAudio?.addEventListener('loadedmetadata', () => {
        const duration = elements.editorAudio.duration;
        if (Number.isFinite(duration)) {
            state.form.duration = duration;
        }
    });
    elements.editorAudio?.addEventListener('emptied', () => {
        state.form.duration = null;
    });

    elements.lyricsAdd?.addEventListener('click', () => {
        addLyricsLine();
    });

    elements.lyricsImportToggle?.addEventListener('click', () => {
        const visible = elements.lyricsImportPanel && !elements.lyricsImportPanel.classList.contains('hidden');
        toggleLyricsImportPanel(!visible);
    });

    elements.lyricsImportConfirm?.addEventListener('click', () => {
        importLyricsFromText(elements.lyricsImportText?.value ?? '');
        toggleLyricsImportPanel(false);
    });

    elements.lyricsImportCancel?.addEventListener('click', () => {
        toggleLyricsImportPanel(false);
    });

    elements.playlistAccent?.addEventListener('input', updatePlaylistPreview);
    elements.playlistNameInput?.addEventListener('input', updatePlaylistPreview);

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

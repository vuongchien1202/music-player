import './bootstrap';
import '../css/app.css';

const samplePlaylists = () => [
    {
        id: generateId('sunset'),
        name: 'Sunset Vibes',
        accent: '#fb7185',
        songs: [
            {
                id: generateId('aurora'),
                title: 'Aurora Bloom',
                artist: 'Eira Lin',
                album: 'Chromatic Dreams',
                cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80',
                audio: 'https://samplelib.com/lib/preview/mp3/sample-6s.mp3',
                duration: 6,
                lyrics: [
                    { time: 0, text: 'Bình minh nhẹ lên trên đôi vai em.' },
                    { time: 1.5, text: 'Những nốt nhạc chạm vào tầng mây hồng.' },
                    { time: 3, text: 'Trái tim rung lên nhịp đập rộn ràng.' },
                    { time: 4.5, text: 'Ta cùng hoà trong ánh sáng mơ màng.' },
                ],
            },
            {
                id: generateId('neon'),
                title: 'Neon Skyline',
                artist: 'Nova & The Waves',
                album: 'Night Pulse',
                cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
                audio: 'https://samplelib.com/lib/preview/mp3/sample-9s.mp3',
                duration: 9,
                lyrics: [
                    { time: 0, text: 'Thành phố sáng rực lên trong đêm dài.' },
                    { time: 2.4, text: 'Dòng người cuốn ta về phía xa xôi.' },
                    { time: 4.5, text: 'Những tia sáng đan vào nhau rực rỡ.' },
                    { time: 6.8, text: 'Trọn vẹn phút giây đắm chìm mê say.' },
                ],
            },
        ],
    },
    {
        id: generateId('focus'),
        name: 'Deep Focus',
        accent: '#f97316',
        songs: [
            {
                id: generateId('drift'),
                title: 'Midnight Drift',
                artist: 'Lumen',
                album: 'Parallel Lines',
                cover: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=400&q=80',
                audio: 'https://samplelib.com/lib/preview/mp3/sample-12s.mp3',
                duration: 12,
                lyrics: [
                    { time: 0, text: 'Giữa đêm vắng em nghe tim dịu êm.' },
                    { time: 3.5, text: 'Lướt trên sóng âm sâu trong ý nghĩ.' },
                    { time: 7.2, text: 'Ngân vang tiếng ca khẽ lay giấc ngủ.' },
                    { time: 10.4, text: 'Thả hồn trôi theo dòng chảy vô hình.' },
                ],
            },
        ],
    },
];

const state = {
    playlists: samplePlaylists(),
    currentPlaylistId: null,
    currentSongId: null,
    isPlaying: false,
    editingSong: null,
    karaokeIndex: -1,
};

const elements = {};

function generateId(prefix = 'id') {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) {
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

function getCurrentPlaylist() {
    return state.playlists.find((playlist) => playlist.id === state.currentPlaylistId) ?? state.playlists[0] ?? null;
}

function getCurrentSong() {
    const playlist = getCurrentPlaylist();
    if (!playlist) {
        return null;
    }
    return playlist.songs.find((song) => song.id === state.currentSongId) ?? playlist.songs[0] ?? null;
}

function setCurrentPlaylist(playlistId, { keepSong = false } = {}) {
    state.currentPlaylistId = playlistId;
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
    const playlist = getCurrentPlaylist();
    if (!playlist) {
        state.currentSongId = null;
        return;
    }
    const songExists = playlist.songs.some((song) => song.id === songId);
    state.currentSongId = songExists ? songId : playlist.songs[0]?.id ?? null;
}

function updatePlaylistSelect() {
    if (!elements.playlistSelect) return;
    elements.playlistSelect.innerHTML = '';
    state.playlists.forEach((playlist) => {
        const option = document.createElement('option');
        option.value = playlist.id;
        option.textContent = playlist.name;
        elements.playlistSelect.appendChild(option);
    });
    if (state.currentPlaylistId) {
        elements.playlistSelect.value = state.currentPlaylistId;
    }
}

function renderPlaylists() {
    if (!elements.playlistList) return;
    elements.playlistList.innerHTML = '';
    state.playlists.forEach((playlist) => {
        const item = document.createElement('li');
        item.className = 'playlist-item';
        item.dataset.id = playlist.id;
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

    if (!playlist || playlist.songs.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-300';
        emptyState.innerHTML = 'Chưa có bài hát. Hãy thêm một bài mới bên dưới!';
        elements.songList.appendChild(emptyState);
        return;
    }

    playlist.songs.forEach((song) => {
        const item = document.createElement('li');
        item.className = 'song-tile';
        item.dataset.id = song.id;
        if (song.id === state.currentSongId) {
            item.classList.add('ring-2', 'ring-rose-400/60', 'bg-white/15');
        }

        const cover = document.createElement('div');
        cover.className = 'h-12 w-12 overflow-hidden rounded-xl shadow-lg shadow-black/40';
        cover.innerHTML = `<img src="${song.cover ?? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80'}" alt="${song.title}" class="h-full w-full object-cover" />`;

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
        elements.playerCover.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80';
        elements.currentTime.textContent = '00:00';
        elements.totalDuration.textContent = '00:00';
        elements.progress.value = 0;
        return;
    }

    if (audio.dataset.songId !== song.id) {
        audio.src = song.audio;
        audio.dataset.songId = song.id;
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
    elements.playerCover.src = song.cover ?? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=200&q=80';
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
    if (!song) return;

    if (audio.dataset.songId !== song.id) {
        audio.src = song.audio;
        audio.dataset.songId = song.id;
    }

    audio.play().then(() => {
        state.isPlaying = true;
        updatePlayButton();
    }).catch(() => {
        state.isPlaying = false;
        updatePlayButton();
    });
}

function pauseCurrent() {
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

function removeSong(playlistId, songId) {
    const playlist = state.playlists.find((item) => item.id === playlistId);
    if (!playlist) return;
    playlist.songs = playlist.songs.filter((song) => song.id !== songId);
    if (playlist.id === state.currentPlaylistId && songId === state.currentSongId) {
        state.currentSongId = playlist.songs[0]?.id ?? null;
    }
    if (state.editingSong && state.editingSong.songId === songId) {
        resetSongForm();
    }
    render();
}

function beginEditSong(song, playlistId) {
    state.editingSong = { songId: song.id, playlistId };
    elements.songForm.title.value = song.title;
    elements.songForm.artist.value = song.artist;
    elements.songForm.album.value = song.album ?? '';
    elements.songForm.cover.value = song.cover ?? '';
    elements.songForm.audio.value = song.audio;
    elements.playlistSelect.value = playlistId;
    elements.songForm.lyrics.value = lyricsToText(song.lyrics ?? []);
    elements.formMode.textContent = 'Chỉnh sửa bài hát';
}

function resetSongForm() {
    elements.songForm.reset();
    elements.formMode.textContent = 'Thêm bài hát';
    state.editingSong = null;
    if (state.currentPlaylistId && elements.playlistSelect) {
        elements.playlistSelect.value = state.currentPlaylistId;
    }
}

function addPlaylist(name) {
    const newPlaylist = {
        id: generateId('playlist'),
        name,
        accent: '#f43f5e',
        songs: [],
    };
    state.playlists.push(newPlaylist);
    setCurrentPlaylist(newPlaylist.id);
    updatePlaylistSelect();
    renderPlaylists();
    renderSongs();
    renderPlayer();
    renderKaraoke();
}

function upsertSong(data) {
    const playlist = state.playlists.find((item) => item.id === data.playlistId);
    if (!playlist) return;

    if (state.editingSong) {
        const currentPlaylist = state.playlists.find((item) => item.id === state.editingSong.playlistId);
        if (currentPlaylist) {
            const targetSong = currentPlaylist.songs.find((song) => song.id === state.editingSong.songId);
            if (targetSong) {
                Object.assign(targetSong, data.song);
                if (currentPlaylist.id !== data.playlistId) {
                    currentPlaylist.songs = currentPlaylist.songs.filter((song) => song.id !== state.editingSong.songId);
                    playlist.songs.push(targetSong);
                    if (state.currentPlaylistId === currentPlaylist.id && state.currentSongId === targetSong.id) {
                        state.currentPlaylistId = playlist.id;
                    }
                }
                if (state.currentSongId === targetSong.id) {
                    renderPlayer();
                    renderKaraoke();
                }
            }
        }
    } else {
        const newSong = { id: generateId('song'), ...data.song };
        playlist.songs.push(newSong);
        state.currentSongId = newSong.id;
        state.currentPlaylistId = playlist.id;
    }

    render();
    resetSongForm();
}

function handleSongFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(elements.songForm);
    const title = formData.get('title').trim();
    const artist = formData.get('artist').trim();
    const album = formData.get('album').trim();
    const cover = formData.get('cover').trim();
    const audio = formData.get('audio').trim();
    const playlistId = formData.get('playlist');
    const lyricsText = formData.get('lyrics');

    if (!title || !artist || !audio) {
        alert('Vui lòng nhập đầy đủ tên bài hát, nghệ sĩ và nguồn nhạc.');
        return;
    }

    upsertSong({
        playlistId,
        song: {
            title,
            artist,
            album,
            cover: cover || undefined,
            audio,
            lyrics: parseLyrics(lyricsText ?? ''),
        },
    });
}

function handlePlaylistFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(elements.playlistForm);
    const name = formData.get('playlist').toString().trim();
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

    state.currentPlaylistId = state.playlists[0]?.id ?? null;
    state.currentSongId = getCurrentSong()?.id ?? null;

    updatePlaylistSelect();
    render();
    updatePlayButton();

    elements.playButton.addEventListener('click', playPause);
    elements.prevButton.addEventListener('click', playPrevious);
    elements.nextButton.addEventListener('click', playNext);

    elements.audio.addEventListener('timeupdate', () => {
        const { currentTime, duration } = elements.audio;
        elements.currentTime.textContent = formatTime(currentTime);
        const total = getCurrentSong()?.duration ?? duration;
        elements.totalDuration.textContent = formatTime(total);
        if (Number.isFinite(duration) && duration > 0) {
            elements.progress.value = (currentTime / duration) * 100;
        }
        updateKaraoke(currentTime);
    });

    elements.audio.addEventListener('ended', () => {
        playNext();
    });

    elements.audio.addEventListener('play', () => {
        state.isPlaying = true;
        updatePlayButton();
    });

    elements.audio.addEventListener('pause', () => {
        state.isPlaying = false;
        updatePlayButton();
    });

    elements.audio.addEventListener('loadedmetadata', () => {
        const duration = elements.audio.duration;
        const song = getCurrentSong();
        if (song) {
            song.duration = duration;
        }
        elements.totalDuration.textContent = formatTime(duration);
    });

    elements.progress.addEventListener('input', (event) => {
        const { duration } = elements.audio;
        if (!Number.isFinite(duration) || duration <= 0) {
            return;
        }
        const value = Number(event.target.value);
        elements.audio.currentTime = (value / 100) * duration;
    });

    elements.songForm.addEventListener('submit', handleSongFormSubmit);
    elements.songForm.addEventListener('reset', () => {
        setTimeout(() => resetSongForm(), 0);
    });
    elements.cancelEdit.addEventListener('click', (event) => {
        event.preventDefault();
        resetSongForm();
    });

    elements.playlistForm.addEventListener('submit', handlePlaylistFormSubmit);
});

<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Melody Motion</title>
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-950 text-zinc-100">
        <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_rgba(0,0,0,0))]">
            <div class="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 lg:px-8">
                <header class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p class="text-sm uppercase tracking-[0.3em] text-rose-400">Atmos Sounds</p>
                        <h1 class="text-4xl font-semibold text-white sm:text-5xl">Melody Motion</h1>
                    </div>
                    <p class="max-w-md text-sm text-zinc-300 sm:text-right">Trải nghiệm trình phát nhạc lấy cảm hứng từ Apple Music với danh sách phát động, quản lý bài hát và chế độ karaoke sống động.</p>
                </header>

                <main class="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
                    <section class="glass-panel order-2 flex flex-col gap-4 rounded-3xl p-6 lg:order-1 lg:col-span-3">
                        <div class="flex items-center justify-between">
                            <h2 class="text-lg font-semibold text-white">Danh sách phát</h2>
                            <span class="text-xs uppercase tracking-widest text-rose-300">Library</span>
                        </div>
                        <ul class="flex flex-1 flex-col gap-2" data-playlist-list></ul>
                        <form data-playlist-form class="mt-2 flex flex-col gap-2 text-sm">
                            <p class="text-xs uppercase tracking-widest text-rose-200">Tạo danh sách mới</p>
                            <input type="text" name="playlist" placeholder="Tên danh sách phát" class="input-field" required>
                            <button type="submit" class="rounded-full bg-rose-500 px-4 py-2 font-medium text-white transition hover:bg-rose-400">Thêm danh sách</button>
                        </form>
                    </section>

                    <section class="glass-panel order-1 flex flex-col rounded-3xl p-6 lg:order-2 lg:col-span-6">
                        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div class="flex items-start gap-4">
                                <div class="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-rose-900/40">
                                    <img data-player-cover src="" alt="Album artwork" class="h-full w-full object-cover" />
                                    <div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-black/20 to-black/40"></div>
                                </div>
                                <div>
                                    <p class="text-xs uppercase tracking-[0.4em] text-rose-400">Now Playing</p>
                                    <h2 class="text-2xl font-semibold text-white" data-player-title>--</h2>
                                    <p class="text-sm text-zinc-300" data-player-artist>--</p>
                                    <p class="text-xs text-zinc-400" data-player-album></p>
                                </div>
                            </div>
                            <div class="flex items-center gap-4">
                                <button type="button" data-prev-button class="control-button" aria-label="Previous track">
                                    <span class="material-symbol">&#9664;</span>
                                </button>
                                <button type="button" data-play-button class="control-button control-button--primary" aria-label="Play or pause">
                                    <span data-play-icon class="material-symbol text-xl">&#9658;</span>
                                </button>
                                <button type="button" data-next-button class="control-button" aria-label="Next track">
                                    <span class="material-symbol">&#9654;</span>
                                </button>
                            </div>
                        </div>

                        <div class="mt-6 flex flex-col gap-2">
                            <div class="flex items-center justify-between text-[0.7rem] uppercase tracking-[0.4em] text-rose-300">
                                <span data-current-time>00:00</span>
                                <span data-total-duration>00:00</span>
                            </div>
                            <input type="range" min="0" max="100" value="0" data-progress class="progress-slider" aria-label="Tiến độ bài hát" />
                        </div>

                        <audio id="player-audio" class="hidden" preload="metadata"></audio>

                        <div class="mt-8 flex flex-1 flex-col gap-4">
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-semibold text-white">Bài hát trong danh sách</h3>
                                <span class="text-xs uppercase tracking-[0.4em] text-rose-300" data-song-count>0 bài</span>
                            </div>
                            <ul class="flex flex-1 flex-col gap-3" data-song-list></ul>
                        </div>
                    </section>

                    <section class="glass-panel order-3 flex flex-col rounded-3xl p-6 lg:col-span-3">
                        <div class="mb-4 flex items-center justify-between">
                            <h2 class="text-lg font-semibold text-white">Chế độ Karaoke</h2>
                            <span class="text-xs uppercase tracking-[0.4em] text-rose-300">Lyrics</span>
                        </div>
                        <div class="flex-1 space-y-2 overflow-y-auto pr-2" data-karaoke-panel>
                            <p class="text-sm text-zinc-300">Chọn bài hát để bắt đầu hiển thị lời.</p>
                        </div>
                    </section>
                </main>

                <section class="glass-panel rounded-3xl p-6">
                    <h2 class="text-lg font-semibold text-white">Quản lý bài hát</h2>
                    <p class="mt-2 text-sm text-zinc-300">Thêm mới, chỉnh sửa hoặc xoá bài hát trong thư viện của bạn. Lời bài hát hỗ trợ định dạng <code class="rounded bg-white/10 px-1">mm:ss|Nội dung</code> cho mỗi dòng.</p>
                    <form data-song-form class="mt-6 grid gap-4 md:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label class="form-label" for="song-title">Tên bài hát</label>
                            <input id="song-title" name="title" type="text" class="input-field" required />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="form-label" for="song-artist">Nghệ sĩ</label>
                            <input id="song-artist" name="artist" type="text" class="input-field" required />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="form-label" for="song-album">Album</label>
                            <input id="song-album" name="album" type="text" class="input-field" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="form-label" for="song-cover">Ảnh bìa (URL)</label>
                            <input id="song-cover" name="cover" type="url" placeholder="https://" class="input-field" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="form-label" for="song-audio">Nguồn nhạc (URL)</label>
                            <input id="song-audio" name="audio" type="url" placeholder="https://" class="input-field" required />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label class="form-label" for="song-playlist">Danh sách phát</label>
                            <select id="song-playlist" name="playlist" class="input-field" data-playlist-select></select>
                        </div>
                        <div class="md:col-span-2 flex flex-col gap-2">
                            <label class="form-label" for="song-lyrics">Lời bài hát karaoke</label>
                            <textarea id="song-lyrics" name="lyrics" rows="6" class="input-field" placeholder="00:03|Câu hát đầu tiên"></textarea>
                        </div>
                        <div class="md:col-span-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div class="text-xs uppercase tracking-[0.4em] text-rose-300" data-form-mode>Thêm bài hát</div>
                            <div class="flex gap-3">
                                <button type="reset" class="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:text-white" data-cancel-edit>Huỷ</button>
                                <button type="submit" class="rounded-full bg-rose-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-rose-400">Lưu bài hát</button>
                            </div>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    </body>
</html>

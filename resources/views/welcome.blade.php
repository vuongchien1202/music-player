@extends('layouts.app')

@section('page', 'home')

@section('content')
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section class="glass-panel order-2 flex flex-col gap-4 rounded-3xl p-6 lg:order-1 lg:col-span-3">
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-white">Danh sách phát</h2>
                <a href="{{ route('playlists.create') }}" class="text-xs uppercase tracking-widest text-rose-300 hover:text-rose-200">Quản lý</a>
            </div>
            <ul class="flex flex-1 flex-col gap-2" data-playlist-list></ul>
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

            <audio id="player-audio" class="hidden" preload="metadata" crossorigin="anonymous"></audio>

            <div class="mt-6 grid gap-4 lg:grid-cols-2">
                <div class="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <p class="text-[0.65rem] uppercase tracking-[0.3em] text-rose-300">Chế độ phát</p>
                            <p class="text-sm text-zinc-200" data-playback-mode-label>Phát tuần tự</p>
                        </div>
                        <button type="button" class="mode-toggle" data-playback-mode>
                            <span class="material-symbol text-base" data-playback-mode-icon>▶️</span>
                            <span class="text-[0.65rem] uppercase tracking-[0.3em]">Đổi chế độ</span>
                        </button>
                    </div>
                    <div class="space-y-4">
                        <div class="flex flex-col gap-2">
                            <span class="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-400">Tốc độ</span>
                            <div class="flex items-center gap-3">
                                <input type="range" min="0.5" max="1.5" step="0.05" value="1" class="progress-slider flex-1" data-speed-control aria-label="Điều chỉnh tốc độ phát" />
                                <span class="value-badge" data-speed-value>1.00x</span>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <span class="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-400">Pitch</span>
                            <div class="flex items-center gap-3">
                                <input type="range" min="-6" max="6" step="1" value="0" class="progress-slider flex-1" data-pitch-control aria-label="Điều chỉnh cao độ" />
                                <span class="value-badge" data-pitch-value>0 st</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <p class="text-[0.65rem] uppercase tracking-[0.3em] text-rose-300">Equalizer</p>
                            <p class="text-sm text-zinc-200">Tuỳ chỉnh âm sắc</p>
                            <p class="mt-1 text-xs text-rose-300 hidden" data-eq-status role="status" aria-live="polite"></p>
                        </div>
                        <select data-eq-preset class="select-field">
                            <option value="flat">Mặc định</option>
                            <option value="pop">Pop</option>
                            <option value="rock">Rock</option>
                            <option value="jazz">Jazz</option>
                            <option value="custom">Tuỳ chỉnh</option>
                        </select>
                    </div>
                    <div class="space-y-4">
                        <div class="flex flex-col gap-2">
                            <span class="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-400">Bass</span>
                            <div class="flex items-center gap-3">
                                <input type="range" min="-12" max="12" step="1" value="0" class="progress-slider flex-1" data-eq-bass aria-label="Điều chỉnh bass" />
                                <span class="value-badge" data-eq-bass-value>0 dB</span>
                            </div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <span class="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-400">Treble</span>
                            <div class="flex items-center gap-3">
                                <input type="range" min="-12" max="12" step="1" value="0" class="progress-slider flex-1" data-eq-treble aria-label="Điều chỉnh treble" />
                                <span class="value-badge" data-eq-treble-value>0 dB</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-8 flex flex-1 flex-col gap-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-white">Bài hát trong danh sách</h3>
                    <a href="{{ route('songs.manage') }}" class="text-xs uppercase tracking-[0.4em] text-rose-300 hover:text-rose-200">Quản lý</a>
                </div>
                <span class="text-xs uppercase tracking-[0.4em] text-rose-300" data-song-count>0 bài</span>
                <ul class="flex flex-1 flex-col gap-3" data-song-list data-song-mode="view"></ul>
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
    </div>
@endsection

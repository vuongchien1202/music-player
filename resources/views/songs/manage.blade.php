@extends('layouts.app')

@section('page', 'songs')

@section('content')
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section class="glass-panel flex flex-col gap-6 rounded-3xl p-6 lg:col-span-5">
            <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-white">Thư viện bài hát</h2>
                    <span class="text-xs uppercase tracking-[0.4em] text-rose-300" data-song-count>0 bài</span>
                </div>
                <p class="text-sm text-zinc-300">Chọn danh sách phát để xem các bài hát và bắt đầu chỉnh sửa.</p>
                <select class="input-field" data-playlist-select aria-label="Chọn danh sách phát"></select>
            </div>
            <ul class="flex flex-1 flex-col gap-3" data-song-list data-song-mode="manage"></ul>
        </section>

        <section class="glass-panel flex flex-col gap-6 rounded-3xl p-6 lg:col-span-7">
            <div class="flex flex-col gap-2">
                <h2 class="text-lg font-semibold text-white">Quản lý bài hát</h2>
                <p class="text-sm text-zinc-300">Tải lên hoặc dán đường dẫn để cập nhật bài hát, đồng bộ lời karaoke chính xác theo thời gian thực.</p>
                <span class="text-xs uppercase tracking-[0.4em] text-rose-300" data-form-mode>Thêm bài hát</span>
            </div>
            <form data-song-form class="grid gap-4 md:grid-cols-2">
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
                    <label class="form-label">Ảnh bìa</label>
                    <div class="flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-zinc-300">
                        <label class="source-pill">
                            <input type="radio" name="cover_source" value="url" class="peer" checked data-cover-source />
                            <span>Đường dẫn</span>
                        </label>
                        <label class="source-pill">
                            <input type="radio" name="cover_source" value="upload" class="peer" data-cover-source />
                            <span>Tải file</span>
                        </label>
                    </div>
                    <input type="url" name="cover_url" placeholder="https://" class="input-field" data-cover-url />
                    <input type="file" name="cover_file" accept="image/*" class="input-field hidden" data-cover-file />
                    <div class="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-sm text-zinc-200">
                        <div class="h-16 w-16 overflow-hidden rounded-xl border border-white/10">
                            <img src="" alt="Ảnh bìa" class="h-full w-full object-cover" data-cover-preview />
                        </div>
                        <span class="text-xs text-zinc-300">Ảnh xem trước sẽ hiển thị khi chọn tệp hoặc nhập URL.</span>
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="form-label">Nguồn nhạc</label>
                    <div class="flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-zinc-300">
                        <label class="source-pill">
                            <input type="radio" name="audio_source" value="url" class="peer" checked data-audio-source />
                            <span>Đường dẫn</span>
                        </label>
                        <label class="source-pill">
                            <input type="radio" name="audio_source" value="upload" class="peer" data-audio-source />
                            <span>Tải file</span>
                        </label>
                    </div>
                    <input type="url" name="audio_url" placeholder="https://" class="input-field" data-audio-url />
                    <input type="file" name="audio_file" accept="audio/*" class="input-field hidden" data-audio-file />
                    <div class="rounded-2xl bg-white/5 p-4">
                        <audio controls preload="metadata" class="w-full" data-editor-audio></audio>
                        <p class="mt-2 text-xs text-zinc-400">Sử dụng trình phát để nghe thử và căn chỉnh lời karaoke.</p>
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="form-label" for="song-playlist">Danh sách phát</label>
                    <select id="song-playlist" name="playlist" class="input-field" data-playlist-target></select>
                </div>
                <div class="flex items-center gap-3 md:col-span-2">
                    <button type="reset" class="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:text-white" data-cancel-edit>Huỷ</button>
                    <button type="submit" class="rounded-full bg-rose-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-rose-400">Lưu bài hát</button>
                </div>
                <div class="md:col-span-2 flex flex-col gap-3">
                    <label class="form-label">Lời bài hát karaoke</label>
                    <div class="rounded-3xl bg-white/5 p-4" data-lyrics-editor>
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <p class="text-xs text-zinc-300">Nghe bài hát và nhấn “Gán thời gian” để đồng bộ từng câu hát.</p>
                            <div class="flex gap-2">
                                <button type="button" class="editor-button" data-lyrics-add>Thêm dòng</button>
                                <button type="button" class="editor-button" data-lyrics-import-toggle>Nhập nhanh</button>
                            </div>
                        </div>
                        <div class="hidden flex-col gap-2 pt-3" data-lyrics-import-panel>
                            <textarea class="input-field min-h-[120px]" placeholder="00:05|Câu hát đầu" data-lyrics-import-text></textarea>
                            <div class="flex gap-2">
                                <button type="button" class="editor-button" data-lyrics-import-confirm>Áp dụng</button>
                                <button type="button" class="editor-button" data-lyrics-import-cancel>Đóng</button>
                            </div>
                        </div>
                        <ul class="mt-4 flex flex-col gap-3" data-lyrics-list></ul>
                        <p class="text-xs text-zinc-400" data-lyrics-empty>Chưa có lời nào, hãy thêm dòng mới để bắt đầu.</p>
                    </div>
                </div>
            </form>
        </section>
    </div>
@endsection

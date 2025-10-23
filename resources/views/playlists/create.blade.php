@extends('layouts.app')

@section('page', 'playlists')

@section('content')
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section class="glass-panel flex flex-col gap-4 rounded-3xl p-6 lg:col-span-5">
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-white">Danh sách phát hiện có</h2>
                <span class="text-xs uppercase tracking-[0.4em] text-rose-300">Thư viện</span>
            </div>
            <p class="text-sm text-zinc-300">Chọn một danh sách để xem nhanh các bài hát trong trình phát tại trang chủ.</p>
            <ul class="flex flex-1 flex-col gap-2" data-playlist-list></ul>
        </section>

        <section class="glass-panel flex flex-col gap-6 rounded-3xl p-6 lg:col-span-7">
            <div>
                <h2 class="text-lg font-semibold text-white">Tạo danh sách mới</h2>
                <p class="mt-2 text-sm text-zinc-300">Đặt tên và màu sắc nhấn để phân biệt danh sách phát trong thư viện của bạn.</p>
            </div>
            <form data-playlist-form class="grid gap-4 md:grid-cols-2">
                <div class="flex flex-col gap-2 md:col-span-2">
                    <label class="form-label" for="playlist-name">Tên danh sách phát</label>
                    <input id="playlist-name" type="text" name="playlist" class="input-field" placeholder="Chill Evening" required />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="form-label" for="playlist-accent">Màu nhấn</label>
                    <input id="playlist-accent" type="color" name="accent" value="#fb7185" class="input-field h-12 cursor-pointer" data-playlist-accent />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="form-label" for="playlist-preview">Xem trước</label>
                    <div id="playlist-preview" class="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-sm text-zinc-200">
                        <span class="h-3 w-3 rounded-full" data-playlist-accent-preview style="background: #fb7185"></span>
                        <span data-playlist-preview-text>Chill Evening</span>
                    </div>
                </div>
                <div class="flex items-center gap-3 md:col-span-2">
                    <button type="submit" class="rounded-full bg-rose-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-rose-400">Tạo danh sách</button>
                    <p class="text-xs text-zinc-400">Danh sách mới sẽ xuất hiện ngay lập tức ở trình phát.</p>
                </div>
            </form>
        </section>
    </div>
@endsection

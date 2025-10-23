<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ $title ?? 'Melody Motion' }}</title>
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-950 text-zinc-100" data-page="@yield('page', 'home')">
        <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_rgba(0,0,0,0))]">
            <div class="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 lg:px-8">
                <nav class="glass-panel flex flex-col gap-6 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p class="text-sm uppercase tracking-[0.3em] text-rose-400">Atmos Sounds</p>
                        <h1 class="text-3xl font-semibold text-white sm:text-4xl">Melody Motion</h1>
                        <p class="mt-1 max-w-xl text-sm text-zinc-300">Trình phát nhạc phong cách Apple Music với danh sách phát năng động, quản lý bài hát chuyên sâu và chế độ karaoke sống động.</p>
                    </div>
                    <div class="flex flex-wrap gap-3 text-sm font-medium uppercase tracking-[0.2em] text-zinc-200">
                        @php($currentRoute = request()->route() ? request()->route()->getName() : null)
                        <a href="{{ route('home') }}" class="nav-pill {{ $currentRoute === 'home' ? 'nav-pill--active' : '' }}">Trang chủ</a>
                        <a href="{{ route('playlists.create') }}" class="nav-pill {{ $currentRoute === 'playlists.create' ? 'nav-pill--active' : '' }}">Tạo danh sách</a>
                        <a href="{{ route('songs.manage') }}" class="nav-pill {{ $currentRoute === 'songs.manage' ? 'nav-pill--active' : '' }}">Quản lý bài hát</a>
                    </div>
                </nav>

                <main class="flex-1">
                    @yield('content')
                </main>
            </div>
        </div>
    </body>
</html>

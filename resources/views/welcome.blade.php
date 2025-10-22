<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ config('app.name', 'Laravel') }}</title>
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="antialiased">
        <div class="relative flex min-h-screen flex-col items-center justify-center bg-gray-100 py-4 sm:pt-0">
            <div class="mb-4 text-5xl font-semibold text-gray-800">
                {{ config('app.name', 'Laravel') }}
            </div>
            <div class="text-gray-600">
                <p class="mb-2 text-center">Laravel application is ready.</p>
                <p class="text-center">Explore the documentation to get started building your app.</p>
            </div>
            <div class="mt-6 flex gap-4 text-sm text-gray-600">
                <a href="https://laravel.com/docs" class="underline hover:text-gray-900">Documentation</a>
                <a href="https://laracasts.com" class="underline hover:text-gray-900">Laracasts</a>
                <a href="https://laravel-news.com" class="underline hover:text-gray-900">News</a>
            </div>
        </div>
    </body>
</html>

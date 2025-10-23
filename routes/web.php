<?php

use App\Http\Controllers\AudioProxyController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome')->name('home');

Route::view('/playlists/create', 'playlists.create')->name('playlists.create');

Route::view('/songs', 'songs.manage')->name('songs.manage');

Route::get('/audio/proxy', AudioProxyController::class)->name('audio.proxy');

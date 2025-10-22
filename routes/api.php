<?php

use App\Http\Controllers\Api\LibraryController;
use App\Http\Controllers\Api\PlaylistController;
use App\Http\Controllers\Api\SongController;
use Illuminate\Support\Facades\Route;

Route::get('/library', [LibraryController::class, 'index']);

Route::post('/playlists', [PlaylistController::class, 'store']);
Route::put('/playlists/{playlist}', [PlaylistController::class, 'update']);
Route::delete('/playlists/{playlist}', [PlaylistController::class, 'destroy']);

Route::post('/songs', [SongController::class, 'store']);
Route::put('/songs/{song}', [SongController::class, 'update']);
Route::delete('/songs/{song}', [SongController::class, 'destroy']);

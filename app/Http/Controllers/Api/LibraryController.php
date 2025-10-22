<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlaylistResource;
use App\Models\Playlist;
use Illuminate\Http\Resources\Json\JsonResource;

class LibraryController extends Controller
{
    public function index(): JsonResource
    {
        $playlists = Playlist::with(['songs' => function ($query) {
            $query->orderBy('id');
        }])->orderBy('id')->get();

        return PlaylistResource::collection($playlists);
    }
}

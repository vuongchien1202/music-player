<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlaylistResource;
use App\Models\Playlist;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Arr;

class PlaylistController extends Controller
{
    protected array $defaultAccents = [
        '#fb7185',
        '#f97316',
        '#c084fc',
        '#38bdf8',
        '#facc15',
    ];

    public function store(Request $request): JsonResource
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'accent' => ['nullable', 'string', 'max:20'],
        ]);

        $playlist = Playlist::create([
            'name' => $validated['name'],
            'accent' => $validated['accent'] ?? Arr::random($this->defaultAccents),
        ]);

        return new PlaylistResource($playlist->load('songs'));
    }

    public function update(Request $request, Playlist $playlist): JsonResource
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'accent' => ['nullable', 'string', 'max:20'],
        ]);

        $playlist->fill($validated);

        if (!array_key_exists('accent', $validated) && !$playlist->accent) {
            $playlist->accent = Arr::random($this->defaultAccents);
        }

        $playlist->save();

        return new PlaylistResource($playlist->load('songs'));
    }

    public function destroy(Playlist $playlist): JsonResource
    {
        $playlist->delete();

        return new PlaylistResource($playlist);
    }
}

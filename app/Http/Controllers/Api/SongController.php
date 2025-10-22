<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SongResource;
use App\Models\Playlist;
use App\Models\Song;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SongController extends Controller
{
    public function store(Request $request): JsonResource
    {
        $validated = $this->validateSong($request);

        $song = Song::create($validated);

        return new SongResource($song);
    }

    public function update(Request $request, Song $song): JsonResource
    {
        $validated = $this->validateSong($request, $song->id);

        $song->fill($validated);
        $song->save();

        return new SongResource($song);
    }

    public function destroy(Song $song)
    {
        $song->delete();

        return response()->noContent();
    }

    protected function validateSong(Request $request, ?int $songId = null): array
    {
        $validated = $request->validate([
            'playlist_id' => ['required', 'integer', 'exists:playlists,id'],
            'title' => ['required', 'string', 'max:255'],
            'artist' => ['required', 'string', 'max:255'],
            'album' => ['nullable', 'string', 'max:255'],
            'cover' => ['nullable', 'string', 'max:2048'],
            'audio' => ['required', 'string', 'max:2048'],
            'duration' => ['nullable', 'numeric', 'min:0'],
            'lyrics' => ['nullable', 'array'],
            'lyrics.*.time' => ['required_with:lyrics', 'numeric', 'min:0'],
            'lyrics.*.text' => ['required_with:lyrics', 'string'],
        ]);

        $lyrics = collect($validated['lyrics'] ?? [])
            ->map(function ($line) {
                return [
                    'time' => max(0, (float) ($line['time'] ?? 0)),
                    'text' => (string) ($line['text'] ?? ''),
                ];
            })
            ->filter(fn ($line) => $line['text'] !== '')
            ->sortBy('time')
            ->values()
            ->all();

        $playlist = Playlist::findOrFail($validated['playlist_id']);

        return [
            'playlist_id' => $playlist->id,
            'title' => $validated['title'],
            'artist' => $validated['artist'],
            'album' => $validated['album'] ?? null,
            'cover_url' => $validated['cover'] ?? null,
            'audio_url' => $validated['audio'],
            'duration' => $validated['duration'] ?? null,
            'lyrics' => $lyrics ?: null,
        ];
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SongResource;
use App\Models\Playlist;
use App\Models\Song;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

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
        $this->prepareSongInputs($request);

        $validated = $request->validate([
            'playlist_id' => ['required', 'integer', 'exists:playlists,id'],
            'title' => ['required', 'string', 'max:255'],
            'artist' => ['required', 'string', 'max:255'],
            'album' => ['nullable', 'string', 'max:255'],
            'cover' => ['nullable', 'string', 'max:2048'],
            'cover_file' => ['nullable', 'image', 'max:5120'],
            'audio' => ['nullable', 'string', 'max:2048', 'required_without:audio_file'],
            'audio_file' => ['nullable', 'file', 'max:51200', 'mimetypes:audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/flac,audio/aac,audio/mp4,audio/x-m4a', 'required_without:audio'],
            'duration' => ['nullable', 'numeric', 'min:0'],
            'lyrics' => ['nullable', 'array'],
            'lyrics.*.time' => ['required_with:lyrics', 'numeric', 'min:0'],
            'lyrics.*.text' => ['required_with:lyrics', 'string'],
        ], [
            'audio.required_without' => 'Vui lòng cung cấp đường dẫn nhạc hoặc tải tệp lên.',
            'audio_file.required_without' => 'Vui lòng cung cấp đường dẫn nhạc hoặc tải tệp lên.',
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

        $coverUrl = $validated['cover'] ?? null;
        $audioUrl = $validated['audio'] ?? null;

        if ($request->hasFile('cover_file')) {
            $coverPath = $request->file('cover_file')->store('covers', 'public');
            $coverUrl = Storage::disk('public')->url($coverPath);
        }

        if ($request->hasFile('audio_file')) {
            $audioPath = $request->file('audio_file')->store('songs', 'public');
            $audioUrl = Storage::disk('public')->url($audioPath);
        }

        return [
            'playlist_id' => $playlist->id,
            'title' => $validated['title'],
            'artist' => $validated['artist'],
            'album' => $validated['album'] ?? null,
            'cover_url' => $coverUrl,
            'audio_url' => $audioUrl,
            'duration' => $validated['duration'] ?? null,
            'lyrics' => $lyrics ?: null,
        ];
    }

    protected function prepareSongInputs(Request $request): void
    {
        $coverUrl = $request->input('cover_url');
        if (!$request->filled('cover') && is_string($coverUrl) && trim($coverUrl) !== '') {
            $request->merge([
                'cover' => trim($coverUrl),
            ]);
        }

        $audioUrl = $request->input('audio_url');
        if (!$request->filled('audio') && is_string($audioUrl) && trim($audioUrl) !== '') {
            $request->merge([
                'audio' => trim($audioUrl),
            ]);
        }
    }
}

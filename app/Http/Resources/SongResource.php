<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Song */
class SongResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $lyrics = collect($this->lyrics ?? [])
            ->map(function ($line) {
                return [
                    'time' => isset($line['time']) ? (float) $line['time'] : 0.0,
                    'text' => (string) ($line['text'] ?? ''),
                ];
            })
            ->filter(fn ($line) => $line['text'] !== '')
            ->sortBy('time')
            ->values()
            ->all();

        return [
            'id' => $this->id,
            'playlist_id' => $this->playlist_id,
            'title' => $this->title,
            'artist' => $this->artist,
            'album' => $this->album,
            'cover' => $this->cover_url,
            'audio' => $this->audio_url,
            'duration' => $this->duration,
            'lyrics' => $lyrics,
        ];
    }
}

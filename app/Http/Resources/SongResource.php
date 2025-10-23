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

        $audioOriginal = $this->audio_url;

        return [
            'id' => $this->id,
            'playlist_id' => $this->playlist_id,
            'title' => $this->title,
            'artist' => $this->artist,
            'album' => $this->album,
            'cover' => $this->cover_url,
            'audio' => $this->makePlayableAudioUrl($audioOriginal, $request),
            'audio_original' => $audioOriginal,
            'duration' => $this->duration,
            'lyrics' => $lyrics,
        ];
    }

    protected function makePlayableAudioUrl(?string $audioUrl, Request $request): ?string
    {
        if (!$audioUrl) {
            return null;
        }

        if (!$this->shouldProxyAudio($audioUrl, $request)) {
            return $audioUrl;
        }

        return route('audio.proxy', ['url' => $audioUrl], false);
    }

    protected function shouldProxyAudio(string $audioUrl, Request $request): bool
    {
        if (!filter_var($audioUrl, FILTER_VALIDATE_URL)) {
            return false;
        }

        $target = parse_url($audioUrl);
        if (!$target || empty($target['host'])) {
            return false;
        }

        $targetHost = strtolower($target['host']);
        $targetScheme = strtolower($target['scheme'] ?? '');

        $requestHost = strtolower($request->getHost());
        $requestScheme = strtolower($request->getScheme());

        if ($targetHost === $requestHost && ($targetScheme === '' || $targetScheme === $requestScheme)) {
            return false;
        }

        $appUrl = config('app.url');
        if ($appUrl) {
            $appHost = strtolower((string) parse_url($appUrl, PHP_URL_HOST));
            $appScheme = strtolower((string) parse_url($appUrl, PHP_URL_SCHEME));
            if ($targetHost === $appHost && ($targetScheme === '' || $targetScheme === $appScheme)) {
                return false;
            }
        }

        return true;
    }
}

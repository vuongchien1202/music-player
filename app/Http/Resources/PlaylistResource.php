<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Playlist */
class PlaylistResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'accent' => $this->accent,
            'songs' => $this->when(
                $this->relationLoaded('songs'),
                fn () => SongResource::collection($this->songs)->resolve(),
                []
            ),
        ];
    }
}

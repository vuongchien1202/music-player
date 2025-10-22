<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Song extends Model
{
    use HasFactory;

    protected $fillable = [
        'playlist_id',
        'title',
        'artist',
        'album',
        'cover_url',
        'audio_url',
        'duration',
        'lyrics',
    ];

    protected $casts = [
        'playlist_id' => 'integer',
        'title' => 'string',
        'artist' => 'string',
        'album' => 'string',
        'cover_url' => 'string',
        'audio_url' => 'string',
        'duration' => 'float',
        'lyrics' => 'array',
    ];

    public function playlist(): BelongsTo
    {
        return $this->belongsTo(Playlist::class);
    }
}

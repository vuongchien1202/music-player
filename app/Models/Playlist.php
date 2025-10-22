<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Playlist extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'accent',
    ];

    protected $casts = [
        'name' => 'string',
        'accent' => 'string',
    ];

    public function songs(): HasMany
    {
        return $this->hasMany(Song::class);
    }
}

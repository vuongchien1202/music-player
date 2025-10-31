<?php

namespace Tests\Feature\Api;

use App\Models\Playlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SongCreationTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_accepts_audio_url_alias_when_creating_a_song(): void
    {
        $playlist = Playlist::create([
            'name' => 'Favorites',
            'accent' => '#ff0000',
        ]);

        $response = $this->postJson('/api/songs', [
            'playlist_id' => $playlist->id,
            'title' => 'Test Song',
            'artist' => 'Test Artist',
            'audio_url' => 'https://example.com/song.mp3',
        ]);

        $response->assertStatus(200);

        $response->assertJsonPath('data.audio', 'https://example.com/song.mp3');

        $this->assertDatabaseHas('songs', [
            'playlist_id' => $playlist->id,
            'title' => 'Test Song',
            'artist' => 'Test Artist',
            'audio_url' => 'https://example.com/song.mp3',
        ]);
    }
}

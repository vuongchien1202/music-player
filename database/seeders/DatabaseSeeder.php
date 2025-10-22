<?php

namespace Database\Seeders;

use App\Models\Playlist;
use App\Models\Song;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $library = [
            [
                'name' => 'Sunset Vibes',
                'accent' => '#fb7185',
                'songs' => [
                    [
                        'title' => 'Aurora Bloom',
                        'artist' => 'Eira Lin',
                        'album' => 'Chromatic Dreams',
                        'cover_url' => 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80',
                        'audio_url' => 'https://samplelib.com/lib/preview/mp3/sample-6s.mp3',
                        'duration' => 6,
                        'lyrics' => [
                            ['time' => 0, 'text' => 'Bình minh nhẹ lên trên đôi vai em.'],
                            ['time' => 1.5, 'text' => 'Những nốt nhạc chạm vào tầng mây hồng.'],
                            ['time' => 3, 'text' => 'Trái tim rung lên nhịp đập rộn ràng.'],
                            ['time' => 4.5, 'text' => 'Ta cùng hoà trong ánh sáng mơ màng.'],
                        ],
                    ],
                    [
                        'title' => 'Neon Skyline',
                        'artist' => 'Nova & The Waves',
                        'album' => 'Night Pulse',
                        'cover_url' => 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
                        'audio_url' => 'https://samplelib.com/lib/preview/mp3/sample-9s.mp3',
                        'duration' => 9,
                        'lyrics' => [
                            ['time' => 0, 'text' => 'Thành phố sáng rực lên trong đêm dài.'],
                            ['time' => 2.4, 'text' => 'Dòng người cuốn ta về phía xa xôi.'],
                            ['time' => 4.5, 'text' => 'Những tia sáng đan vào nhau rực rỡ.'],
                            ['time' => 6.8, 'text' => 'Trọn vẹn phút giây đắm chìm mê say.'],
                        ],
                    ],
                ],
            ],
            [
                'name' => 'Deep Focus',
                'accent' => '#f97316',
                'songs' => [
                    [
                        'title' => 'Midnight Drift',
                        'artist' => 'Lumen',
                        'album' => 'Parallel Lines',
                        'cover_url' => 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=400&q=80',
                        'audio_url' => 'https://samplelib.com/lib/preview/mp3/sample-12s.mp3',
                        'duration' => 12,
                        'lyrics' => [
                            ['time' => 0, 'text' => 'Giữa đêm vắng em nghe tim dịu êm.'],
                            ['time' => 3.5, 'text' => 'Lướt trên sóng âm sâu trong ý nghĩ.'],
                            ['time' => 7.2, 'text' => 'Ngân vang tiếng ca khẽ lay giấc ngủ.'],
                            ['time' => 10.4, 'text' => 'Thả hồn trôi theo dòng chảy vô hình.'],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($library as $entry) {
            $songs = $entry['songs'] ?? [];
            unset($entry['songs']);

            $playlist = Playlist::create($entry);

            foreach ($songs as $songData) {
                $lyrics = collect($songData['lyrics'] ?? [])
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

                Song::create([
                    'playlist_id' => $playlist->id,
                    'title' => $songData['title'],
                    'artist' => $songData['artist'],
                    'album' => $songData['album'] ?? null,
                    'cover_url' => $songData['cover_url'] ?? null,
                    'audio_url' => $songData['audio_url'],
                    'duration' => $songData['duration'] ?? null,
                    'lyrics' => $lyrics ?: null,
                ]);
            }
        }
    }
}

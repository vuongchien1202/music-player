<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AudioProxyController extends Controller
{
    public function __invoke(Request $request)
    {
        $url = $request->query('url');

        if (!is_string($url) || trim($url) === '') {
            abort(404);
        }

        $url = trim($url);

        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            abort(404);
        }

        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        if (!in_array($scheme, ['http', 'https'], true)) {
            abort(404);
        }

        $host = (string) parse_url($url, PHP_URL_HOST);
        if ($host === '') {
            abort(404);
        }

        if (!$this->hostIsAllowed($host)) {
            abort(404);
        }

        $headers = [
            'User-Agent' => 'MelodyMotion/1.0',
            'Accept' => 'audio/*',
        ];

        foreach (['Range', 'If-Range'] as $forwardedHeader) {
            if ($request->headers->has($forwardedHeader)) {
                $headers[$forwardedHeader] = $request->header($forwardedHeader);
            }
        }

        try {
            $response = Http::withHeaders($headers)
                ->timeout(config('media.proxy_timeout', 15))
                ->withOptions(['stream' => true])
                ->get($url);
        } catch (\Throwable $exception) {
            Log::warning('Audio proxy request failed', [
                'url' => $url,
                'message' => $exception->getMessage(),
            ]);

            abort(502, 'Không thể tải nguồn âm thanh.');
        }

        if ($response->failed()) {
            abort($response->status(), 'Không thể tải nguồn âm thanh.');
        }

        $proxiedHeaders = $this->filterHeaders([
            'Content-Type' => $response->header('Content-Type', 'audio/mpeg'),
            'Content-Length' => $response->header('Content-Length'),
            'Content-Range' => $response->header('Content-Range'),
            'Accept-Ranges' => $response->header('Accept-Ranges', 'bytes'),
            'Cache-Control' => $response->header('Cache-Control', 'public, max-age=3600'),
        ]);

        return response()->stream(function () use ($response) {
            foreach ($response->stream() as $chunk) {
                echo $chunk;
            }
        }, $response->status(), $proxiedHeaders);
    }

    protected function hostIsAllowed(string $host): bool
    {
        $host = strtolower($host);
        $allowedHosts = collect(config('media.proxy_allowed_hosts', []))
            ->map(fn ($value) => is_string($value) ? strtolower($value) : '')
            ->filter();

        foreach ($allowedHosts as $allowed) {
            if ($allowed === $host) {
                return true;
            }

            if (Str::startsWith($allowed, '*.')) {
                $suffix = substr($allowed, 1);
                if ($suffix !== '' && Str::endsWith($host, $suffix)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $headers
     * @return array<string, string>
     */
    protected function filterHeaders(array $headers): array
    {
        return collect($headers)
            ->filter(fn ($value) => is_string($value) && $value !== '')
            ->all();
    }
}

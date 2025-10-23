<?php

return [
    'proxy_allowed_hosts' => [
        'samplelib.com',
        '*.samplelib.com',
    ],

    'proxy_timeout' => env('MEDIA_PROXY_TIMEOUT', 15),
];

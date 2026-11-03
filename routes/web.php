<?php

use Illuminate\Support\Facades\Route;

Route::statamic('sitemap.xml', 'sitemap', [
    'layout' => null,
    'content_type' => 'application/xml',
]);

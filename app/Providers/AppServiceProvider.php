<?php

namespace App\Providers;

use App\Console\Commands\GenerateProjectImagePresets;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Statamic\Facades\Term;
use Statamic\Statamic;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([
                GenerateProjectImagePresets::class,
            ]);
        }

        // Old category URLs → collection-scoped /portfolio/categories/{term}.
        Statamic::booted(function () {
            Term::query()
                ->where('taxonomy', 'categories')
                ->get()
                ->each(function ($term) {
                    $to = '/portfolio/categories/'.$term->slug();
                    Route::permanentRedirect('portfolio/'.$term->slug(), $to);
                    Route::permanentRedirect('categories/'.$term->slug(), $to);
                });
        });

        Statamic::vite('anderson-hallas', [
            'resources/css/cp/bard-preview.css',
        ]);
    }
}

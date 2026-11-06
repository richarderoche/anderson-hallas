<?php

namespace App\Providers;

use App\Console\Commands\GenerateProjectImagePresets;
use Aws\CommandInterface;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\ServiceProvider;
use Psr\Http\Message\RequestInterface;
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

        // us-ord-10 is an E3 endpoint and rejects object ACLs (x-amz-acl).
        // The SDK copies ACL onto the request in the builder step, which runs
        // before this, so the header has to be removed from the request.
        Storage::disk('s3')->getClient()->getHandlerList()->appendBuild(
            function (callable $handler) {
                return function (CommandInterface $command, ?RequestInterface $request = null) use ($handler) {
                    unset($command['ACL']);

                    if ($request !== null) {
                        $request = $request->withoutHeader('x-amz-acl');
                    }

                    return $handler($command, $request);
                };
            },
            'linode-omit-acl'
        );
    }
}

<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Statamic\Console\RunsInPlease;
use Statamic\Contracts\Entries\Entry;
use Statamic\Facades\Asset;
use Statamic\Facades\Entry as Entries;
use Statamic\Imaging\PresetGenerator;
use Statamic\Jobs\GeneratePresetImageManipulation;

class GenerateProjectImagePresets extends Command
{
    use RunsInPlease;

    protected $signature = 'statamic:project-images:generate-presets
        {--queue : Queue the image generation instead of running it now}
        {--dry-run : Show what would be generated without writing images}';

    protected $description = 'Generate Glide presets for images used by portfolio and project entries';

    private const CONTAINER = 'assets';

    /** @var array<string, array<string, true>> */
    private array $presetsByPath = [];

    /** @var list<string> */
    private array $warnings = [];

    /** @var array<string, list<string>> */
    private array $partialPresets = [];

    public function handle(): int
    {
        if ($this->option('queue') && config('queue.default') === 'sync') {
            $this->warn('The queue connection is set to "sync". Generation will run immediately.');
        }

        $projects = Entries::query()
            ->where('collection', 'projects')
            ->get()
            ->keyBy(fn (Entry $entry) => $entry->id());

        $portfolio = Entries::query()
            ->where('collection', 'pages')
            ->where('slug', 'portfolio')
            ->first();

        if (! $portfolio) {
            $this->error('Portfolio page entry was not found.');

            return self::FAILURE;
        }

        $this->collectPortfolio($portfolio, $projects);
        $this->collectProjects($projects);

        $missingPresets = $this->undefinedPresets();
        if ($missingPresets !== []) {
            $this->error('These presets are used by the image partials but are not defined: '.implode(', ', $missingPresets));

            return self::FAILURE;
        }

        $jobs = $this->jobs();

        foreach ($this->warnings as $warning) {
            $this->warn($warning);
        }

        if ($jobs === []) {
            $this->info('No project images to generate.');

            return self::SUCCESS;
        }

        $imageCount = count(array_unique(array_map(fn (array $job) => $job['asset']->id(), $jobs)));
        $this->info(sprintf(
            '%s %d preset%s across %d image%s.',
            $this->option('dry-run') ? 'Would generate' : 'Generating',
            count($jobs),
            count($jobs) === 1 ? '' : 's',
            $imageCount,
            $imageCount === 1 ? '' : 's',
        ));

        if ($this->output->isVerbose()) {
            foreach ($this->presetsByPath as $path => $presets) {
                $this->line($path.': '.implode(', ', array_keys($presets)));
            }
        }

        if ($this->option('dry-run')) {
            return self::SUCCESS;
        }

        $failures = [];
        $bar = $this->output->createProgressBar(count($jobs));
        $bar->start();

        foreach ($jobs as $job) {
            try {
                if ($this->option('queue') && config('queue.default') !== 'sync') {
                    GeneratePresetImageManipulation::dispatch($job['asset'], $job['preset']);
                } else {
                    app(PresetGenerator::class)->generate($job['asset'], $job['preset']);
                }
            } catch (\Throwable $e) {
                Log::debug($e);
                $failures[] = $job['asset']->path().' ['.$job['preset'].']: '.$e->getMessage();
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        if ($failures !== []) {
            foreach ($failures as $failure) {
                $this->error($failure);
            }

            $count = count($failures);
            $this->error("{$count} preset".($count === 1 ? '' : 's').' failed.');

            return self::FAILURE;
        }

        $this->info($this->option('queue') && config('queue.default') !== 'sync'
            ? 'Preset generation queued.'
            : 'Preset generation complete.');

        return self::SUCCESS;
    }

    /**
     * @param  Collection<string, Entry>  $projects
     */
    private function collectPortfolio(Entry $portfolio, $projects): void
    {
        foreach ($portfolio->get('thumbnail_blocks') ?? [] as $block) {
            foreach ($this->portfolioSlots($block) as [$id, $partial]) {
                $id = $this->entryId($id);
                if (! $id) {
                    continue;
                }

                $project = $projects->get($id);
                if (! $project) {
                    $this->warnings[] = "Portfolio block references missing project [{$id}].";

                    continue;
                }

                $this->addPartial($this->thumbnailPath($project), 'project-thumb-'.$partial);
            }
        }
    }

    /**
     * @param  Collection<string, Entry>  $projects
     */
    private function collectProjects($projects): void
    {
        foreach ($projects as $project) {
            foreach ($project->get('slider_images') ?? [] as $set) {
                $type = $set['type'] ?? '';

                if ($type === 'single_image') {
                    $this->addPartial($set['image'] ?? null, 'slide');
                } elseif ($type === 'double_image') {
                    $this->addPartial($set['left_image'] ?? null, 'slide-double');
                    $this->addPartial($set['right_image'] ?? null, 'slide-double');
                }
            }

            if ($project->get('categories')) {
                $this->addPartial($this->thumbnailPath($project), 'project-thumb-cat');
            }
        }
    }

    /**
     * @return list<array{0: mixed, 1: string}>
     */
    private function portfolioSlots(array $block): array
    {
        $type = $block['type'] ?? '';

        return match ($type) {
            'single' => [
                [$block['project'] ?? null, 'single'],
            ],
            'double' => $this->doubleSlots($block),
            'triple' => [
                [$block['projectL'] ?? null, 'double-narrow'],
                [$block['projectM'] ?? null, 'double-narrow'],
                [$block['projectR'] ?? null, 'double-narrow'],
            ],
            'quad' => [
                [$block['projectT'] ?? null, 'quad-tall'],
                [$block['projectW'] ?? null, 'quad-wide'],
                [$block['projectL'] ?? null, 'quad-small'],
                [$block['projectR'] ?? null, 'quad-small'],
            ],
            default => [],
        };
    }

    /**
     * @return list<array{0: mixed, 1: string}>
     */
    private function doubleSlots(array $block): array
    {
        [$left, $right] = match ($block['proportions'] ?? 'even') {
            'wleft' => ['double-wide', 'double-narrow'],
            'wright' => ['double-narrow', 'double-wide'],
            default => ['double-even', 'double-even'],
        };

        return [
            [$block['projectL'] ?? null, $left],
            [$block['projectR'] ?? null, $right],
        ];
    }

    private function thumbnailPath(Entry $project): mixed
    {
        if ($project->get('manual_thumb')) {
            return $project->get('thumbnail');
        }

        $first = ($project->get('slider_images') ?? [])[0] ?? null;
        if (! is_array($first)) {
            return null;
        }

        return $this->assetPath($first['image'] ?? null)
            ?? $this->assetPath($first['left_image'] ?? null);
    }

    private function addPartial(mixed $asset, string $partial): void
    {
        $path = $this->assetPath($asset);
        if (! $path) {
            return;
        }

        foreach ($this->partialPresets($partial) as $preset) {
            $this->presetsByPath[$path][$preset] = true;
        }
    }

    /**
     * @return list<string>
     */
    private function partialPresets(string $name): array
    {
        if (isset($this->partialPresets[$name])) {
            return $this->partialPresets[$name];
        }

        $file = resource_path("views/partials/images/{$name}.antlers.html");
        if (! is_file($file)) {
            $this->warnings[] = "Image partial [{$name}] was not found.";

            return $this->partialPresets[$name] = [];
        }

        preg_match_all('/preset="([^"]+)"/', (string) file_get_contents($file), $matches);

        return $this->partialPresets[$name] = array_values(array_unique($matches[1] ?? []));
    }

    /**
     * @return list<string>
     */
    private function undefinedPresets(): array
    {
        $defined = array_keys(config('statamic.assets.image_manipulation.presets', []));
        $used = [];

        foreach ($this->presetsByPath as $presets) {
            foreach (array_keys($presets) as $preset) {
                $used[$preset] = true;
            }
        }

        return array_values(array_diff(array_keys($used), $defined));
    }

    /**
     * @return list<array{asset: \Statamic\Contracts\Assets\Asset, preset: string}>
     */
    private function jobs(): array
    {
        $jobs = [];

        foreach ($this->presetsByPath as $path => $presets) {
            $asset = Asset::find(self::CONTAINER.'::'.$path);
            if (! $asset) {
                $this->warnings[] = "Asset not found [{$path}].";

                continue;
            }

            foreach (array_keys($presets) as $preset) {
                $jobs[] = ['asset' => $asset, 'preset' => $preset];
            }
        }

        return $jobs;
    }

    private function assetPath(mixed $value): ?string
    {
        if (is_array($value)) {
            $value = $value[0] ?? null;
        }

        if (! is_string($value) || $value === '') {
            return null;
        }

        return str_starts_with($value, self::CONTAINER.'::')
            ? substr($value, strlen(self::CONTAINER) + 2)
            : $value;
    }

    private function entryId(mixed $value): ?string
    {
        if (is_array($value)) {
            $value = $value[0] ?? null;
        }

        return is_string($value) && $value !== '' ? $value : null;
    }
}

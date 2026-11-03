<?php

/**
 * One-off Statamic 2 → 6 content migrator.
 * Run: herd php scripts/migrate-content.php
 */

require __DIR__.'/../vendor/autoload.php';

use Symfony\Component\Yaml\Yaml;

$oldRoot = '/Volumes/Dev/_php/anderson-hallas-OLD';
$newRoot = dirname(__DIR__);

function dumpYaml(array $data): string
{
    return Yaml::dump($data, 8, 2, Yaml::DUMP_MULTI_LINE_LITERAL_BLOCK);
}

function parseLenientYaml(string $contents): array
{
    try {
        $data = Yaml::parse($contents);

        return is_array($data) ? $data : [];
    } catch (\Throwable $e) {
        // Fix scalars like: last_name: "Liz" Hallas  or title: "Foo" by Bar
        $fixed = preg_replace_callback(
            '/^(\s*[\w-]+):\s*(".*)$/m',
            function (array $m): string {
                $val = $m[2];
                if (preg_match('/^"(?:[^"\\\\]|\\\\.)*"\s*$/', $val)) {
                    return $m[0];
                }

                return $m[1].": '".str_replace("'", "''", $val)."'";
            },
            $contents
        );

        try {
            $data = Yaml::parse($fixed);

            return is_array($data) ? $data : [];
        } catch (\Throwable $e2) {
            echo 'YAML parse failed: '.$e2->getMessage()."\n";

            return [];
        }
    }
}

function parseFrontMatter(string $contents): array
{
    // Statamic 3+ style front matter
    if (preg_match('/^---\s*\n(.*?)\n---\s*\n?(.*)$/s', $contents, $m)) {
        $data = parseLenientYaml($m[1]);
        $body = trim($m[2]);

        return [$data, $body];
    }

    // Statamic 2 style: entire file is YAML (no --- fences)
    return [parseLenientYaml($contents), ''];
}

function writeEntry(string $path, array $data, string $body = ''): void
{
    $dir = dirname($path);
    if (! is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    $yaml = dumpYaml($data);
    $out = "---\n".$yaml."---";
    if ($body !== '') {
        $out .= "\n\n".$body."\n";
    } else {
        $out .= "\n";
    }
    file_put_contents($path, $out);
}

function remapAsset(?string $path): ?string
{
    if ($path === null || $path === '') {
        return $path;
    }
    // Strip container prefixes used in v2
    $path = preg_replace('#^/assets/img/#', '', $path);
    $path = preg_replace('#^assets/img/#', '', $path);
    $path = ltrim($path, '/');

    return $path;
}

function remapAssetsDeep(mixed $value): mixed
{
    if (is_string($value)) {
        if (str_contains($value, '/assets/img/') || str_starts_with($value, 'assets/img/')) {
            return remapAsset($value);
        }

        return $value;
    }
    if (is_array($value)) {
        $out = [];
        foreach ($value as $k => $v) {
            // video_embed objects → URL string for video field
            if ($k === 'embed_video' || ($k === 'video' && is_array($v) && isset($v['url']))) {
                if (is_array($v) && isset($v['url'])) {
                    $out[$k] = $v['url'];
                    continue;
                }
            }
            $out[$k] = remapAssetsDeep($v);
        }

        return $out;
    }

    return $value;
}

function blueprintFromFieldset(?string $fieldset, ?string $template): string
{
    $map = [
        'home' => 'home',
        'portfolio' => 'portfolio',
        'staff-index' => 'staff',
        'contact' => 'contact',
        'news' => 'news',
        'expertise' => 'expertise',
        'default' => 'page',
        'project' => 'project',
        'staff-member' => 'staff_member',
        'mediathumb' => 'mediathumb',
    ];
    if ($fieldset && isset($map[$fieldset])) {
        return $map[$fieldset];
    }
    $tmap = [
        'home' => 'home',
        'portfolio' => 'portfolio',
        'staff' => 'staff',
        'contact' => 'contact',
        'news' => 'news',
        'expertise' => 'expertise',
        'project' => 'project',
        'default' => 'page',
    ];

    return $tmap[$template ?? 'default'] ?? 'page';
}

function cleanEntryData(array $data, string $blueprint): array
{
    unset($data['fieldset'], $data['content']);
    $data = remapAssetsDeep($data);
    $data['blueprint'] = $blueprint;

    // Drop map fields from contact
    unset($data['gmap_link'], $data['location_gmap']);

    // Categories on projects: ensure array of slugs
    if (isset($data['categories']) && is_string($data['categories'])) {
        $data['categories'] = [$data['categories']];
    }
    if (isset($data['categories']) && is_array($data['categories'])) {
        $data['categories'] = array_values(array_map(function ($c) {
            return is_string($c) ? preg_replace('#^categories/#', '', $c) : $c;
        }, $data['categories']));
    }

    // project_filters taxonomy paths → term slugs
    if (isset($data['project_filters']) && is_array($data['project_filters'])) {
        $data['project_filters'] = array_values(array_map(function ($c) {
            return is_string($c) ? preg_replace('#^categories/#', '', $c) : $c;
        }, $data['project_filters']));
    }

    return $data;
}

// ---------- Taxonomies ----------
$taxDir = "$oldRoot/site/content/taxonomies/categories";
$outTax = "$newRoot/content/taxonomies/categories";
if (is_dir($outTax)) {
    // clear terms only
    foreach (glob("$outTax/*.yaml") ?: [] as $f) {
        if (basename($f) !== '.gitkeep') {
            // keep going
        }
    }
}
if (! is_dir($outTax)) {
    mkdir($outTax, 0777, true);
}
foreach (glob("$taxDir/*.yaml") ?: [] as $file) {
    $term = Yaml::parseFile($file) ?: [];
    $slug = basename($file, '.yaml');
    $id = $term['id'] ?? null;
    unset($term['id']);
    $out = array_filter([
        'title' => $term['title'] ?? ucfirst($slug),
        'id' => $id,
    ], fn ($v) => $v !== null);
    file_put_contents("$outTax/$slug.yaml", dumpYaml($out));
}
echo "Taxonomy terms migrated\n";

// ---------- Globals ----------
foreach (['global', 'footer'] as $handle) {
    $src = "$oldRoot/site/content/globals/$handle.yaml";
    if (! file_exists($src)) {
        continue;
    }
    $raw = Yaml::parseFile($src) ?: [];
    $id = $raw['id'] ?? null;
    $fieldset = $raw['fieldset'] ?? null;
    unset($raw['id'], $raw['fieldset']);
    // Drop antlers body_classes / site helpers that don't apply the same way
    unset($raw['site_app_title'], $raw['site_name'], $raw['body_classes'], $raw['author_name']);
    $raw = remapAssetsDeep($raw);
    $out = [
        'title' => $handle === 'global' ? 'Global' : 'Footer',
    ];
    if ($id) {
        $out['id'] = $id;
    }
    $out['data'] = $raw;
    file_put_contents("$newRoot/content/globals/$handle.yaml", dumpYaml($out));
}
echo "Globals migrated\n";

// ---------- Collections: projects, staff, news, expertise ----------
function migrateNumberedCollection(string $oldDir, string $newDir, string $defaultBlueprint, bool $orderable, ?string $treeHandle = null): void
{
    global $newRoot;

    if (! is_dir($newDir)) {
        mkdir($newDir, 0777, true);
    }
    foreach (glob("$newDir/*.md") ?: [] as $f) {
        unlink($f);
    }

    $files = glob("$oldDir/*.md") ?: [];
    usort($files, fn ($a, $b) => strnatcasecmp(basename($a), basename($b)));

    $tree = [];
    foreach ($files as $file) {
        $base = basename($file, '.md');
        if (preg_match('/^(\d+)\.(.+)$/', $base, $m) && ! preg_match('/^\d{4}-\d{2}-\d{2}\./', $base)) {
            $slug = $m[2];
            $date = null;
        } elseif (preg_match('/^(\d{4}-\d{2}-\d{2})\.(.+)$/', $base, $m)) {
            $date = $m[1];
            $slug = $m[2];
        } else {
            $slug = $base;
            $date = null;
        }

        [$data, $body] = parseFrontMatter(file_get_contents($file));
        $blueprint = blueprintFromFieldset($data['fieldset'] ?? null, $data['template'] ?? null);
        if ($blueprint === 'page') {
            $blueprint = $defaultBlueprint;
        }
        $data = cleanEntryData($data, $blueprint);
        if ($date) {
            $data['date'] = $date;
            $filename = "$date.$slug.md";
        } else {
            $filename = "$slug.md";
        }
        writeEntry("$newDir/$filename", $data, $body);
        if ($orderable && ! empty($data['id'])) {
            $tree[] = ['entry' => $data['id']];
        }
    }

    if ($orderable && $treeHandle) {
        $treeDir = "$newRoot/content/trees/collections";
        if (! is_dir($treeDir)) {
            mkdir($treeDir, 0777, true);
        }
        file_put_contents("$treeDir/$treeHandle.yaml", dumpYaml(['tree' => $tree]));
    }
}

migrateNumberedCollection(
    "$oldRoot/site/content/collections/projects",
    "$newRoot/content/collections/projects",
    'project',
    true,
    'projects'
);
migrateNumberedCollection(
    "$oldRoot/site/content/collections/staff-members",
    "$newRoot/content/collections/staff-members",
    'staff_member',
    true,
    'staff-members'
);
migrateNumberedCollection(
    "$oldRoot/site/content/collections/news",
    "$newRoot/content/collections/news",
    'mediathumb',
    false
);
migrateNumberedCollection(
    "$oldRoot/site/content/collections/expertise",
    "$newRoot/content/collections/expertise",
    'mediathumb',
    false
);
echo "Collections migrated\n";

// ---------- Pages + structure tree ----------
$pagesRoot = "$oldRoot/site/content/pages";
$outPages = "$newRoot/content/collections/pages";
if (! is_dir($outPages)) {
    mkdir($outPages, 0777, true);
}
foreach (glob("$outPages/*.md") ?: [] as $f) {
    unlink($f);
}

$skipFolders = [
    // same-route duplicate of published t-shirt story
    '_2.how-a-t-shirt-sale-helps-pay-for-the-new-huerfano-county-judicial-center',
];

/**
 * Recursively walk v2 page folders and build structure + entries.
 *
 * @return array{entries: array<int, array>, tree: array}
 */
function walkPages(string $dir, string $relPath = ''): array
{
    global $skipFolders, $outPages;

    $entries = [];
    $tree = [];

    $indexFile = "$dir/index.md";
    if (! file_exists($indexFile)) {
        return ['entries' => [], 'tree' => []];
    }

    [$data, $body] = parseFrontMatter(file_get_contents($indexFile));
    $id = $data['id'] ?? null;
    $slug = $relPath === '' ? 'home' : basename($relPath);
    // Strip order prefix and draft underscore for slug
    $slug = preg_replace('/^_?\d+\./', '', $slug);
    $published = true;
    $folderName = $relPath === '' ? '' : basename($relPath);
    if ($folderName !== '' && str_starts_with($folderName, '_')) {
        $published = false;
    }

    $blueprint = blueprintFromFieldset($data['fieldset'] ?? null, $data['template'] ?? null);
    $data = cleanEntryData($data, $blueprint);
    if (! isset($data['template'])) {
        $tpl = match ($blueprint) {
            'home' => 'home',
            'portfolio' => 'portfolio',
            'staff' => 'staff',
            'contact' => 'contact',
            'news' => 'news',
            'expertise' => 'expertise',
            default => 'default',
        };
        $data['template'] = $tpl;
    }
    if (! $published) {
        $data['published'] = false;
    }

    $filename = "$slug.md";
    // avoid collisions by prefixing parent path for nested pages with same slug
    if ($relPath !== '' && $relPath !== $folderName) {
        // unique id based filename if needed - use slug only; tree owns URLs
        // For nested, Statamic uses entry id in tree; slug can collide across branches
        // Use id-based uniqueness: slug--parenthash if file exists
        if (file_exists("$outPages/$filename") && ($data['id'] ?? null)) {
            $filename = $slug.'-'.substr($data['id'], 0, 8).'.md';
            $data['slug'] = $slug;
        }
    }

    writeEntry("$outPages/$filename", $data, $body);
    $entryId = $data['id'] ?? null;
    $entries[] = ['id' => $entryId, 'slug' => $slug, 'file' => $filename];

    $children = [];
    foreach (scandir($dir) ?: [] as $item) {
        if ($item === '.' || $item === '..' || $item === 'index.md') {
            continue;
        }
        $path = "$dir/$item";
        if (! is_dir($path)) {
            continue;
        }
        if (in_array($item, $skipFolders, true)) {
            echo "Skipping duplicate folder: $item\n";
            continue;
        }
        $childRel = $relPath === '' ? $item : "$relPath/$item";
        $child = walkPages($path, $childRel);
        foreach ($child['entries'] as $e) {
            $entries[] = $e;
        }
        foreach ($child['tree'] as $t) {
            $children[] = $t;
        }
    }

    // Sort children by original folder order prefix
    // Already scanned in filesystem order; re-scan for order
    usort($children, function ($a, $b) {
        return strnatcasecmp($a['_sort'] ?? '', $b['_sort'] ?? '');
    });

    $node = [
        'entry' => $entryId,
        '_sort' => $folderName,
    ];
    $cleanChildren = [];
    foreach ($children as $c) {
        unset($c['_sort']);
        $cleanChildren[] = $c;
    }
    if ($cleanChildren) {
        $node['children'] = $cleanChildren;
    }

    return ['entries' => $entries, 'tree' => [$node]];
}

$result = walkPages($pagesRoot);
$treeNodes = $result['tree'];
// Structure root expects children under home; Statamic pages structure with root:true
// The tree file format:
// tree:
//   -
//     entry: home-id
//     children: ...

// With structure root:true, home is first and cannot nest children —
// lift its children to top-level siblings.
$nodes = array_map(function ($n) {
    unset($n['_sort']);

    return $n;
}, $treeNodes);
if ($nodes) {
    $home = $nodes[0];
    $kids = $home['children'] ?? [];
    unset($home['children']);
    $nodes = array_merge([$home], $kids);
}
$treeOut = ['tree' => $nodes];
$treeDir = "$newRoot/content/trees/collections";
if (! is_dir($treeDir)) {
    mkdir($treeDir, 0777, true);
}
file_put_contents("$treeDir/pages.yaml", dumpYaml($treeOut));
echo 'Pages migrated: '.count($result['entries'])." entries\n";

echo "Done.\n";

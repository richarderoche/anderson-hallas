# Linode Object Storage (CMS assets)

Brand icons (`/favicon.ico`, touch icons, `fb-img.png`, `site-icons.svg`) and Vite-built fonts stay in the repo under `public/` / `resources/fonts`. **Only** CMS media in `public/assets` moves to Object Storage.

## 1. Create bucket and keys

1. In Cloud Manager → Object Storage, create a bucket (e.g. `andarch-assets`) in your preferred cluster.
2. Create an access key with read/write on that bucket.
3. Note the **cluster endpoint** (e.g. `https://us-east-1.linodeobjects.com`), bucket name, and region/cluster id.
4. Enable public read on objects you serve on the site (bucket policy or per-object ACL / website settings as required by Linode).

## 2. Environment

In `.env` / Forge env (not committed secrets):

```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=andarch-assets
AWS_ENDPOINT=https://us-east-1.linodeobjects.com
AWS_URL=https://andarch-assets.us-east-1.linodeobjects.com
AWS_USE_PATH_STYLE_ENDPOINT=true
```

Adjust `AWS_URL` / endpoint to match your cluster’s public URL pattern.

## 3. Composer package (once)

```bash
herd composer require league/flysystem-aws-s3-v3
```

`config/filesystems.php` already has an `s3` disk with path-style endpoint and `visibility => public`.

## 4. Point the asset container at S3

In `content/assets/assets.yaml`:

```yaml
title: Assets
disk: s3
```

(Or keep `disk: assets` locally and set `disk: s3` only on production via env-driven config if you prefer.)

## 5. Upload existing media

From the project root (after local preview works):

```bash
# Example with AWS CLI configured for Linode:
aws s3 sync public/assets s3://andarch-assets/ \
  --endpoint-url https://us-east-1.linodeobjects.com \
  --acl public-read
```

Or use `rclone` / Cyberduck. Do **not** upload `public/fonts`, favicons, or `public/transformed`.

## 6. Glide hybrid cache

`config/statamic/assets.php` uses:

- `cache => hybrid`
- `route => transformed`
- `cache_path => public/transformed`

Hybrid cache still writes **locally** under `public/transformed` (gitignored). Source files are read from the S3 disk; derivatives are served from `/transformed/...` on the app server.

## 7. Verify then delete local copies

1. Open the Control Panel asset browser; open a few pages that use Glide images.
2. Confirm front-end URLs and CP uploads.
3. Delete local `public/assets` on the server (and locally if desired). Keep `/public/assets` and `/public/transformed` in `.gitignore`.

## 8. Rotate secrets

The legacy Mailgun key lived in the old repo’s `email.yaml`. Rotate Mailgun and any Object Storage keys that may have been exposed during migration.

# Linode Object Storage (CMS assets)

Brand icons (`/favicon.ico`, touch icons, `fb-img.png`, `site-icons.svg`) and Vite-built fonts stay in the repo under `public/` / `resources/fonts`. **Only** CMS media in `public/assets` moves to Object Storage.

## 1. Create bucket and keys

1. In Cloud Manager → Object Storage, create a bucket (e.g. `andarch-assets`) in your preferred cluster.
2. Create an access key with read/write on that bucket.
3. Note the **cluster endpoint** (e.g. `https://us-ord-10.linodeobjects.com`), bucket name, and region/cluster id.
4. Make objects publicly readable with a **bucket policy** (preferred). Linode does **not** implement per-object ACLs (`--acl public-read` fails with `NotImplemented`), so anonymous browser requests stay `403` until a policy allows `s3:GetObject`.

Save a policy file (swap the bucket name if needed):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::andarch-assets/*"]
    }
  ]
}
```

Apply it:

```bash
aws s3api put-bucket-policy \
  --bucket andarch-assets \
  --policy file://bucket-policy.json \
  --endpoint-url https://us-ord-10.linodeobjects.com
```

Confirm with a public URL (no credentials):  
`curl -I https://andarch-assets.us-ord-10.linodeobjects.com/some/object.jpg` → `200`.  
You can also set “Public Read” in Cloud Manager if you prefer the UI; same outcome.

## 2. Environment

In `.env` / Forge env (not committed secrets):

```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-ord-10
AWS_BUCKET=andarch-assets
AWS_ENDPOINT=https://us-ord-10.linodeobjects.com
AWS_URL=https://andarch-assets.us-ord-10.linodeobjects.com
AWS_USE_PATH_STYLE_ENDPOINT=false
```

`config/filesystems.php` currently hardcodes the Linode `us-ord-10` region/bucket/url/endpoint for this project; keep `AWS_USE_PATH_STYLE_ENDPOINT=false` (virtual-hosted-style URLs). Adjust if the bucket moves clusters.

## 3. Composer package (once)

```bash
herd composer require league/flysystem-aws-s3-v3
```

`config/filesystems.php` already has an `s3` disk with virtual-hosted-style endpoint (`use_path_style_endpoint` false) and `visibility => public`.

## 4. Point the asset container at S3

In `content/assets/assets.yaml`:

```yaml
title: Assets
disk: s3
```

Then clear caches (`herd php please cache:clear`). Keep a public-read **bucket policy** (GetObject for `arn:aws:s3:::andarch-assets/*`); object ACLs are not supported on Linode.

## 5. Upload existing media

From the project root (after local preview works). AWS CLI **2.23+** sends integrity / multipart headers Linode does not implement (`x-amz-acl`, `x-amz-mp-object-size`). Omit `--acl`, force checksums off unless required, and raise the multipart threshold above your largest file so uploads use single-part `PutObject` (max object here is ~238 MB; `5GB` is safe):

```bash
mkdir -p /tmp/ah-aws
cat > /tmp/ah-aws/config <<'EOF'
[default]
request_checksum_calculation = when_required
response_checksum_validation = when_required
s3 =
    preferred_transfer_client = classic
    multipart_threshold = 5GB
    addressing_style = virtual
EOF

export AWS_CONFIG_FILE=/tmp/ah-aws/config
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required

aws s3 sync public/assets s3://andarch-assets/ \
  --endpoint-url https://us-ord-10.linodeobjects.com \
  --exclude ".DS_Store" \
  --exclude "**/.DS_Store" \
  --exclude "**/._*" \
  --exclude "Thumbs.db" \
  --exclude "**/.gitkeep"
```

`preferred_transfer_client = classic` plus a high `multipart_threshold` avoids the CRT client’s `x-amz-mp-object-size` header. Do **not** pass `--acl public-read`. Re-running `sync` is safe; already-uploaded objects are skipped. Alternative: AWS CLI ≤ 2.22.35, or `rclone`.

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

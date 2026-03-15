# Cinematic Content Pipeline

## Overview

This document describes the architecture for generating dynamic cinematic content (images and looping videos) used across all projects (Web, Mobile, Admin). The pipeline combines AI image generation with Google's Veo video synthesis API to produce seamless, high-quality background media.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Models & Selection Rationale](#models--selection-rationale)
3. [Edge Function: `generate-hero-video`](#edge-function-generate-hero-video)
4. [API Contract](#api-contract)
5. [Generation Flow](#generation-flow)
6. [Storage & CDN](#storage--cdn)
7. [Frontend Embedding](#frontend-embedding)
8. [Cross-Platform Integration](#cross-platform-integration)
9. [Configuration & Secrets](#configuration--secrets)
10. [Decisions & ADRs](#decisions--adrs)
11. [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Client (any project)                    │
│  Web (React) · Mobile (Flutter) · Admin Panel                │
│                                                              │
│  POST /functions/v1/generate-hero-video                      │
│  Authorization: Bearer <admin-jwt>                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              Edge Function: generate-hero-video               │
│                                                              │
│  1. Auth check (admin role required)                         │
│  2. Generate reference frame via Google Gemini API            │
│  3. Submit frame + prompt to Google Veo API                  │
│  4. Poll for completion (up to 5 min)                        │
│  5. Download + upload to Storage                             │
│  6. Return public URL                                        │
└────────┬─────────────────────┬───────────────────────────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────────────┐
│  Google Gemini  │   │  Google Veo API          │
│  API (direct)   │   │  (Vertex AI)             │
│                 │   │                          │
│  Model:         │   │  Model:                  │
│  gemini-3-pro-  │   │  veo-3.1-generate-       │
│  image-preview  │   │  preview                 │
│                 │   │                          │
│  Output:        │   │  Input: first+last frame │
│  16:9 PNG       │   │  Output: MP4 (720p)      │
│  (base64)       │   │  Duration: 8s            │
└─────────────────┘   └─────────────────────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │  Cloud Storage      │
         │  Bucket: assets     │
         │  Path: videos/      │
         │  Public: yes        │
         └─────────────────────┘
```

---

## Models & Selection Rationale

### Image Generation: Reference Frame

| Criteria | `gemini-2.5-flash-image` | `gemini-3-pro-image-preview` |
|----------|--------------------------|----------------------------------|
| Aspect ratio control | Poor (always ~1:1) | Good (respects prompt dimensions) |
| Quality | Medium | High |
| Speed | Fast (~2s) | Slower (~15-18s) |
| Cost | Low | Higher |
| Format support | Ignores pixel specs | Follows 16:9 prompts |

**Decision:** `gemini-3-pro-image-preview` is required because the reference frame MUST match the video aspect ratio exactly. A mismatched frame causes Veo to letterbox (black bars). Since generation is admin-only and infrequent, the higher cost and latency are acceptable.

### Video Generation

| Criteria | Value |
|----------|-------|
| Model | `veo-3.1-generate-preview` |
| API | Google Generative Language API (v1beta) |
| Technique | First + Last frame (seamless loop) |
| Aspect ratio | 16:9 |
| Resolution | 720p |
| Duration | 8 seconds |
| Output | MP4 |

**Decision:** The first+last frame technique uses the same image as both start and end frame, producing a seamless loop without visible cuts. This is critical for background videos that play on repeat.

---

## Edge Function: `generate-hero-video`

**Location:** `supabase/functions/generate-hero-video/index.ts`

### Responsibilities

1. **Authentication** — Validates admin role via JWT + `user_roles` table
2. **Image generation** — Calls Google Gemini API to produce a 16:9 reference frame
3. **Video generation** — Submits frame to Veo API with first+last frame technique
4. **Polling** — Long-polls operation status (10s intervals, 5min timeout)
5. **Storage** — Downloads result video and uploads to cloud storage bucket
6. **Response** — Returns public URL of the generated video

### JWT Configuration

```toml
# supabase/config.toml
[functions.generate-hero-video]
verify_jwt = false  # Manual auth check inside function (admin role)
```

JWT verification is disabled at the gateway level because the function performs its own role-based authorization check internally. This allows flexibility for future webhook or cron-based triggers.

---

## API Contract

### Request

```
POST /functions/v1/generate-hero-video
Authorization: Bearer <user-jwt>
Content-Type: application/json
```

```json
{
  "prompt": "(optional) Custom video motion prompt",
  "referenceImageBase64": "(optional) Pre-generated base64 PNG to skip image generation"
}
```

Both fields are optional:
- If `prompt` is omitted, a default cinematic dark-teal gradient prompt is used
- If `referenceImageBase64` is omitted, the function generates a new reference frame

### Response (Success)

```json
{
  "ok": true,
  "data": {
    "url": "https://<project>.supabase.co/storage/v1/object/public/assets/videos/hero-video-<timestamp>.mp4",
    "fileName": "hero-video-<timestamp>.mp4",
    "prompt": "<the prompt used>",
    "usedFirstLastFrame": true
  }
}
```

### Response (Error)

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN | CONFIG_ERROR | VEO_API_ERROR | VEO_GENERATION_ERROR | TIMEOUT | DOWNLOAD_ERROR | UPLOAD_ERROR | NO_VIDEO_DATA | INTERNAL_ERROR",
    "message": "Human-readable error description"
  }
}
```

### Error Codes

| Code | HTTP Status | Cause |
|------|-------------|-------|
| `FORBIDDEN` | 403 | Caller is not an admin |
| `CONFIG_ERROR` | 500 | Missing API keys |
| `VEO_API_ERROR` | 500 | Veo API rejected the request |
| `VEO_GENERATION_ERROR` | 500 | Veo completed but with an error |
| `TIMEOUT` | 504 | Generation exceeded 5-minute limit |
| `DOWNLOAD_ERROR` | 500 | Failed to download video from Veo URI |
| `UPLOAD_ERROR` | 500 | Failed to upload to storage |
| `NO_VIDEO_DATA` | 500 | Response contained no video bytes |
| `INTERNAL_ERROR` | 500 | Unhandled exception |

---

## Generation Flow

```
Client                Edge Function           Gemini API          Veo API           Storage
  │                        │                      │                  │                 │
  │  POST /generate-hero   │                      │                  │                 │
  │───────────────────────>│                      │                  │                 │
  │                        │                      │                  │                 │
  │                        │  Auth check (admin)  │                  │                 │
  │                        │──────────────────>   │                  │                 │
  │                        │                      │                  │                 │
  │                        │  Generate 16:9 frame │                  │                 │
  │                        │─────────────────────>│                  │                 │
  │                        │  base64 PNG          │                  │                 │
  │                        │<─────────────────────│                  │                 │
  │                        │                      │                  │                 │
  │                        │  predictLongRunning (first+last frame)  │                 │
  │                        │─────────────────────────────────────────>│                 │
  │                        │  operation name                         │                 │
  │                        │<─────────────────────────────────────────│                 │
  │                        │                      │                  │                 │
  │                        │  Poll every 10s...   │                  │                 │
  │                        │─────────────────────────────────────────>│                 │
  │                        │  { done: true, video URI }              │                 │
  │                        │<─────────────────────────────────────────│                 │
  │                        │                      │                  │                 │
  │                        │  Download video from URI                │                 │
  │                        │─────────────────────────────────────────>│                 │
  │                        │  MP4 bytes                              │                 │
  │                        │<─────────────────────────────────────────│                 │
  │                        │                      │                  │                 │
  │                        │  Upload to bucket                       │                 │
  │                        │────────────────────────────────────────────────────────────>│
  │                        │  public URL                             │                 │
  │                        │<────────────────────────────────────────────────────────────│
  │                        │                      │                  │                 │
  │  { ok: true, url }     │                      │                  │                 │
  │<───────────────────────│                      │                  │                 │
```

### Timing

| Step | Typical Duration |
|------|-----------------|
| Auth check | < 500ms |
| Image generation (Gemini API) | 15–20s |
| Veo submission | < 2s |
| Veo generation + polling | 30–120s |
| Video download | 2–5s |
| Storage upload | 1–3s |
| **Total** | **50–150s** |

---

## Storage & CDN

### Bucket Configuration

| Property | Value |
|----------|-------|
| Bucket name | `assets` |
| Public | Yes |
| Path pattern | `videos/hero-video-<timestamp>.mp4` |
| Auto-created | Yes (function creates bucket if missing) |

### Public URL Pattern

```
https://<project-id>.supabase.co/storage/v1/object/public/assets/videos/<filename>.mp4
```

### Retention

Videos are stored indefinitely. Old videos are not automatically deleted — the function always creates a new file with a timestamp-based name. Manual cleanup of old videos is recommended periodically.

---

## Frontend Embedding

### Web (React + Vite)

```tsx
// Hardcoded URL (updated after each generation)
const heroVideoUrl = "https://<project>.supabase.co/storage/v1/object/public/assets/videos/hero-video-<ts>.mp4";

// Embedding
<div className="absolute inset-0 overflow-hidden">
  <video
    src={heroVideoUrl}
    poster={fallbackImage}     // Static JPG fallback
    autoPlay
    muted
    loop
    playsInline
    className="absolute inset-0 w-full h-full object-cover"
  />
  {/* Dark overlay for text readability */}
  <div className="absolute inset-0 bg-black/60" />
</div>
```

#### Critical CSS Properties

| Property | Purpose |
|----------|---------|
| `object-cover` | Ensures video fills container without letterboxing |
| `playsInline` | Required for iOS autoplay |
| `muted` | Required for browser autoplay policies |
| `loop` | Seamless playback (matches first+last frame technique) |
| `poster` | Static image shown while video loads |

### Mobile (Flutter)

```dart
// Use video_player or chewie package
VideoPlayerController.networkUrl(
  Uri.parse(heroVideoUrl),
)..initialize().then((_) {
  controller.setLooping(true);
  controller.setVolume(0);
  controller.play();
});

// Widget
FittedBox(
  fit: BoxFit.cover,
  child: SizedBox(
    width: controller.value.size.width,
    height: controller.value.size.height,
    child: VideoPlayer(controller),
  ),
);
```

### Admin Panel

The admin panel can trigger regeneration via an API call:

```typescript
const regenerateVideo = async (customPrompt?: string) => {
  const { data, error } = await supabase.functions.invoke('generate-hero-video', {
    body: { prompt: customPrompt },
  });
  if (data?.ok) {
    // Update config or display new URL
    console.log('New video:', data.data.url);
  }
};
```

---

## Cross-Platform Integration

### Shared Contract

All projects consume the same API contract and storage URLs. The video URL is a static string embedded in the frontend code after generation.

### Update Workflow

1. Admin triggers `generate-hero-video` (via chat, admin panel, or direct API call)
2. Function returns new public URL
3. Developer updates the video URL in the respective project's source code
4. Deploy project with updated URL

### Future: Dynamic URL Resolution

For automated updates without code changes, consider storing the active video URL in a database table:

```sql
CREATE TABLE public.site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Store active hero video
INSERT INTO site_config (key, value)
VALUES ('hero_video_url', 'https://...');
```

Then fetch at runtime:

```typescript
const { data } = await supabase
  .from('site_config')
  .select('value')
  .eq('key', 'hero_video_url')
  .single();
```

---

## Configuration & Secrets

### Required Secrets

| Secret | Purpose | Provisioning |
|--------|---------|-------------|
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API access (image generation) | Manually added via Secrets manager |
| `GOOGLE_VEO_API_KEY` | Google Generative Language API (Veo video) | Manually added via Secrets manager |
| `SUPABASE_URL` | Storage + auth | Auto-provisioned |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage upload (bypasses RLS) | Auto-provisioned |
| `SUPABASE_ANON_KEY` | User JWT validation | Auto-provisioned |

### API Endpoints Used

| Service | Endpoint |
|---------|----------|
| Google Gemini API | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent` |
| Veo (generate) | `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning` |
| Veo (poll) | `https://generativelanguage.googleapis.com/v1beta/<operation-name>` |
| Veo (download) | URI returned in operation response |

---

## Decisions & ADRs

### ADR: Why `gemini-3-pro-image-preview` over `gemini-2.5-flash-image`

**Context:** The reference frame must be exactly 16:9 to avoid black bars in the generated video. `gemini-2.5-flash-image` produces ~1:1 images regardless of prompt instructions, causing Veo to letterbox the result.

**Decision:** Use `gemini-3-pro-image-preview` which respects aspect ratio prompts.

**Consequences:**
- (+) No more black bars / letterboxing
- (+) Higher image quality
- (−) ~10x slower generation (~18s vs ~2s)
- (−) Higher per-request cost
- Acceptable because generation is admin-only and infrequent

### ADR: Why first+last frame technique

**Context:** Background hero videos must loop seamlessly without visible cuts or jumps.

**Decision:** Pass the same reference image as both `image` (first frame) and `lastFrame` to Veo. The model interpolates motion between identical frames, producing a natural loop.

**Consequences:**
- (+) Perfect seamless loop every time
- (+) No post-processing or crossfade needed
- (−) Less dramatic motion (start and end must match)
- Acceptable for ambient background content

### ADR: Why server-side video download + re-upload

**Context:** Veo returns a temporary signed URI for the generated video. This URI expires and cannot be used as a permanent public URL.

**Decision:** The edge function downloads the video bytes and re-uploads them to persistent cloud storage.

**Consequences:**
- (+) Permanent, CDN-backed public URL
- (+) No dependency on Google's temporary URIs
- (−) Adds 3–8s to the pipeline
- (−) Storage cost for video files (~1.5MB each)

---

## Troubleshooting

### Black bars / Letterboxing

**Cause:** Reference frame aspect ratio does not match `16:9`.

**Fix:** Ensure the image model is `gemini-3-pro-image-preview` and the prompt explicitly requests `1280x720 pixels, 16:9 aspect ratio`.

### Timeout (504)

**Cause:** Veo generation exceeded the 5-minute polling window.

**Fix:** Retry. Veo generation typically takes 30–120s but can occasionally take longer under load. The timeout is generous at 5 minutes.

### `CONFIG_ERROR`

**Cause:** Missing `GOOGLE_VEO_API_KEY` or `GOOGLE_GEMINI_API_KEY` secret.

**Fix:** Add the missing secret via the Secrets manager in project settings.

### `NO_VIDEO_DATA`

**Cause:** Veo returned a response format that the function does not recognize.

**Fix:** Check the edge function logs for the response structure. The function handles both `generateVideoResponse.generatedSamples` (Gemini API format) and `predictions` (Vertex AI format). If Google introduces a new format, the parsing logic needs updating.

### Video loads but shows compression artifacts

**Cause:** 720p resolution may not be sufficient for very large displays.

**Fix:** Change `resolution: '720p'` to `'1080p'` in the Veo API parameters. Note this increases generation time and file size.

---

## Universal AI Image Generation

### Edge Function: `generate-image`

**Location:** `supabase/functions/generate-image/index.ts`

A universal image generation endpoint that selects aspect ratio, dimensions, and storage bucket based on the `context` parameter. Used by all upload components in the app.

### Context Mapping

| Context | Aspect Ratio | Dimensions | Bucket | Folder |
|---------|-------------|------------|--------|--------|
| `avatar` | 1:1 | 512x512 | `avatars` | — |
| `banner` | 3:1 | 1500x500 | `avatars` | — |
| `logo` | 1:1 | 512x512 | `platform-images` | `logos/` |
| `cover` | 16:9 | 1280x720 | `platform-images` | `covers/` |
| `post` | 4:3 | 1200x900 | `platform-images` | `posts/` |
| `thumbnail` | 16:9 | 1280x720 | `platform-images` | `thumbnails/` |
| `hero-frame` | 16:9 | 1280x720 | `assets` | `frames/` |

### API Contract

```
POST /functions/v1/generate-image
Authorization: Bearer <user-jwt>
Content-Type: application/json
```

**Request:**

```json
{
  "context": "avatar | banner | logo | cover | post | thumbnail | hero-frame",
  "prompt": "A professional headshot with dark moody lighting"
}
```

**Response (Success):**

```json
{
  "ok": true,
  "data": {
    "url": "https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>",
    "context": "avatar",
    "dimensions": { "width": 512, "height": 512 }
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`, `CONFIG_ERROR`, `RATE_LIMIT`, `PAYMENT_REQUIRED`, `AI_ERROR`, `UPLOAD_ERROR`, `INTERNAL_ERROR`

### Prompt Enhancement

Every user prompt is automatically augmented with context-specific format instructions:

```
User prompt: "A futuristic tech company logo"

Enhanced prompt (context=logo):
"Generate an image in exactly 512x512 pixels, square format, 1:1 aspect ratio.
 Fill the entire frame edge to edge. No borders, no letterboxing, no padding.
 A futuristic tech company logo"
```

### Model

Uses `gemini-2.0-flash-exp` (or latest Gemini model with image generation) via the Google Gemini API directly — the same model used for hero video reference frames. Selected for its superior aspect ratio control.

### Frontend Hook: `useGenerateImage`

```typescript
import { useGenerateImage } from '@/hooks/use-generate-image';

const { generate, isGenerating, error } = useGenerateImage();

// Generate and get public URL
const url = await generate({
  context: 'avatar',
  prompt: 'Professional headshot, dark moody lighting',
});

// url is ready for onUpload(url)
```

### UI Component: `AiImagePrompt`

A reusable popover component (`src/components/ui/ai-image-prompt.tsx`) providing a prompt input + generate button. Integrated into:

- `AvatarUpload` — context: `avatar`
- `BannerUpload` — context: `banner`
- `ImageUpload` (Platform) — context: `logo` or `cover` (based on `aspectRatio` prop)
- `PostMediaUpload` — context: `post`
- `PitchVideoUpload` — context: `thumbnail`
- `Create` page — context: `cover` and `logo`

### Relationship to Hero Video Pipeline

The `generate-image` function uses the same model and prompt enhancement technique as `generate-hero-video`. The hero video pipeline retains its own inline image generation for simplicity, but both functions share the identical approach:

1. Same model: `gemini-2.0-flash-exp` (or latest Gemini image generation model)
2. Same API: Google Gemini API (direct)
3. Same prompt pattern: explicit pixel dimensions + aspect ratio + "fill entire frame"

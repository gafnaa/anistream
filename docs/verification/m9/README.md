# M9 verification

M9 downloads direct MP4 sources only. HLS download support is deferred; Blogger/iframe mirrors are excluded. The API contract and server are unchanged.

## Implementation

- One active transfer, using Expo SDK 58 `expo-file-system/legacy.createDownloadResumable`, with byte progress and ETA. Pause uses `pauseAsync()` and persists `savable().resumeData` alongside the original URL, destination and metadata in AsyncStorage. Transfers checkpoint every 30 seconds and pause on backgrounding or a network gate change.
- Interrupted transfers recover as paused; queued transfers wait for an allowed connection. Wi-Fi only defaults to enabled. SDK 58 Android's native adapter uses a byte offset as resume data; after process death the adapter reads the actual partial-file length before resuming. A failed transfer can be retried from a clean file.
- Local playback mounts a separate player path after download hydration, without mounting API queries. Saved episode titles, series title, episode number and artwork are available locally; poster files are downloaded alongside successful videos when the connection permits. Failed poster retrieval uses the existing artwork placeholder/cache and does not discard the episode.
- Ready files and partial files count toward download storage. Confirmed deletion removes the video and poster. A file currently being played cannot be deleted, including by the clear-all action.
- Downloads require the native app. Web entry points are hidden and `/downloads` explains this limitation.

`expo-file-system ~58.0.13` is now an explicit dependency, installed with `npx expo install expo-file-system`, because this feature directly imports its resumable native transfer and file APIs. It was previously transitive. The tests use Node 24's built-in test runner and TypeScript stripping, with no new test dependency. CI runs `npm run test:downloads` before bundling Android.

## Checks

- `npm run typecheck`: pass.
- `npm run lint`: pass, no warnings.
- `npm run test:downloads`: seven tests pass: serialized writes/one active transfer, transitions/retry/delete, restart recovery, Wi-Fi gate, corrupt data, persistence failure/retry, and mutations during hydration.
- `npx -y expo-doctor@1.21.6`: 20/20 checks pass.
- `npx expo export --platform android`: pass (final reruns use `/tmp/m9-android-export` to preserve the web export).
- `EXPO_PUBLIC_API_URL=http://127.0.0.1:5178 npx expo export --platform web` followed by `npx expo serve --port 5189`: production web routes render without page exceptions.

The API at port 5178 was only read, never restarted or stopped. Its episode response for `tensei-shitara-ken-deshita-ii-episode-7-subtitle-indonesia` supplied:

```json
{"provider":"otakudesu","quality":"720p","type":"mp4","kind":"resolvable","url":"https://cdn.odcloud.net/anime/Otakudesu.io_TSKD--07_720p.mp4"}
```

Two real requests without a Referer proved byte-range support:

```text
Range: bytes=0-1023       -> HTTP 206, Content-Length: 1024
Content-Range: bytes 0-1023/224571251
Range: bytes=1024-2047    -> HTTP 206, Content-Length: 1024
Content-Range: bytes 1024-2047/224571251
Content-Type: video/mp4
```

Browser interaction checks passed for the manage sheet, deletion confirmation/cancel, queue segment, quality selection, Wi-Fi switch, empty state and no horizontal overflow at 320px. These are web UI checks, not native transfer/playback tests.

## Screenshots

Headless Chromium/Playwright, 390 × 844, `id-ID`. API responses were fetched and fulfilled through `page.route` with `access-control-allow-origin: *`; teardown used `page.unrouteAll({behavior:'ignoreErrors'})`.

The native downloads views are rendered through `/dev/downloads?state=ready|queue|empty|quality` on a local development Metro server. This route checks `__DEV__`, never seeds the persisted download store and redirects in production. `expo serve` rejects development exports, so the four seeded screenshots use Metro; the production web screenshots use the requested export/serve workflow. The quality sheet's start button is disabled on web, including the preview. Device capacity is unavailable on web, so the preview shows the seeded downloaded byte count instead of invented device capacity. Mock titles/progress are display fixtures, not actual downloaded files. The existing development warning toast about a non-boolean DOM `accessible` attribute was dismissed before capture.

| Native UI preview | Screenshot |
|---|---|
| Ready list | [m9-ready.png](m9-ready.png) |
| Queue | [m9-queue.png](m9-queue.png) |
| Empty | [m9-empty.png](m9-empty.png) |
| Quality sheet | [m9-quality.png](m9-quality.png) |

Compared against `downloads.png`, `downloadqueue.png`, `downloadempty.png`, `downloadquality.png` and `downloads-components.png`: retained rose segments/progress, dark rounded rows, thumbnail/title/episode hierarchy, Wi-Fi copy, empty-state structure and selected 720p quality. The queue storage summary is hidden to match its reference. Existing typography, background and navigation tokens are reused.

Production web: [unsupported downloads](m9-web-downloads.png), [My Space](m9-space.png), [settings](m9-settings.png), [storage](m9-storage.png), [detail](m9-detail.png). Web intentionally omits native download controls and storage actions. The corresponding native entry points follow `space.png` and `detail.png` and still require device review.

## Required real-device follow-up

This host has Java 8 and no Android emulator. No native run, airplane-mode playback or HLS/iframe regression playback is claimed.

1. Install a development build that includes the explicit file-system dependency. Download the real MP4; verify progress, ETA and local poster.
2. Pause/resume, background/foreground, force-close during a transfer, relaunch and resume; compare the completed file to the source and seek throughout it.
3. Switch Wi-Fi to cellular with Wi-Fi-only enabled; verify bytes stop and the queue explains why. Disable the setting and verify cellular transfer is allowed. Repeat with no connection.
4. Enable airplane mode, cold launch, play the ready episode, seek, exit and resume. Confirm watch history and resume position persist with no API.
5. Delete one file and all files, verify disk usage decreases, cancel both confirmations, and verify a playing episode cannot be removed.
6. Verify no-MP4/iframe-only episode controls show “Episode ini belum bisa diunduh”, and check existing HLS and iframe streaming playback online.

Design review: ENERGY 1 / RHYTHM 1 / MOTION 1, matching the supplied functional list/sheet designs. Accent and icons communicate selected state, transfer progress and actions. Web previews were built and inspected; device-only interaction, storage and accessibility validation remains part of the follow-up above.

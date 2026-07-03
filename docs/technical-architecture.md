# RestoreAI Initial Technical Architecture

Status: Draft architecture for first native iOS release  
Source: Current README product blueprint and MVP scope  
Platform decision: Native SwiftUI iOS app for v1. Expo, Android, and web are not part of the first implementation.

## 1. Architecture Goals

- Ship a reliable single-photo restoration workflow on iOS.
- Keep the user experience simple while preserving a modular restoration pipeline.
- Support privacy-conscious processing choices from the first release.
- Separate preview work from final export work so the app can feel fast while still producing high-quality output.
- Keep cloud inference replaceable as model choices evolve.

## 2. App Surface

The first version is an iOS app with these major areas:

- Restore Home
  - Starts a new import.
  - Shows local recent projects.
  - Provides entry to settings and privacy defaults.

- Import Preview
  - Displays the selected original photo.
  - Lets the user choose processing mode.
  - Starts Auto Restore.

- Job Progress
  - Shows current stage and cancellable progress.
  - Handles upload, cloud processing, download, and local post-processing states.

- Editor
  - Displays restored output.
  - Hosts compare, upscale, and color correction controls.
  - Keeps non-destructive references to original, baseline restored output, and adjusted output.

- Export Sheet
  - Saves to Photos or Files.
  - Opens the iOS share sheet.
  - Applies format, quality, metadata, and final render choices.

- Settings
  - Default privacy mode.
  - Metadata stripping preference.
  - Cloud retention explanation.
  - Basic diagnostics and app version.

## 3. Native iOS Client Structure

Recommended SwiftUI module boundaries:

- App Shell
  - SwiftUI `App`, root tab or single navigation stack, app-level dependency injection.

- Restore Feature
  - Import flow.
  - Processing mode selection.
  - Restore job orchestration UI.

- Editor Feature
  - Image canvas.
  - Before/after compare.
  - Upscale controls.
  - Color correction controls.

- Export Feature
  - Render preparation.
  - Photos, Files, and share sheet integration.

- Core Domain
  - Project model.
  - Restore job model.
  - Pipeline stage model.
  - Privacy mode model.

- Services
  - Photo import service.
  - Local file store.
  - Cloud restore API client.
  - On-device preview processor.
  - Export renderer.
  - Metadata sanitizer.

SwiftUI state should stay feature-local when possible. Shared services can be injected through the environment, while project and job records should use explicit models that can be tested without views.

## 4. Restoration Pipeline Stages

The README defines the MVP pipeline as:

1. Denoise.
2. Deblur.
3. Upscale.
4. Color and contrast balancing.

For v1, model this as an ordered pipeline with explicit stage outputs:

### 4.1 Prepare

- Normalize orientation.
- Generate preview-sized derivative.
- Validate dimensions and format.
- Store immutable original working copy.
- Strip or retain metadata based on mode and export settings.

### 4.2 Denoise

- Reduce sensor noise, scan grain, and compression noise.
- Use conservative defaults to avoid waxy skin or lost texture.
- Produce preview and final-stage metadata describing strength.

### 4.3 Deblur

- Improve softness from motion, focus, or old capture devices.
- Avoid over-sharpening halos.
- Preserve faces and edges where possible.

### 4.4 Upscale

- Generate 2x or 4x output when requested.
- Keep Auto Restore baseline separate from user-selected final upscale.
- Treat 4x as cloud-only unless an on-device model proves quality and latency are acceptable.

### 4.5 Color Balance

- Correct white balance.
- Recover faded colors.
- Adjust tone, contrast, and exposure.
- Store user color adjustments separately from the baseline restored result.

### 4.6 Finalize

- Compose final output at requested scale.
- Apply color adjustments.
- Sanitize metadata if requested.
- Write export-ready file.

## 5. Job Flow

### 5.1 Local Import Flow

1. User selects an image from Photos or Files.
2. App requests permission only when needed.
3. App copies the source image into the local app container.
4. App creates a `Project` record.
5. App generates a preview derivative.
6. App shows Import Preview.

### 5.2 Cloud High Quality Flow

1. User starts Auto Restore in Cloud High Quality mode.
2. App creates a `RestoreJob` with status `queued`.
3. App uploads the local working copy to secure object storage through a short-lived upload URL.
4. Backend creates a pipeline job and returns a job ID.
5. App polls job status or receives push/websocket-style updates if later added.
6. Backend runs denoise, deblur, baseline restore, optional upscale, and color balancing.
7. Backend writes output files to object storage.
8. App downloads preview and final references through short-lived download URLs.
9. App stores restored outputs locally and updates the project.

### 5.3 Private On-Device Preview Flow

1. User starts Auto Restore in Private On-Device Preview mode.
2. App runs lightweight local preparation and enhancement.
3. App produces a preview-quality restored result.
4. If the user requests unsupported quality or 4x upscale, app offers Cloud High Quality.
5. No original image leaves the device unless the user switches modes.

For MVP, this mode can be quality-limited. It should be honest: call it a private preview if final cloud-grade restoration is not available locally.

### 5.4 Editor Adjustment Flow

1. User opens restored output.
2. App tracks selected view mode, compare slider value, upscale choice, and color adjustments.
3. Lightweight color adjustments run locally against a preview.
4. Upscale changes may create a new restore job.
5. Final export uses the latest successful restored output plus local adjustment settings.

### 5.5 Export Flow

1. User chooses export destination and format.
2. App prepares final render from the best available output.
3. App applies metadata policy.
4. App writes to Photos, Files, or share sheet temp location.
5. App records export success locally.

## 6. Data Model

### Project

- `id`
- `createdAt`
- `updatedAt`
- `sourceFileURL`
- `previewFileURL`
- `currentOutputFileURL`
- `baselineRestoredFileURL`
- `selectedScale`
- `colorAdjustmentState`
- `privacyMode`
- `status`

### RestoreJob

- `id`
- `projectId`
- `mode`
- `status`
- `stage`
- `progress`
- `remoteJobId`
- `inputObjectKey`
- `outputObjectKey`
- `errorCode`
- `createdAt`
- `completedAt`

### PipelineStage

- `prepare`
- `upload`
- `denoise`
- `deblur`
- `upscale`
- `colorBalance`
- `finalize`
- `download`

### PrivacyMode

- `privateOnDevicePreview`
- `cloudHighQuality`

## 7. Storage

### On Device

Use the app container for project files:

- Originals copied from Photos or Files.
- Preview derivatives.
- Restored outputs.
- Export temp files.
- Local project database.

Recommended local storage:

- FileManager for image binaries.
- SwiftData or SQLite for project/job metadata.
- Keychain only for secrets or authenticated tokens if accounts are added later.

Rules:

- Never mutate the user's original Photos asset.
- Keep a local working copy per project.
- Delete temp export files after share completion when safe.
- Provide a future "Delete Local Projects" setting.

### Cloud

Use object storage for:

- Uploaded originals.
- Intermediate outputs if needed.
- Final restored outputs.
- Preview outputs.

Use a database for:

- Job status.
- Pipeline stage transitions.
- Object keys.
- Retention expiry.
- Error records.

Rules:

- Use short-lived signed URLs for upload and download.
- Encrypt objects at rest.
- Keep default retention short for MVP.
- Delete originals and outputs automatically after retention expiry.
- Avoid storing user photo content in logs.

## 8. Privacy Modes

### Private On-Device Preview

Intent: Give privacy-sensitive users a no-upload path.

Device responsibilities:

- Import.
- Orientation normalization.
- Preview generation.
- Lightweight denoise/color adjustments when supported.
- Before/after compare.
- Export of local output.

Limitations:

- May not support 4x.
- May not match cloud restoration quality.
- May be slower or unavailable on older devices depending on model size.

### Cloud High Quality

Intent: Provide the best restoration quality for MVP.

Device responsibilities:

- Import and local copy.
- User consent through mode selection.
- Upload orchestration.
- Progress display.
- Preview, compare, local adjustments, and export.

Cloud responsibilities:

- Heavy denoise/deblur models.
- Super-resolution.
- Color restoration model or high-quality color balancing.
- Final image generation.
- Short-retention storage.

## 9. On-Device Versus Cloud for V1

| Capability | V1 Location | Reason |
| --- | --- | --- |
| Photos/Files import | On device | Native iOS permissions and local asset access. |
| Local working copy | On device | Protect original asset and enable retry/export. |
| Preview derivative | On device | Fast UI and reduced memory pressure. |
| Orientation normalization | On device | Required before preview and upload. |
| Auto Restore high-quality denoise/deblur | Cloud | Model size and quality requirements. |
| 2x upscale | Cloud by default | Better quality and simpler first release. |
| 4x upscale | Cloud only | Compute-heavy and quality-sensitive. |
| Basic color sliders | On device | Fast interactive feedback. |
| Auto Color | Cloud baseline, device adjustment preview | Cloud can produce baseline; device can tune visible output. |
| Before/after compare | On device | Pure UI interaction with local image files. |
| Export rendering | On device | Integrates with Photos, Files, and share sheet. |
| Metadata stripping | On device at export | User-visible privacy control. |
| Job orchestration | Device plus cloud API | Device owns UX, cloud owns pipeline work. |

## 10. API Surface for First Cloud Version

Use a small backend API and avoid exposing model-specific details to the app.

### Create Restore Job

`POST /v1/restore-jobs`

Request:

- Processing mode.
- Requested scale.
- Client image metadata.
- Privacy/retention preference.

Response:

- Restore job ID.
- Signed upload URL.
- Upload object key.

### Start Restore Job

`POST /v1/restore-jobs/{id}/start`

Request:

- Uploaded object key.
- Pipeline options.

Response:

- Job status.

### Get Restore Job

`GET /v1/restore-jobs/{id}`

Response:

- Status.
- Current stage.
- Progress.
- Error code when failed.
- Signed download URLs when complete.

### Cancel Restore Job

`POST /v1/restore-jobs/{id}/cancel`

Response:

- Cancellation status.

## 11. Failure Handling

The app should treat failures as recoverable whenever possible.

- Import failure: show reason and allow reselect.
- Permission denied: route to iOS Settings.
- Upload failure: retry upload without reimporting.
- Processing failure: retry job or switch mode if available.
- Download failure: retry download while preserving completed job ID.
- Export failure: retry export and preserve final render.
- Low-memory preview failure: fall back to smaller preview derivative.

## 12. Observability

Track product and reliability metrics without storing image content:

- Time from launch to import.
- Time from import to first restored preview.
- Job stage durations.
- Failure rates by stage and mode.
- Export completion rate.
- Selected scale.
- Privacy mode selection.
- User-rated quality score when later added.

Avoid:

- Logging original filenames when they may contain personal information.
- Logging image pixels, thumbnails, embeddings, or OCR-like content.
- Retaining cloud objects beyond stated retention.

## 13. Security and Privacy Requirements

- All cloud traffic must use HTTPS.
- Object uploads and downloads must use short-lived signed URLs.
- Cloud storage must be encrypted at rest.
- The app must make upload behavior explicit before Cloud High Quality processing starts.
- Metadata stripping must include GPS/location metadata.
- Backend logs must not include image content.
- Job IDs should be unguessable.
- Retention deletion should be automated and observable.

## 14. First Implementation Sequence

1. Create native SwiftUI app shell and local project model.
2. Implement Photos/Files import and immutable local working copy.
3. Build import preview and processing mode selector.
4. Stub restore job service with local mocked states.
5. Build editor canvas with Original, Restored, and Compare modes.
6. Add local color adjustment preview.
7. Implement export to Photos, Files, and share sheet.
8. Connect cloud job API for Auto Restore and upscale.
9. Add privacy retention controls and metadata stripping.
10. Run end-to-end visual and device verification.

## 15. Open Technical Decisions

- Minimum iOS version and whether to require iOS 17+ Observation/SwiftData.
- Backend provider and GPU inference host.
- Specific restoration/upscale models for MVP.
- Maximum upload size and supported color profiles.
- Whether cloud progress is polling-only or uses a realtime channel.
- Exact cloud retention window.
- Whether local project records should be automatically purged.
- App Store privacy nutrition label details once vendors are selected.

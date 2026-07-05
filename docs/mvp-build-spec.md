# RestoreAI MVP Build Spec

Status: Draft for first Expo iOS release  
Source: Current README product blueprint  
Platform decision: Expo managed app targeting iOS first. Native SwiftUI is out of scope for the first release unless the Expo plan changes.

## 1. Product Goal

RestoreAI helps everyday users restore damaged, blurry, low-resolution, faded, or poorly lit photos with a simple guided workflow and trustworthy before/after validation.

The MVP should prove one complete value loop:

1. Import a single photo.
2. Generate an automatic restoration.
3. Let the user tune upscale and color correction.
4. Compare original and restored output.
5. Export or share the final image.

## 2. First Release Scope

### In Scope

- Expo iOS app shell using Expo Router and React Native.
- Single-image import from Photos or Files.
- Preview-safe image normalization after import.
- Auto Restore action that runs the default restoration pipeline.
- Upscale control with 1x preview baseline, 2x, and 4x final output options.
- Basic color correction controls for Auto, Warm/Cool white balance, exposure, contrast, and fade recovery.
- Before/after compare with draggable split slider and full original/restored toggles.
- Export to Photos, Files, and iOS share sheet.
- Job progress, success, failure, and retry states.
- Privacy mode choice before processing: Private On-Device Preview or Cloud High Quality.
- Local project record for recent restored images, without account creation.

### Out of Scope

- User accounts, teams, collaboration, or cloud project libraries.
- Batch processing.
- Manual retouch brush.
- Damage inpainting for torn or missing regions.
- B&W colorization.
- Preset library beyond the default automatic pipeline.
- Public API, SDK, or web dashboard.
- Android or Expo implementation.
- Subscription, paywall, or purchase flow.

## 3. Target Users

- Families and individuals restoring old family photos for saving or sharing.
- Photographers improving low-quality archive images.
- Archivists or preservation-minded users testing a privacy-conscious mobile workflow.
- Content creators enhancing older images for social/video use.

## 4. Primary User Flow

1. Launch
   - User lands on the Restore screen.
   - A clear import action is visible immediately.

2. Import
   - User selects a photo from Photos or Files.
   - App validates image type, size, and availability.
   - App creates a local working copy and shows the original preview.

3. Choose Processing Mode
   - User chooses Private On-Device Preview or Cloud High Quality.
   - App explains the practical tradeoff in one short line.
   - Default is Cloud High Quality for MVP quality, with on-device preview available when supported.

4. Auto Restore
   - User taps Auto Restore.
   - App starts a restore job and shows progress by stage.
   - App displays a restored preview when complete.

5. Refine
   - User can choose 2x or 4x upscale.
   - User can apply Auto Color or adjust basic color controls.
   - App updates the preview without losing the original.

6. Compare
   - User checks the result with a before/after split slider.
   - User can toggle Original, Restored, and Compare views.

7. Export
   - User chooses Save to Photos, Save to Files, or Share.
   - App writes a final image and confirms completion.
   - User can return to the restored item from Recents.

## 5. Core Screens

### 5.1 Restore Home

Purpose: Start a new restore and show recent local work.

Core elements:

- App title and concise restoration action.
- Primary import button.
- Recent restores list/grid when local projects exist.
- Empty state for first-time users.
- Privacy/settings access.

States:

- Empty.
- Recent items available.
- Photos permission needed.
- Import error.

### 5.2 Image Import and Preview

Purpose: Confirm the chosen image before processing.

Core elements:

- Large original image preview.
- Image metadata summary: approximate dimensions and file size when available.
- Processing mode selector.
- Auto Restore primary action.
- Replace image secondary action.

States:

- Loading imported image.
- Unsupported format.
- Image too large for current mode.
- Local copy failed.

### 5.3 Restore Job Progress

Purpose: Keep the user oriented while processing.

Core elements:

- Image thumbnail or blurred preview.
- Stage progress labels: Preparing, Denoising, Deblurring, Upscaling, Color Balancing, Finalizing.
- Cancel action.
- Retry action after failure.

States:

- Queued.
- Uploading when cloud mode is selected.
- Processing.
- Downloading final output.
- Failed with recoverable message.
- Cancelled.

### 5.4 Editor and Compare

Purpose: Review and tune the restoration result.

Core elements:

- Main image canvas.
- Segmented view mode: Original, Restored, Compare.
- Compare split slider.
- Tool tabs or compact controls for Restore, Upscale, Color.
- Undo to Auto result for local adjustments.
- Export primary action.

States:

- Restored preview ready.
- Preview regenerating.
- Adjustment failed.
- Low-memory preview fallback.

### 5.5 Upscale Controls

Purpose: Choose output scale without burying the user in technical settings.

Core elements:

- Scale choices: Original, 2x, 4x.
- Estimated output dimensions.
- Note when 4x requires cloud mode.
- Apply or regenerate action only when needed.

States:

- 2x available.
- 4x available.
- 4x requires cloud.
- Upscale job in progress.
- Upscale failed.

### 5.6 Color Correction Controls

Purpose: Fix faded color and tone with simple controls.

Core elements:

- Auto Color toggle/action.
- White balance choices: Neutral, Warmer, Cooler.
- Sliders for Exposure, Contrast, Fade Recovery.
- Reset color adjustments.

States:

- Auto applied.
- Manual adjustments active.
- Preview updating.
- Reset to restored baseline.

### 5.7 Export Sheet

Purpose: Save or share the restored image.

Core elements:

- Export destination: Photos, Files, Share.
- Format choices for MVP: JPEG and PNG.
- Quality selector for JPEG: Standard and High.
- Metadata option: Keep basic metadata or strip metadata.
- Final output dimensions.

States:

- Exporting.
- Saved.
- Permission denied.
- Export failed.

## 6. Functional Requirements

### Upload / Import

- App must import one image at a time from Photos or Files.
- App must support JPEG and PNG for MVP.
- App should preserve the original image unchanged.
- App must create a local working copy before processing.
- App must reject unsupported files with a clear error.
- App must show a preview before any processing starts.

Acceptance criteria:

- Given a valid JPEG from Photos, when the user imports it, then the preview screen displays the image and enables Auto Restore.
- Given a valid PNG from Files, when the user imports it, then the preview screen displays the image and enables Auto Restore.
- Given an unsupported file, when the user selects it, then the app shows a recoverable unsupported-format message.
- Given Photos permission is denied, when the user attempts Photos import, then the app shows a route to iOS Settings.
- Given cloud mode is selected, when processing starts, then the uploaded payload uses the local working copy, not the original asset reference.

### Auto Restore

- App must run a default pipeline for denoise, deblur, upscale baseline, and color/contrast balance.
- App must display clear progress while processing.
- App must produce a restored preview that can be compared against the original.
- App must support retry after recoverable failure.
- App must keep the original and restored result linked in a local project record.

Acceptance criteria:

- Given an imported image, when the user taps Auto Restore, then the app creates a job and shows progress within one second.
- Given a successful job, when processing completes, then the editor opens with the restored result visible.
- Given a failed job, when the service returns a recoverable error, then the app shows Retry and keeps the original import.
- Given the user cancels a running job, then processing stops where supported and no partial result replaces the current output.
- Given the restore result is generated, then Original, Restored, and Compare modes are available.

### Upscale

- App must provide 2x and 4x upscale options.
- App must show expected output dimensions before export.
- 2x should be available in the default cloud pipeline for MVP.
- 4x may require cloud processing in the first release.
- App must avoid claiming final dimensions until the output exists.

Acceptance criteria:

- Given a restored image, when the user selects 2x, then the app queues or applies a 2x output and updates the dimensions when complete.
- Given a restored image, when the user selects 4x in cloud mode, then the app queues a 4x upscale job.
- Given the user selects 4x in on-device mode when unavailable, then the app explains that Cloud High Quality is required.
- Given upscale fails, then the app keeps the last successful restored output.
- Given the user exports after upscale, then the exported file matches the selected scale.

### Color Correction

- App must support automatic color correction.
- App must support basic manual tuning for white balance, exposure, contrast, and fade recovery.
- App must allow reset to the Auto Restore baseline.
- App should update preview interactively for lightweight adjustments.

Acceptance criteria:

- Given a restored image, when Auto Color is applied, then the preview updates and marks Auto Color as active.
- Given a restored image, when the user changes exposure, then the preview updates without changing the original.
- Given multiple color adjustments, when Reset is tapped, then the output returns to the Auto Restore baseline.
- Given an adjustment fails, then the UI returns to the last successful preview.
- Given the user exports after color correction, then the exported file includes the visible color adjustments.

### Before/After Compare

- App must provide Original, Restored, and Compare view modes.
- Compare mode must include a draggable split slider.
- Compare should remain usable on small iPhone screens.
- The comparison must use the same crop/zoom framing for both images.

Acceptance criteria:

- Given a restored image, when Compare mode opens, then the original and restored images align in the same frame.
- Given the user drags the split slider, then the reveal boundary follows the drag without visible layout jump.
- Given the user pinches or pans the image, then both original and restored layers stay synchronized.
- Given the user switches to Original, then only the original image is visible.
- Given the user switches to Restored, then only the restored image is visible.

### Export

- App must export JPEG and PNG in the first release.
- App must save to Photos, save to Files, and open the iOS share sheet.
- App must confirm success or show a recoverable error.
- App must allow metadata stripping.
- App must not export a lower-resolution preview when a final render exists.

Acceptance criteria:

- Given a final restored image, when the user saves to Photos, then the image appears in the user's photo library after permission is granted.
- Given a final restored image, when the user saves to Files, then the file picker writes the selected JPEG or PNG.
- Given a final restored image, when the user taps Share, then the iOS share sheet receives the final export file.
- Given metadata stripping is enabled, when export completes, then the output does not include original location metadata.
- Given export fails, then the app keeps the final image available and shows a retry path.

## 7. Non-Functional Requirements

- Time to first visible imported preview should be under 2 seconds for standard phone photos on supported devices.
- Restore job progress should appear within 1 second of starting.
- Preview generation target is under 3 seconds when using a cached or reduced preview.
- Final cloud restore may take longer, but the UI must remain responsive.
- App must never mutate the original photo asset.
- All cloud transport must use HTTPS.
- Cloud originals and outputs should have short retention by default for MVP.
- App must expose clear privacy mode language before upload.
- The editor must work in portrait orientation for MVP.
- Dynamic Type should be supported for core controls and error states.

## 8. MVP Release Gates

- A user can complete import to export in one uninterrupted session.
- The app handles permission denial, failed import, failed restore, failed upscale, and failed export.
- Before/after compare is stable and visually aligned.
- Exported images match the chosen format, scale, and visible adjustments.
- Privacy mode behavior is explicit and testable.
- No account is required to complete the MVP flow.
- The first release is implemented as an Expo iOS app, with native builds handled by EAS.

## 9. Open Product Decisions

- Minimum iOS version for first release.
- Exact maximum input size for cloud and on-device modes.
- Whether 1x Auto Restore should include a light upscale internally or preserve original dimensions until the user selects 2x/4x.
- Whether scratch/dust removal is included in Auto Restore MVP or deferred to Phase 2 as a visible control.
- Cloud retention duration for originals and outputs.
- Export watermark policy, if any.


import type { Account, AppPreferences, ToolType } from "../types";

const PRO_TOOLS = new Set<ToolType>(["upscale", "extend", "recolor"]);
const PRO_EXPORT_FORMATS = new Set<AppPreferences["exportFormat"]>(["PNG", "TIFF"]);

// Client gates keep the local MVP honest. Real enforcement must happen on the
// processing API and billing webhook/entitlement backend.
export function isProPlan(account: Account) {
  return account.plan === "Archive Pro";
}

export function canUseTool(account: Account, tool: ToolType) {
  return !PRO_TOOLS.has(tool) || isProPlan(account);
}

export function canUseExportFormat(account: Account, format: AppPreferences["exportFormat"]) {
  return !PRO_EXPORT_FORMATS.has(format) || isProPlan(account);
}

export function getToolEntitlementMessage(tool: ToolType) {
  if (tool === "upscale") return "Upscale is included with Archive Pro.";
  if (tool === "extend") return "Frame extension is included with Archive Pro.";
  if (tool === "recolor") return "Recolor is included with Archive Pro.";
  return "";
}

export function getExportEntitlementMessage(format: AppPreferences["exportFormat"]) {
  if (format === "PNG") return "PNG exports are included with Archive Pro.";
  if (format === "TIFF") return "TIFF archive exports are included with Archive Pro.";
  return "";
}

export function getAllowedExportFormat(account: Account, format: AppPreferences["exportFormat"]) {
  return canUseExportFormat(account, format) ? format : "JPEG";
}

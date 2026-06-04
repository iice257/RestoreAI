import { appConfig } from "../config/env";
import type { EditStage, ToolType } from "../types";

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

export type ProcessingJobStatus = "queued" | "processing" | "succeeded" | "failed" | "canceled";

export type CreateProcessingJobInput = {
  projectId: string;
  sourceStageId: string;
  tool: ToolType;
  settings: EditStage["settings"];
  deleteRemoteAfterProcessing: boolean;
};

export type ProcessingJobDto = {
  id: string;
  projectId: string;
  status: ProcessingJobStatus;
  outputStageId?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type EntitlementDto = {
  plan: "Free" | "Archive Pro";
  creditsUsed: number;
  creditsTotal: number;
  renewsInDays: number;
};

type ApiClientOptions = {
  baseUrl?: string;
  getAccessToken?: () => Promise<string | undefined>;
  timeoutMs?: number;
};

export class RestoreAiApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "RestoreAiApiError";
  }
}

export class RestoreAiApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: () => Promise<string | undefined>;
  private readonly timeoutMs: number;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? appConfig.restoreAiApiUrl);
    this.getAccessToken = options.getAccessToken;
    this.timeoutMs = options.timeoutMs ?? 20000;
  }

  createProcessingJob(input: CreateProcessingJobInput) {
    return this.request<ProcessingJobDto>("/processing-jobs", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  getProcessingJob(id: string) {
    return this.request<ProcessingJobDto>(`/processing-jobs/${encodeURIComponent(id)}`);
  }

  deleteRemoteJob(id: string) {
    return this.request<{ deleted: boolean; deletedAt?: string }>(`/processing-jobs/${encodeURIComponent(id)}/remote-copy`, {
      method: "DELETE",
    });
  }

  getEntitlement() {
    return this.request<EntitlementDto>("/billing/entitlement");
  }

  private async request<T>(path: string, init: FetchInit = {}): Promise<T> {
    if (!this.baseUrl) {
      throw new RestoreAiApiError("RestoreAI API URL is not configured.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const token = this.getAccessToken ? await this.getAccessToken() : undefined;
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init.headers ?? {}),
        },
      });

      const payload = await readPayload(response);
      if (!response.ok) {
        throw new RestoreAiApiError(`RestoreAI API request failed with ${response.status}.`, response.status, payload);
      }

      return payload as T;
    } catch (error) {
      if (error instanceof RestoreAiApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new RestoreAiApiError("RestoreAI API request timed out.");
      }
      throw new RestoreAiApiError(error instanceof Error ? error.message : "RestoreAI API request failed.");
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function readPayload(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function normalizeBaseUrl(value?: string) {
  if (!value) return "";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}


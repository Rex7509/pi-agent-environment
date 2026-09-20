/**
 * Antigravity Statusline Extension
 *
 * Displays live Google Antigravity quota usage and reset countdowns in the statusline
 * (footer) matching the OpenAI Codex format:
 *   antigravity 100% ↻ 5h 94% ↻ 2d20h
 *   antigravity claude 100% ↻ 5h 100% ↻ 7d
 */

import type { ExtensionAPI, ExtensionContext, ModelSelectEvent } from "@earendil-works/pi-coding-agent";

const STATUS_KEY = "antigravity-usage";
const PROVIDER_ID = "antigravity";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const COUNTDOWN_INTERVAL_MS = 60 * 1000; // 1 minute
const REFRESH_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

interface QuotaBucket {
  bucketId?: string;
  displayName?: string;
  window?: string;
  resetTime?: string;
  remainingFraction?: number;
}

interface QuotaGroup {
  displayName?: string;
  buckets?: QuotaBucket[];
}

interface QuotaData {
  groups?: QuotaGroup[];
}

interface ModelQuotaRow {
  modelId: string;
  remainingFraction?: number;
  resetTime?: string;
}

interface AvailableModelsData {
  models?: Record<string, { quotaInfo?: { remainingFraction?: number; resetTime?: string } }>;
}

function formatResetCountdown(resetTime?: string, now = Date.now()): string {
  if (!resetTime) return "";
  const ts = Date.parse(resetTime);
  if (!Number.isFinite(ts)) return "";
  const delta = ts - now;
  if (delta <= 0) return "now";
  const totalMin = Math.round(delta / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d${hours > 0 ? `${hours}h` : ""}`;
  if (hours > 0) return `${hours}h${mins > 0 ? `${mins}m` : ""}`;
  return `${mins}m`;
}

function formatStatusline(
  quota: QuotaData | null,
  modelsQuota: ModelQuotaRow[] | null,
  modelId?: string,
  now = Date.now(),
): string | undefined {
  const isClaudeOrGpt = !!modelId && /claude|gpt/i.test(modelId);
  const prefix = isClaudeOrGpt ? "antigravity claude" : "antigravity";

  // Match quota groups (5h + weekly)
  if (quota?.groups && quota.groups.length > 0) {
    const matchedGroup =
      quota.groups.find((g) =>
        isClaudeOrGpt ? /claude|gpt|3p/i.test(g.displayName || "") : /gemini/i.test(g.displayName || ""),
      ) ?? quota.groups[0];

    if (matchedGroup?.buckets && matchedGroup.buckets.length > 0) {
      // Sort 5h first, then weekly
      const buckets = [...matchedGroup.buckets].sort((a, b) => {
        const a5 = /5h/i.test(a.window || a.bucketId || "") ? 0 : 1;
        const b5 = /5h/i.test(b.window || b.bucketId || "") ? 0 : 1;
        return a5 - b5;
      });

      const parts: string[] = [prefix];
      for (const bucket of buckets) {
        const pct = `${Math.round((bucket.remainingFraction ?? 0) * 100)}%`;
        const reset = formatResetCountdown(bucket.resetTime, now);
        parts.push(`${pct}${reset ? ` ↻ ${reset}` : ""}`);
      }
      return parts.join(" ");
    }
  }

  // Fallback: per-model quota
  if (modelsQuota && modelsQuota.length > 0) {
    const matched =
      (modelId ? modelsQuota.find((m) => m.modelId === modelId || modelId.includes(m.modelId)) : undefined) ??
      modelsQuota[0];

    if (matched && matched.remainingFraction !== undefined) {
      const pct = `${Math.round(matched.remainingFraction * 100)}%`;
      const reset = formatResetCountdown(matched.resetTime, now);
      return `${prefix} ${pct}${reset ? ` ↻ ${reset}` : ""}`;
    }
  }

  return undefined;
}

export default function (pi: ExtensionAPI): void {
  let lastQuota: QuotaData | null = null;
  let lastModelsQuota: ModelQuotaRow[] | null = null;
  let lastFetchedAt = 0;
  let isFetching = false;
  let countdownTimer: ReturnType<typeof setInterval> | undefined;
  let refreshTimer: ReturnType<typeof setInterval> | undefined;
  let activeModel: { provider: string; id: string } | undefined;

  const clearTimers = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = undefined;
    }
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = undefined;
    }
  };

  async function resolveCredentials(ctx: ExtensionContext): Promise<{ token: string; projectId?: string } | null> {
    try {
      const apiKeyRaw = await ctx.modelRegistry.getApiKeyForProvider(PROVIDER_ID);
      if (!apiKeyRaw) return null;
      try {
        const parsed = JSON.parse(apiKeyRaw);
        if (parsed.token) return { token: parsed.token, projectId: parsed.projectId };
      } catch {
        // bare token fallback
        return { token: apiKeyRaw };
      }
    } catch {
      return null;
    }
    return null;
  }

  async function fetchQuotaData(token: string, projectId?: string): Promise<QuotaData | null> {
    try {
      const res = await fetch("https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent":
            "antigravity/cli/1.1.23 (aidev_client; os_type=linux; arch=amd64; cl=974125021; auth_method=consumer)",
        },
        body: JSON.stringify({ project: projectId || undefined }),
      });
      if (res.ok) {
        return (await res.json()) as QuotaData;
      }
    } catch {
      // ignore
    }
    return null;
  }

  async function fetchModelsQuotaData(token: string, projectId?: string): Promise<ModelQuotaRow[] | null> {
    try {
      const res = await fetch("https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent":
            "antigravity/cli/1.1.23 (aidev_client; os_type=linux; arch=amd64; cl=974125021; auth_method=consumer)",
        },
        body: JSON.stringify({ project: projectId || undefined }),
      });
      if (res.ok) {
        const data = (await res.json()) as AvailableModelsData;
        const rows: ModelQuotaRow[] = [];
        for (const [modelId, info] of Object.entries(data.models || {})) {
          if (info?.quotaInfo) {
            rows.push({
              modelId,
              remainingFraction: info.quotaInfo.remainingFraction,
              resetTime: info.quotaInfo.resetTime,
            });
          }
        }
        return rows;
      }
    } catch {
      // ignore
    }
    return null;
  }

  async function updateStatus(ctx: ExtensionContext, forceFetch = false): Promise<void> {
    if (!ctx.hasUI) return;

    const current = activeModel ?? ctx.model;
    if (!current || current.provider !== PROVIDER_ID) {
      ctx.ui.setStatus(STATUS_KEY, undefined);
      clearTimers();
      return;
    }

    const now = Date.now();
    const shouldFetch = forceFetch || !lastQuota || now - lastFetchedAt > CACHE_TTL_MS;

    if (shouldFetch && !isFetching) {
      isFetching = true;
      try {
        const creds = await resolveCredentials(ctx);
        if (creds?.token) {
          const [quota, models] = await Promise.all([
            fetchQuotaData(creds.token, creds.projectId),
            fetchModelsQuotaData(creds.token, creds.projectId),
          ]);
          if (quota) lastQuota = quota;
          if (models) lastModelsQuota = models;
          lastFetchedAt = Date.now();
        }
      } catch {
        // preserve last known
      } finally {
        isFetching = false;
      }
    }

    const text = formatStatusline(lastQuota, lastModelsQuota, current.id, Date.now());
    ctx.ui.setStatus(STATUS_KEY, text);

    // Ensure timers are running while on Antigravity
    if (!countdownTimer) {
      countdownTimer = setInterval(() => {
        const m = activeModel ?? ctx.model;
        if (m?.provider === PROVIDER_ID && (lastQuota || lastModelsQuota)) {
          const t = formatStatusline(lastQuota, lastModelsQuota, m.id, Date.now());
          ctx.ui.setStatus(STATUS_KEY, t);
        } else {
          clearTimers();
          ctx.ui.setStatus(STATUS_KEY, undefined);
        }
      }, COUNTDOWN_INTERVAL_MS);
      countdownTimer.unref?.();
    }

    if (!refreshTimer) {
      refreshTimer = setInterval(() => {
        void updateStatus(ctx, true);
      }, REFRESH_INTERVAL_MS);
      refreshTimer.unref?.();
    }
  }

  pi.on("session_start", async (_event, ctx) => {
    activeModel = ctx.model ? { provider: ctx.model.provider, id: ctx.model.id } : undefined;
    await updateStatus(ctx, true);
  });

  pi.on("model_select", async (event: ModelSelectEvent, ctx) => {
    activeModel = event.model ? { provider: event.model.provider, id: event.model.id } : undefined;
    await updateStatus(ctx, false);
  });

  pi.on("turn_end", async (_event, ctx) => {
    if (activeModel?.provider === PROVIDER_ID) {
      // Re-fetch quota in background after turn completes to reflect consumed tokens
      void updateStatus(ctx, true);
    }
  });

  pi.on("session_shutdown", () => {
    clearTimers();
  });
}

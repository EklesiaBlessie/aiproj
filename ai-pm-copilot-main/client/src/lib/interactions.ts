import { toast } from 'sonner';
import api from './trpc';

/**
 * ────────────────────────────────────────────────────────────────────────────
 * Shared interaction helpers
 * ────────────────────────────────────────────────────────────────────────────
 */

export const showErrorToast = (message: string) => {
  toast.error('Error', {
    description: message,
  });
};

export const showInfoToast = (
  title: string,
  message: string,
) => {
  toast.info(title, {
    description: message,
  });
};

/**
 * Report a feature that cannot work yet.
 */
export const showUnavailable = (
  feature: string,
  blockedOn: string,
) => {
  toast.warning(`${feature} unavailable`, {
    description: blockedOn,
  });
};

/**
 * Message shown when the AI analysis service is unavailable.
 */
export const AI_UNAVAILABLE_MESSAGE =
  'AI suggestions unavailable — the analysis service is not yet connected.';

/* ────────────────────────────────────────────────────────────────────────────
 * Analysis
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface AnalysisResult {
  /**
   * True only when a real NLP service answered.
   */
  live: boolean;

  /**
   * Analysis response data.
   */
  data: Record<string, unknown> | null;

  /**
   * Present when the request failed.
   */
  error?: string;
}

/**
 * Call the backend analysis endpoint.
 */
export async function requestAnalysis(
  text: string,
  timeoutMs = 8000,
): Promise<AnalysisResult> {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    const response = await api.post(
      '/analyze',
      {
        text,
      },
      {
        signal: controller.signal,
      },
    );

    const body = response.data ?? {};

    /**
     * Backend can return mock=true when
     * the real analysis service is unavailable.
     */
    if (body.mock === true) {
      return {
        live: false,
        data: body.data ?? null,
        error: AI_UNAVAILABLE_MESSAGE,
      };
    }

    return {
      live: true,
      data: body.data ?? null,
    };
  } catch (err: any) {
    const timedOut =
      err?.code === 'ERR_CANCELED' ||
      err?.name === 'CanceledError';

    const message = timedOut
      ? `Analysis service did not respond within ${Math.round(
          timeoutMs / 1000,
        )}s.`
      : err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Analysis request failed';

    return {
      live: false,
      data: null,
      error: message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * File download
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Trigger a browser download of a text file.
 */
export function downloadTextFile(
  filename: string,
  contents: string,
  mime = 'text/markdown',
) {
  const blob = new Blob(
    [contents],
    {
      type: `${mime};charset=utf-8`,
    },
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Clipboard
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Copy text to the clipboard.
 */
export async function copyToClipboard(
  text: string,
  label = 'Copied to clipboard',
): Promise<boolean> {
  try {
    if (!navigator.clipboard) {
      throw new Error(
        'Clipboard API unavailable in this browser context',
      );
    }

    await navigator.clipboard.writeText(text);

    toast.success(label);

    return true;
  } catch (err: any) {
    showErrorToast(
      err?.message ||
        'Could not access the clipboard',
    );

    return false;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Copilot
 * ──────────────────────────────────────────────────────────────────────────── */

export interface CopilotResult {
  live: boolean;

  /**
   * Human-readable answer returned by Copilot.
   */
  answer: string | null;

  /**
   * Complete Copilot response.
   */
  data: Record<string, unknown> | null;

  /**
   * Error message when the request fails.
   */
  error?: string;
}

/**
 * Central AI Product Manager Copilot request.
 *
 * IMPORTANT:
 *
 * This MUST call /copilot, not /ask.
 *
 * /copilot performs intent routing:
 *
 * PRD question
 *      ↓
 * PRDService
 *
 * RICE / ICE / MoSCoW question
 *      ↓
 * PrioritizationService
 *
 * Product analysis question
 *      ↓
 * AIService / RAG
 */
export async function requestCopilot(
  question: string,
  sessionId?: string,
  timeoutMs = 15000,
): Promise<CopilotResult> {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    const AI_SERVICE_URL =
  import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:8002';

const response = await fetch(
  `${AI_SERVICE_URL}/copilot`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          question,
          session_id: sessionId,
        }),

        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        `AI service returned ${response.status}: ${errorText}`,
      );
    }

    const result =
      await response.json();

    return {
      live: true,

      answer:
        typeof result.answer === 'string'
          ? result.answer
          : null,

      data: result,
    };
  } catch (err: any) {
    const timedOut =
      err?.name === 'AbortError';

    return {
      live: false,

      answer: null,

      data: null,

      error: timedOut
        ? `AI service did not respond within ${Math.round(
            timeoutMs / 1000,
          )}s.`
        : err?.message ||
          'AI request failed',
    };
  } finally {
    clearTimeout(timer);
  }
}
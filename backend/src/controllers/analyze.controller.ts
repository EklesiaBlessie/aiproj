import { Request, Response, NextFunction } from "express";

/**
 * POST /api/analyze
 *
 * Receives:
 * { text: string }
 *
 * Sends to FastAPI:
 * { question: string }
 */
export async function analyzeFeedback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { text } = req.body;

    const defaultMockAnalysis = {
      category: "Food",
      sentiment: "Positive",
      theme: "Quality",
      pain_point: "None identified",
      priority: "Medium",
      recommendation:
        "No immediate action required. Continue monitoring for trends.",
    };

    try {
      const fastApiUrl = process.env.FASTAPI_URL?.trim();

      if (!fastApiUrl) {
        throw new Error("FASTAPI_URL is not configured");
      }

      const response = await fetch(`${fastApiUrl}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: text }),
      });

      if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(
          `FastAPI responded with status ${response.status}: ${errorBody}`,
        );
      }

      const result = await response.json();

      res.json({
        success: true,
        data: result,
        mock: false,
      });

      return;
    } catch (fetchError) {
      const isDev = process.env.NODE_ENV === 'development';
      const allowMockFallback = process.env.ALLOW_MOCK_FALLBACK === 'true';

      if (isDev && allowMockFallback) {
        console.warn(
          `/api/analyze called with ${text.length} chars. FastAPI service unreachable or request failed. Falling back to MOCK response.`,
          fetchError,
        );

        res.json({
          success: true,
          mock: true,
          data: defaultMockAnalysis,
        });

        return;
      }

      // Fail loudly by propagating the connection/request error
      throw new Error(`AI Analysis service is unreachable or returned an error: ${(fetchError as Error).message}`);
    }
  } catch (error) {
    next(error);
  }
}
import { Request, Response, NextFunction } from "express";

/**
 * POST /api/pipeline/upload
 *
 * Receives a CSV dataset file via multipart/form-data upload.
 * Proxies the file upload to the Python Feedback Pipeline service at PIPELINE_URL (port 8001).
 * Returns theme extraction, trend analysis, and feature clusters.
 */
export async function uploadPipelineDataset(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        error: "No CSV file provided in request. Field name should be 'file'.",
      });
      return;
    }

    const pipelineUrl = process.env.PIPELINE_URL?.trim() || "http://localhost:8001";

    // Construct multipart form data for Python pipeline endpoint
    const formData = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype || "text/csv" });
    formData.append("file", blob, file.originalname || "dataset.csv");

    console.log(`[Pipeline Controller] Proxying '${file.originalname}' (${file.size} bytes) to ${pipelineUrl}/upload...`);

    const response = await fetch(`${pipelineUrl}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pipeline microservice responded with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[Pipeline Controller] Upload error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process dataset via feedback pipeline microservice",
    });
  }
}

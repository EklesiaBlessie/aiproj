import { Router } from "express";
import multer from "multer";
import { uploadPipelineDataset } from "../controllers/pipeline.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max file size
  },
});

const router = Router();

/**
 * @openapi
 * /api/pipeline/upload:
 *   post:
 *     tags: [Pipeline]
 *     summary: Upload CSV dataset for end-to-end processing & Groq analysis
 *     description: >
 *       Proxies uploaded CSV to the Feedback Pipeline microservice on port 8001.
 *       Runs data validation, cleaning, normalization, feature engineering,
 *       Groq batch analysis, trend extraction, and feature clustering.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Full analysis completed successfully.
 *       500:
 *         description: Processing error or pipeline microservice offline.
 */
router.post("/pipeline/upload", upload.single("file"), uploadPipelineDataset);

export default router;

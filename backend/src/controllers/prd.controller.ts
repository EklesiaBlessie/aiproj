import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { PRD } from '../models/PRD';

function ownerId(req: Request): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(req.user!.id);
}

/**
 * GET /api/prd
 *
 * List the caller's saved PRD drafts.
 */
export async function listPRDs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const docs = await PRD.find({
      owner: ownerId(req),
    })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      success: true,
      count: docs.length,
      data: docs,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/prd/:id
 */
export async function getPRDById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const doc = await PRD.findOne({
      _id: req.params.id,
      owner: ownerId(req),
    }).lean();

    if (!doc) {
      res.status(404).json({
        success: false,
        error: `PRD "${req.params.id}" not found`,
      });
      return;
    }

    res.json({
      success: true,
      data: doc,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/prd
 *
 * Creates a normal/manual PRD draft.
 *
 * This is NOT the AI generation endpoint.
 */
export async function createPRD(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const doc = await PRD.create({
      ...req.body,
      owner: ownerId(req),
      aiGenerated: false,
    });

    res.status(201).json({
      success: true,
      data: doc,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/prd/generate
 *
 * Generates a PRD through the FastAPI AI service.
 *
 * Flow:
 *
 * Frontend
 *   ↓
 * POST /api/prd/generate
 *   ↓
 * Express backend
 *   ↓
 * POST http://127.0.0.1:8001/prd
 *   ↓
 * FastAPI
 *   ↓
 * Retriever + Qdrant + Gemini
 *   ↓
 * PRD JSON
 *   ↓
 * MongoDB
 *   ↓
 * Frontend
 */
export async function generatePRD(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { question } = req.body;

    if (
      !question ||
      typeof question !== 'string' ||
      !question.trim()
    ) {
      res.status(400).json({
        success: false,
        error: 'question is required',
      });
      return;
    }

    const fastApiUrl = process.env.FASTAPI_URL?.trim();

    if (!fastApiUrl) {
      throw new Error('FASTAPI_URL is not configured');
    }

    console.log(
      `🤖 Generating PRD using AI service: ${fastApiUrl}/prd`,
    );

    const response = await fetch(
      `${fastApiUrl}/prd`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
        }),
      },
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        'FastAPI PRD generation failed:',
        response.status,
        errorText,
      );

      res.status(502).json({
        success: false,
        error: `AI service returned ${response.status}`,
        details: errorText,
      });

      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiResult: any =
      await response.json();

    /**
     * FastAPI normally returns the PRDResponse
     * directly.
     *
     * If your FastAPI route ever wraps it inside
     * { data: ... }, this also supports that shape.
     */
    const generated =
      aiResult?.data ?? aiResult;

    /**
     * Convert FastAPI PRDResponse into the
     * MongoDB/frontend PRD structure.
     */
    const sections = [
      {
        heading: 'Target Users',
        items:
          Array.isArray(
            generated.target_users,
          )
            ? generated.target_users
            : [],
      },

      {
        heading: 'Goals',
        items:
          Array.isArray(
            generated.goals,
          )
            ? generated.goals
            : [],
      },

      {
        heading: 'Requirements',
        items:
          Array.isArray(
            generated.requirements,
          )
            ? generated.requirements
            : [],
      },

      {
        heading: 'User Stories',
        items:
          Array.isArray(
            generated.user_stories,
          )
            ? generated.user_stories
                .map(
                  (story: {
                    story?: string;
                  }) =>
                    story?.story ?? '',
                )
                .filter(Boolean)
            : [],
      },

      {
        heading:
          'Acceptance Criteria',
        items:
          Array.isArray(
            generated.acceptance_criteria,
          )
            ? generated.acceptance_criteria.flatMap(
                (item: {
                  criteria?: string[];
                }) =>
                  Array.isArray(
                    item?.criteria,
                  )
                    ? item.criteria
                    : [],
              )
            : [],
      },

      {
        heading:
          'Success Metrics',
        items:
          Array.isArray(
            generated.success_metrics,
          )
            ? generated.success_metrics
            : [],
      },

      {
        heading: 'Risks',
        items:
          Array.isArray(
            generated.risks,
          )
            ? generated.risks
            : [],
      },
    ].filter(
      (section) =>
        section.items.length > 0,
    );

    /**
     * Save the generated PRD into MongoDB.
     */
    const doc = await PRD.create({
      owner: ownerId(req),

      title:
        generated.title ||
        'AI Generated PRD',

      feature:
        generated.title ||
        undefined,

      status: 'draft',

      overview:
        generated.problem_statement ||
        '',

      sections,

      /**
       * IMPORTANT:
       * This is the real AI-generated result,
       * so mark it true here.
       */
      aiGenerated: true,
    });

    console.log(
      `✅ PRD generated and saved: ${doc._id}`,
    );

    res.status(201).json({
      success: true,

      data: {
        ...generated,

        _id: doc._id,
        status: doc.status,
        aiGenerated: true,
        sections: doc.sections,
        overview: doc.overview,
      },
    });
  } catch (error) {
    console.error(
      '❌ PRD generation error:',
      error,
    );

    next(error);
  }
}

/**
 * PATCH /api/prd/:id
 *
 * Update an existing PRD draft.
 */
export async function updatePRD(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      aiGenerated: _ignored,
      ...updates
    } = req.body;

    const doc =
      await PRD.findOneAndUpdate(
        {
          _id: req.params.id,
          owner: ownerId(req),
        },
        {
          $set: updates,
        },
        {
          new: true,
          runValidators: true,
        },
      ).lean();

    if (!doc) {
      res.status(404).json({
        success: false,
        error: `PRD "${req.params.id}" not found`,
      });
      return;
    }

    res.json({
      success: true,
      data: doc,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/prd/:id
 */
export async function deletePRD(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const doc =
      await PRD.findOneAndDelete({
        _id: req.params.id,
        owner: ownerId(req),
      }).lean();

    if (!doc) {
      res.status(404).json({
        success: false,
        error: `PRD "${req.params.id}" not found`,
      });
      return;
    }

    res.json({
      success: true,
      message: `PRD "${doc.title}" deleted`,
    });
  } catch (error) {
    next(error);
  }
}
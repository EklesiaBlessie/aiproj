import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { RoadmapItem } from '../models/RoadmapItem';

/** Cast the authenticated user's id once, for use in owner-scoped queries. */
function ownerId(req: Request): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(req.user!.id);
}

/**
 * GET /api/roadmap
 *
 * Every card owned by the caller, sorted into stable column order so the board
 * renders identically on each load. Sorting here rather than in the client
 * means the persisted `order` is the single source of truth for card position.
 */
export async function listRoadmapItems(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const items = await RoadmapItem.find({ owner: ownerId(req) })
      .sort({ quarter: 1, order: 1, createdAt: 1 })
      .lean();

    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/roadmap
 *
 * Appends a card to the end of its target column. `order` is computed from the
 * current column contents rather than accepted from the client, so a new card
 * can never collide with an existing position.
 */
export async function createRoadmapItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const owner = ownerId(req);
    const { quarter, lane } = req.body;

    const last = await RoadmapItem.findOne({ owner, quarter, lane: lane ?? null })
      .sort({ order: -1 })
      .lean();

    const item = await RoadmapItem.create({
      ...req.body,
      owner,
      order: (last?.order ?? -1) + 1,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/roadmap/:id
 *
 * Partial update — also the drag-and-drop write path, where the body carries a
 * new `quarter`/`lane`/`order`. The owner is part of the query rather than
 * checked afterwards, so another user's id simply matches nothing and answers
 * 404 instead of leaking that the record exists.
 */
export async function updateRoadmapItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const item = await RoadmapItem.findOneAndUpdate(
      { _id: req.params.id, owner: ownerId(req) },
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();

    if (!item) {
      res.status(404).json({
        success: false,
        error: `Roadmap item "${req.params.id}" not found`,
      });
      return;
    }

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/roadmap/reorder
 *
 * Persists a whole drag gesture in one request: the dragged card's new column
 * plus the resulting order of every card in that column. Sending the full
 * column avoids the drift that per-card updates produce when two positions
 * swap and one request lands before the other.
 *
 * Declared before the /:id route in the router — otherwise "reorder" is parsed
 * as an id and cast-fails.
 */
export async function reorderRoadmapItems(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const owner = ownerId(req);
    const { items } = req.body as {
      items: Array<{ id: string; quarter: string; lane?: string | null; order: number }>;
    };

    const result = await RoadmapItem.bulkWrite(
      items.map((item) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(item.id), owner },
          update: {
            $set: {
              quarter: item.quarter,
              lane: item.lane ?? null,
              order: item.order,
            },
          },
        },
      }))
    );

    // A caller that sent ids it doesn't own would otherwise get a cheerful 200
    // with nothing written; report what actually matched.
    res.json({
      success: true,
      message: `${result.modifiedCount} of ${items.length} items repositioned`,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/roadmap/:id
 */
export async function deleteRoadmapItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const item = await RoadmapItem.findOneAndDelete({
      _id: req.params.id,
      owner: ownerId(req),
    }).lean();

    if (!item) {
      res.status(404).json({
        success: false,
        error: `Roadmap item "${req.params.id}" not found`,
      });
      return;
    }

    res.json({ success: true, message: `Roadmap item "${item.title}" deleted` });
  } catch (error) {
    next(error);
  }
}

import { Request, Response, NextFunction } from 'express';
import { Feedback } from '../models/Feedback';

/**
 * GET /api/stats
 * Dashboard statistics aggregated directly in MongoDB.
 */
export async function getStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [total, byCategory, bySentiment, byPriority, bySource, weeklyVolume] =
      await Promise.all([
        Feedback.countDocuments(),

        Feedback.aggregate([
          { $match: { category: { $ne: null } } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        Feedback.aggregate([
          { $match: { sentiment: { $ne: null } } },
          { $group: { _id: '$sentiment', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        Feedback.aggregate([
          { $match: { priority: { $ne: null } } },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        Feedback.aggregate([
          { $match: { source: { $ne: null } } },
          { $group: { _id: '$source', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        // Last 8 calendar weeks, calculated directly from MongoDB.
        Feedback.aggregate([
          {
            $match: {
              createdAt: { $ne: null },
            },
          },
          {
            $group: {
              _id: {
                $dateTrunc: {
                  date: '$createdAt',
                  unit: 'week',
                  startOfWeek: 'monday',
                },
              },
              feedback: { $sum: 1 },
              themes: {
                $addToSet: '$category',
              },
            },
          },
          {
            $project: {
              _id: 0,
              weekStart: '$_id',
              feedback: 1,
              themes: {
                $size: {
                  $filter: {
                    input: '$themes',
                    as: 'theme',
                    cond: { $ne: ['$$theme', null] },
                  },
                },
              },
            },
          },
          { $sort: { weekStart: -1 } },
          { $limit: 8 },
          { $sort: { weekStart: 1 } },
        ]),
      ]);

    const formatForRecharts = (data: any[]) =>
      data.map((item) => ({
        name: item._id,
        value: item.count,
      }));

    res.json({
      success: true,
      data: {
        total,
        byCategory: formatForRecharts(byCategory),
        bySentiment: formatForRecharts(bySentiment),
        byPriority: formatForRecharts(byPriority),
        bySource: formatForRecharts(bySource),
        weeklyVolume,
      },
    });
  } catch (error) {
    next(error);
  }
}
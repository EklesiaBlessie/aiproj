import mongoose, { Schema, Document } from 'mongoose';

/* ────────────────────────────────────────────────────────────────────────────
 * Roadmap item — one card on the Roadmap board.
 *
 * Scoped per user (`owner`) so two people planning in the same database don't
 * see each other's cards. This is the manual, non-AI half of the Roadmap page:
 * a PM creates, edits, drags, and deletes items here. AI-generated suggestions
 * are a separate concern still blocked on Yash's /analyze service, and nothing
 * in this model pretends to produce them.
 *
 * `order` positions a card within its (quarter, lane) column. Drag-and-drop
 * rewrites it, so it must persist — a board that forgets where you dropped a
 * card on reload is indistinguishable from one that never saved at all.
 * ──────────────────────────────────────────────────────────────────────── */

export type RoadmapStatus = 'planned' | 'in_progress' | 'done';

export interface IRoadmapItem extends Document {
  owner: mongoose.Types.ObjectId;
  title: string;
  quarter: string;          // free text, e.g. "Q3 2026" — teams name quarters differently
  // e.g. Growth / Core / Platform. Nullable rather than merely optional:
  // dragging a card off a lane has to clear the field, which is a write of
  // null, not the absence of a key.
  lane?: string | null;
  status: RoadmapStatus;
  effort?: string;          // T-shirt size: S / M / L / XL
  team?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const RoadmapItemSchema = new Schema<IRoadmapItem>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    quarter: {
      type: String,
      required: [true, 'Quarter is required'],
      trim: true,
      index: true,
    },
    lane: { type: String, trim: true },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'done'],
      default: 'planned',
    },
    effort: { type: String, trim: true },
    team: { type: String, trim: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const RoadmapItem = mongoose.model<IRoadmapItem>('RoadmapItem', RoadmapItemSchema);

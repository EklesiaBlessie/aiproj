import mongoose, { Schema, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

/* ────────────────────────────────────────────────────────────────────────────
 * PRD — a saved Product Requirement Document draft.
 *
 * SCOPE NOTE, deliberately narrow: this model stores the parts of a PRD that
 * are ordinary user data — title, which feature it covers, status, and body
 * sections the user typed. It does NOT generate content.
 *
 * `aiGenerated` records whether the body ever came back from a real analysis
 * run. It stays false for every draft created today, because the /analyze
 * proxy currently answers with `mock: true` and no LLM is connected. When
 * Yash's FastAPI service lands, the generate path can fill `body` and flip
 * this flag — until then the UI reads `aiGenerated === false` to label a draft
 * honestly as "AI content not generated" rather than showing invented text.
 * ──────────────────────────────────────────────────────────────────────── */

export type PRDStatus = 'draft' | 'review' | 'ready';

export interface IPRDSection {
  heading: string;
  items: string[];
}

export interface IPRD extends Document {
  owner: mongoose.Types.ObjectId;
  title: string;
  feature?: string;
  status: PRDStatus;
  overview?: string;
  /** Free-form sections (Goals, Non-Goals, User Stories, Metrics…). */
  sections: IPRDSection[];
  /** True only when `sections`/`overview` came from a real analysis run. */
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PRDSectionSchema = new Schema<IPRDSection>(
  {
    heading: { type: String, required: true, trim: true },
    items: { type: [String], default: [] },
  },
  { _id: false }
);

const PRDSchema = new Schema<IPRD>(
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
    feature: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'review', 'ready'],
      default: 'draft',
    },
    overview: { 
      type: String, 
      trim: true,
      get: decrypt,
      set: encrypt
    },
    sections: { type: [PRDSectionSchema], default: [] },
    aiGenerated: { type: Boolean, default: false },
  },
  { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

export const PRD = mongoose.model<IPRD>('PRD', PRDSchema);

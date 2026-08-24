import mongoose, { Schema, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

/* ────────────────────────────────────────────────────────────────────────────
 * IFeedback — Mongoose document interface
 *
 * Maps ALL 45 columns from dataset/processed/analyzed_feedback.csv.
 *
 * KEY NOTES FOR FUTURE DEVELOPERS:
 *
 * 1. `originalPriority` (CSV col 29, lowercase "priority") is a support-
 *    ticket-only field. In the current dataset it is ALWAYS empty because
 *    Sarayu's preprocessing pipeline filtered out ticket-source rows.
 *    It is kept for schema completeness; don't assume it's broken.
 *
 * 2. `priority` (this model) maps to CSV col 45, capitalized "Priority" —
 *    Eklessia's AI-analyzed priority classification (High / Medium / Low).
 *
 * 3. `theme` and `painPoint` are derived convenience fields. In the current
 *    dataset they are ~93% null because the CSV is dominated by review-
 *    source rows that don't populate issueCategory / featureCategory.
 *    Real theme/pain-point extraction will come from Yash's /analyze NLP
 *    endpoint — these fields are placeholders until that integration.
 *
 * 4. `aiRecommendation` is populated by POST /api/analyze (currently
 *    stubbed). It is null for seeded data.
 * ──────────────────────────────────────────────────────────────────────── */

export interface IFeedback extends Document {
  // ── Core identifiers ──
  feedbackId: string;
  customerId?: string;
  restaurantId?: string;
  restaurantName?: string;

  // ── Feedback content ──
  text: string;          // Original feedback_text
  review?: string;       // Cleaned / normalized text (from preprocessing)
  reviewTitle?: string;

  // ── Metadata ──
  rating?: number;
  source?: string;       // e.g. Google Reviews, Zomato, Email, etc.
  createdAt?: Date;
  city?: string;
  language?: string;
  reviewerName?: string;
  state?: string;
  visitType?: string;    // Dine-In | Takeaway | Delivery

  // ── Food & delivery ratings ──
  foodRating?: number;
  deliveryRating?: number;
  orderValue?: number;
  orderId?: string;
  deliveryPartner?: string;
  deliveryTime?: string;

  // ── Survey fields ──
  surveyId?: string;
  satisfactionScore?: number;
  recommendScore?: number;
  foodQuality?: string;
  serviceQuality?: string;
  cleanliness?: string;

  // ── Support ticket fields ──
  ticketId?: string;
  issueCategory?: string;
  originalPriority?: string;   // CSV col 29 — always empty in current dataset (see note above)
  status?: string;
  emailId?: string;
  subject?: string;

  // ── Feature request fields ──
  requestId?: string;
  featureCategory?: string;
  featureTitle?: string;

  // ── Dine-in specific ──
  staffRating?: number;
  ambienceRating?: number;

  // ── Social media fields ──
  postId?: string;
  platform?: string;
  username?: string;
  engagement?: string;

  // ── AI-analyzed fields (from Eklessia's analysis pipeline) ──
  category?: string;     // e.g. Food, Delivery, Service, Ambience
  sentiment?: string;    // Positive | Negative | Neutral
  priority?: string;     // High | Medium | Low (AI-analyzed, CSV col 45)

  // ── Derived / enrichment fields ──
  theme?: string;        // Derived from issueCategory or featureCategory (mostly null — see note above)
  painPoint?: string;    // Derived from subject or reviewTitle (mostly null — see note above)
  aiRecommendation?: string;  // Populated by POST /api/analyze (stub for now)
}

/* ──────────────────────────────────────────────────────────────────────── */

const FeedbackSchema = new Schema<IFeedback>(
  {
    // ── Core identifiers ──
    feedbackId:      { type: String, unique: true, sparse: true, index: true },
    customerId:      { type: String },
    restaurantId:    { type: String, index: true },
    restaurantName:  { type: String },

    // ── Content ──
    text:            { 
      type: String, 
      required: true,
      get: decrypt,
      set: encrypt
    },
    review:          { 
      type: String,
      get: decrypt,
      set: encrypt
    },
    reviewTitle:     { type: String },

    // ── Metadata ──
    rating:          { type: Number },
    source:          { type: String, index: true },
    createdAt:       { type: Date, index: true },
    city:            { type: String },
    language:        { type: String },
    reviewerName:    { type: String },
    state:           { type: String },
    visitType:       { type: String },

    // ── Food & delivery ──
    foodRating:      { type: Number },
    deliveryRating:  { type: Number },
    orderValue:      { type: Number },
    orderId:         { type: String },
    deliveryPartner: { type: String },
    deliveryTime:    { type: String },

    // ── Survey ──
    surveyId:        { type: String },
    satisfactionScore: { type: Number },
    recommendScore:    { type: Number },
    foodQuality:     { type: String },
    serviceQuality:  { type: String },
    cleanliness:     { type: String },

    // ── Support tickets ──
    ticketId:        { type: String },
    issueCategory:   { type: String },
    originalPriority: { type: String },  // Always empty in current dataset — see file header
    status:          { type: String },
    emailId:         { type: String },
    subject:         { type: String },

    // ── Feature requests ──
    requestId:       { type: String },
    featureCategory: { type: String },
    featureTitle:    { type: String },

    // ── Dine-in ──
    staffRating:     { type: Number },
    ambienceRating:  { type: Number },

    // ── Social media ──
    postId:          { type: String },
    platform:        { type: String },
    username:        { type: String },
    engagement:      { type: String },

    // ── AI-analyzed ──
    category:        { type: String, index: true },
    sentiment:       { type: String, index: true },
    priority:        { type: String, index: true },

    // ── Derived / enrichment ──
    theme:           { type: String },
    painPoint:       { type: String },
    aiRecommendation: { type: String },
  },
  {
    timestamps: { createdAt: false, updatedAt: 'updatedAt' },
    // Don't let Mongoose auto-create createdAt — we set it from CSV's created_date
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

export const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);

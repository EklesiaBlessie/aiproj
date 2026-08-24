import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { Feedback } from '../models/Feedback';

dayjs.extend(customParseFormat);

/* ────────────────────────────────────────────────────────────────────────────
 * Seed script — one-time bulk import of analyzed_feedback.csv into MongoDB.
 *
 * Run:  npm run seed
 *
 * Date handling:
 *   ~39/676 rows use non-ISO date formats (DD-Mon-YYYY, DD/MM/YYYY) despite
 *   going through Sarayu's normalize.py. This script tries multiple formats
 *   via dayjs + customParseFormat rather than relying on `new Date()`.
 *
 * feedbackId handling:
 *   At least one row has a blank feedback_id. The script auto-generates
 *   FB_GEN_<timestamp>_<random> for any missing/empty IDs so every document
 *   has a lookup-able identifier.
 * ──────────────────────────────────────────────────────────────────────── */

// ── Date parsing with fallback formats ──────────────────────────────────

const DATE_FORMATS = [
  'YYYY-MM-DD',       // ISO (majority of rows)
  'DD-MMM-YYYY',      // e.g. 06-Jul-2024
  'DD-Mon-YYYY',      // alias
  'DD/MM/YYYY',       // e.g. 06/07/2024
  'MM/DD/YYYY',       // US format (fallback)
  'YYYY/MM/DD',       // rare but possible
  'DD-MM-YYYY',       // e.g. 06-07-2024
];

function parseDate(raw: string): Date | null {
  if (!raw || raw.trim() === '') return null;

  const trimmed = raw.trim();

  // Try each known format with strict parsing
  for (const fmt of DATE_FORMATS) {
    const parsed = dayjs(trimmed, fmt, true);
    if (parsed.isValid()) {
      return parsed.toDate();
    }
  }

  // Last resort: native Date constructor (handles ISO 8601 and other edge cases)
  const nativeDate = new Date(trimmed);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  console.warn(`⚠️  Could not parse date: "${raw}" — storing as null`);
  return null;
}

// ── Helper: convert empty strings to null, parse numbers ────────────────

function emptyToNull(val: string | undefined): string | null {
  if (val === undefined || val === null || val.trim() === '') return null;
  return val.trim();
}

function toNumber(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null;
  const n = parseFloat(val.trim());
  return isNaN(n) ? null : n;
}

function generateFeedbackId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `FB_GEN_${ts}_${rand}`;
}

// ── CSV column → Mongoose field mapping ─────────────────────────────────

interface CsvRow {
  [key: string]: string;
}

function mapRow(row: CsvRow) {
  const feedbackId = emptyToNull(row['feedback_id']) || generateFeedbackId();

  return {
    feedbackId,
    customerId:        emptyToNull(row['customer_id']),
    restaurantId:      emptyToNull(row['restaurant_id']),
    restaurantName:    emptyToNull(row['restaurant_name']),

    text:              row['feedback_text']?.trim() || '',
    review:            emptyToNull(row['review']),
    reviewTitle:       emptyToNull(row['review_title']),

    rating:            toNumber(row['rating']),
    source:            emptyToNull(row['source']),
    createdAt:         parseDate(row['created_date'] || ''),
    city:              emptyToNull(row['city']),
    language:          emptyToNull(row['language']),
    reviewerName:      emptyToNull(row['reviewer_name']),
    state:             emptyToNull(row['state']),
    visitType:         emptyToNull(row['visit_type']),

    foodRating:        toNumber(row['food_rating']),
    deliveryRating:    toNumber(row['delivery_rating']),
    orderValue:        toNumber(row['order_value']),
    orderId:           emptyToNull(row['order_id']),
    deliveryPartner:   emptyToNull(row['delivery_partner']),
    deliveryTime:      emptyToNull(row['delivery_time']),

    surveyId:          emptyToNull(row['survey_id']),
    satisfactionScore: toNumber(row['satisfaction_score']),
    recommendScore:    toNumber(row['recommend_score']),
    foodQuality:       emptyToNull(row['food_quality']),
    serviceQuality:    emptyToNull(row['service_quality']),
    cleanliness:       emptyToNull(row['cleanliness']),

    ticketId:          emptyToNull(row['ticket_id']),
    issueCategory:     emptyToNull(row['issue_category']),
    // CSV col 29 "priority" (lowercase) → originalPriority
    // Always empty in this dataset — see model header comments.
    originalPriority:  emptyToNull(row['priority']),
    status:            emptyToNull(row['status']),
    emailId:           emptyToNull(row['email_id']),
    subject:           emptyToNull(row['subject']),

    requestId:         emptyToNull(row['request_id']),
    featureCategory:   emptyToNull(row['feature_category']),
    featureTitle:      emptyToNull(row['feature_title']),

    staffRating:       toNumber(row['staff_rating']),
    ambienceRating:    toNumber(row['ambience_rating']),

    postId:            emptyToNull(row['post_id']),
    platform:          emptyToNull(row['platform']),
    username:          emptyToNull(row['username']),
    engagement:        emptyToNull(row['engagement']),

    // AI-analyzed columns (capitalized in CSV, from Eklessia's pipeline)
    category:          emptyToNull(row['Category']),
    sentiment:         emptyToNull(row['Sentiment']),
    // CSV col 45 "Priority" (capitalized) → priority (the canonical field)
    priority:          emptyToNull(row['Priority']),

    // Derived convenience fields — mostly null for review-source rows.
    // Real values come from Yash's /analyze NLP endpoint.
    theme:             emptyToNull(row['theme']),
    painPoint:         emptyToNull(row['pain_point']),
    aiRecommendation:  null,
  };
}

// ── Main seed logic ─────────────────────────────────────────────────────

async function seed(): Promise<void> {
  // Resolve CSV path relative to this script's location
  const csvPath = path.resolve(
    __dirname,
    '..', '..', '..', 'dataset', 'processed', 'theme_painpoint_analysis.csv'
  );

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  console.log(`📂 Reading CSV from: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  const records: CsvRow[] = parse(csvContent, {
    columns: true,          // Use first row as headers
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  console.log(`📊 Parsed ${records.length} rows from CSV`);

  // Map all rows
  const docs = records
    .map(mapRow)
    .filter((d) => d.text && d.text.length > 0); // Skip rows with no feedback text

  console.log(`✅ ${docs.length} valid documents mapped (${records.length - docs.length} skipped — no text)`);

  // Connect to MongoDB
  await connectDB();

  // Clear existing data (idempotent re-seed)
  const existingCount = await Feedback.countDocuments();
  if (existingCount > 0) {
    console.log(`🗑️  Clearing ${existingCount} existing documents...`);
    await Feedback.deleteMany({});
  }

  // Bulk insert
  const result = await Feedback.insertMany(docs, { ordered: false });
  console.log(`🎉 Seeded ${result.length} feedback documents into MongoDB`);

  // Quick stats
  const [cats, sents, pris] = await Promise.all([
    Feedback.distinct('category'),
    Feedback.distinct('sentiment'),
    Feedback.distinct('priority'),
  ]);
  console.log(`📈 Categories: ${cats.filter(Boolean).join(', ')}`);
  console.log(`📈 Sentiments: ${sents.filter(Boolean).join(', ')}`);
  console.log(`📈 Priorities: ${pris.filter(Boolean).join(', ')}`);

  await mongoose.disconnect();
  console.log('✅ Done. MongoDB disconnected.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

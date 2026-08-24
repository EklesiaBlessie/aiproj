import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

import { updateUserSchema } from '../validators/user.validator';
import { updateCurrentUser } from '../controllers/user.controller';

import {
  createRoadmapSchema,
  updateRoadmapSchema,
  reorderRoadmapSchema,
  roadmapIdSchema,
} from '../validators/roadmap.validator';

import {
  listRoadmapItems,
  createRoadmapItem,
  updateRoadmapItem,
  reorderRoadmapItems,
  deleteRoadmapItem,
} from '../controllers/roadmap.controller';

import {
  createPRDSchema,
  updatePRDSchema,
  prdIdSchema,
} from '../validators/prd.validator';

import {
  listPRDs,
  getPRDById,
  createPRD,
  generatePRD,
  updatePRD,
  deletePRD,
} from '../controllers/prd.controller';

import {
  mergeThemesSchema,
  splitThemeSchema,
} from '../validators/themes.validator';

import {
  mergeThemes,
  splitTheme,
} from '../controllers/themes.controller';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// User settings
// ─────────────────────────────────────────────────────────────────────────────

router.patch(
  '/user',
  authenticate,
  validate(updateUserSchema),
  updateCurrentUser,
);

// ─────────────────────────────────────────────────────────────────────────────
// Roadmap
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/roadmap',
  authenticate,
  listRoadmapItems,
);

router.post(
  '/roadmap',
  authenticate,
  validate(createRoadmapSchema),
  createRoadmapItem,
);

router.patch(
  '/roadmap/reorder',
  authenticate,
  validate(reorderRoadmapSchema),
  reorderRoadmapItems,
);

router.patch(
  '/roadmap/:id',
  authenticate,
  validate(updateRoadmapSchema),
  updateRoadmapItem,
);

router.delete(
  '/roadmap/:id',
  authenticate,
  validate(roadmapIdSchema),
  deleteRoadmapItem,
);

// ─────────────────────────────────────────────────────────────────────────────
// PRD
// ─────────────────────────────────────────────────────────────────────────────

// Get all saved PRDs
router.get(
  '/prd',
  authenticate,
  listPRDs,
);

// Create a normal/manual PRD draft
router.post(
  '/prd',
  authenticate,
  validate(createPRDSchema),
  createPRD,
);

// Generate PRD using FastAPI AI service
router.post(
  '/prd/generate',
  authenticate,
  generatePRD,
);

// Get one PRD
router.get(
  '/prd/:id',
  authenticate,
  validate(prdIdSchema),
  getPRDById,
);

// Update PRD
router.patch(
  '/prd/:id',
  authenticate,
  validate(updatePRDSchema),
  updatePRD,
);

// Delete PRD
router.delete(
  '/prd/:id',
  authenticate,
  validate(prdIdSchema),
  deletePRD,
);

// ─────────────────────────────────────────────────────────────────────────────
// Themes
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/themes/merge',
  authenticate,
  validate(mergeThemesSchema),
  mergeThemes,
);

router.post(
  '/themes/split',
  authenticate,
  validate(splitThemeSchema),
  splitTheme,
);

export default router;
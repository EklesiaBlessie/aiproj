import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  exportPRDToPDF,
  exportPRDToDOCX,
  exportFeedbackToCSV,
} from '../controllers/export.controller';

const router = Router();

router.get('/pdf/prd/:id', authenticate, exportPRDToPDF);
router.get('/docx/prd/:id', authenticate, exportPRDToDOCX);
router.get('/csv/feedback', authenticate, exportFeedbackToCSV);

export default router;

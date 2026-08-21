import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getIntegrations,
  connectIntegration,
  syncIntegration,
  disconnectIntegration,
} from '../controllers/integration.controller';

const router = Router();

router.get('/', authenticate, getIntegrations);
router.post('/connect/:provider', authenticate, connectIntegration);
router.post('/sync/:provider', authenticate, syncIntegration);
router.post('/disconnect/:provider', authenticate, disconnectIntegration);

export default router;

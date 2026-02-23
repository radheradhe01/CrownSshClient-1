import { Router } from 'express';
import { executionQueue } from '../queues/executionQueue.js';
import { validate } from '../middleware/validate.js';
import { executeCommandSchema } from '../schemas/executionSchema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Execution requires authentication but is open to all roles (users can Run)
router.use(requireAuth);

router.post('/', validate(executeCommandSchema), asyncHandler(async (req, res) => {
  const { vmIds, command } = req.body;

  // Enqueue jobs
  const jobs = vmIds.map((vmId: string) => ({
    name: 'execute-command',
    data: { vmId, command },
  }));

  await executionQueue.addBulk(jobs);

  res.json({ message: 'Execution started', jobCount: jobs.length });
}));

export default router;

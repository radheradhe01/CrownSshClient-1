import { Router } from 'express';
import { vmService } from '../services/vmService.js';
import { validate } from '../middleware/validate.js';
import { createVMSchema, updateVMSchema } from '../schemas/vmSchema.js';

const router = Router();

router.get('/', async (req, res) => {
  const environmentId = req.query.environmentId as string | undefined;
  const search = req.query.search as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  
  const result = await vmService.getAll(environmentId, search, page, limit);
  res.json(result);
});

router.post('/', validate(createVMSchema), async (req, res) => {
  const newVM = await vmService.add(req.body);
  res.json(newVM);
});

router.put('/:id', validate(updateVMSchema), async (req, res) => {
  const updatedVM = await vmService.update(req.params.id, req.body);
  if (!updatedVM) {
    res.status(404).json({ error: 'VM not found' });
    return;
  }
  res.json(updatedVM);
});

router.delete('/:id', async (req, res) => {
  const success = await vmService.delete(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'VM not found' });
    return;
  }
  res.json({ success: true });
});

export default router;

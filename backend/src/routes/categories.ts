import { Router, Response } from 'express';
import { body } from 'express-validator';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { supabaseAdmin } from '../config/supabase';
import { dataStore } from '../services/dataStore';
import { logger } from '../utils/logger';

const router = Router();
router.use(requireAuth);

// GET /api/categories
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*, transactions(count)')
      .eq('user_id', userId)
      .order('name');

    if (!error && data && data.length > 0) {
      const categories = data.map((c) => ({
        id: c.id, userId: c.user_id, name: c.name, icon: c.icon,
        color: c.color, isDefault: c.is_default,
        transactionCount: c.transactions?.[0]?.count || 0,
        createdAt: c.created_at,
      }));
      return res.json({ success: true, data: categories });
    }
  } catch (err: unknown) {
    logger.warn('Categories DB query error, using dataStore', { err });
  }

  // Fallback to dataStore categories
  const categories = dataStore.getCategories(userId).map((c) => ({
    id: c.id,
    userId: c.userId || userId,
    name: c.name,
    icon: c.icon,
    color: c.color,
    isDefault: c.isDefault,
    transactionCount: 0,
    createdAt: c.createdAt,
  }));

  res.json({ success: true, data: categories });
});

// POST /api/categories
router.post('/', [
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('icon').optional().isString().trim().isLength({ max: 10 }),
  body('color').optional().isHexColor(),
  validateRequest,
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, icon = '💰', color = '#7c3aed' } = req.body;
    const cat = dataStore.addCategory(userId, name.trim(), icon, color);

    try {
      await supabaseAdmin
        .from('categories')
        .insert({ id: cat.id, user_id: userId, name: name.trim(), icon, color, is_default: false });
    } catch {
      // Ignored
    }

    res.status(201).json({ success: true, data: cat });
  } catch (err: unknown) {
    logger.error('Create category error', { err });
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id
router.put('/:id', [
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('icon').optional().isString().trim(),
  body('color').optional().isHexColor(),
  validateRequest,
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Record<string, string> = {};
    if (req.body.name) updates.name = req.body.name.trim();
    if (req.body.icon) updates.icon = req.body.icon;
    if (req.body.color) updates.color = req.body.color;
    const { data, error } = await supabaseAdmin
      .from('categories').update(updates).eq('id', id).eq('user_id', req.userId!).select().single();
    if (error || !data) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true, data });
  } catch (err: unknown) {
    logger.error('Update category error', { err });
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Verify ownership
    const { data: cat } = await supabaseAdmin.from('categories').select('id, is_default').eq('id', id).eq('user_id', req.userId!).single();
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });
    if (cat.is_default) return res.status(400).json({ success: false, error: 'Cannot delete default categories' });
    // Null out category_id on related transactions (don't delete them)
    await supabaseAdmin.from('transactions').update({ category_id: null }).eq('category_id', id).eq('user_id', req.userId!);
    await supabaseAdmin.from('categories').delete().eq('id', id).eq('user_id', req.userId!);
    res.json({ success: true, message: 'Category deleted. Existing transactions have been uncategorized.' });
  } catch (err: unknown) {
    logger.error('Delete category error', { err });
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

export default router;

-- ==============================================================================
-- MyKanakku Default Categories Seed Data
-- Standard student-focused expense and income categories
-- ==============================================================================

INSERT INTO public.categories (id, user_id, name, icon, color, is_default)
VALUES
    ('c0000000-0000-0000-0000-000000000001', NULL, 'Food & Canteen', '🍔', '#f97316', true),
    ('c0000000-0000-0000-0000-000000000002', NULL, 'Groceries & Snacks', '🛒', '#10b981', true),
    ('c0000000-0000-0000-0000-000000000003', NULL, 'Transport & Auto', '🚌', '#06b6d4', true),
    ('c0000000-0000-0000-0000-000000000004', NULL, 'College & Tuition', '🎓', '#8b5cf6', true),
    ('c0000000-0000-0000-0000-000000000005', NULL, 'Books & Stationary', '📚', '#3b82f6', true),
    ('c0000000-0000-0000-0000-000000000006', NULL, 'Hostel & Rent', '🏠', '#6366f1', true),
    ('c0000000-0000-0000-0000-000000000007', NULL, 'Entertainment & Movies', '🍿', '#ec4899', true),
    ('c0000000-0000-0000-0000-000000000008', NULL, 'Subscriptions & Recharge', '📱', '#14b8a6', true),
    ('c0000000-0000-0000-0000-000000000009', NULL, 'Health & Medicine', '💊', '#ef4444', true),
    ('c0000000-0000-0000-0000-000000000010', NULL, 'Shopping & Personal', '🛍️', '#f59e0b', true),
    ('c0000000-0000-0000-0000-000000000011', NULL, 'Allowance & Pocket Money', '💵', '#22c55e', true),
    ('c0000000-0000-0000-0000-000000000012', NULL, 'Freelance & Part-time', '💼', '#10b981', true),
    ('c0000000-0000-0000-0000-000000000013', NULL, 'Scholarships', '🏆', '#eab308', true),
    ('c0000000-0000-0000-0000-000000000014', NULL, 'General & Miscellaneous', '📦', '#64748b', true)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color, is_default = EXCLUDED.is_default;

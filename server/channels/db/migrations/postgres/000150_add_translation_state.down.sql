DROP INDEX IF EXISTS idx_translations_state;
ALTER TABLE translations DROP COLUMN IF EXISTS state;
ALTER TABLE translations
ADD COLUMN IF NOT EXISTS state varchar(20) NOT NULL;
CREATE INDEX IF NOT EXISTS idx_translations_state
ON translations(state)
WHERE state IN ('processing');
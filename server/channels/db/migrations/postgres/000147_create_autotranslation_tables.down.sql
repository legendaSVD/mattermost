DROP INDEX IF EXISTS idx_users_id_locale;
DROP INDEX IF EXISTS idx_channels_autotranslation_enabled;
DROP INDEX IF EXISTS idx_channelmembers_autotranslation_enabled;
ALTER TABLE channelmembers
    DROP COLUMN IF EXISTS autotranslation;
ALTER TABLE channels
    DROP COLUMN IF EXISTS autotranslation;
DROP INDEX IF EXISTS idx_translations_updateat;
DROP TABLE IF EXISTS translations;
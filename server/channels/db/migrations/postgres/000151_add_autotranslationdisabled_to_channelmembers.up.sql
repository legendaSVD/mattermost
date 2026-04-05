ALTER TABLE channelmembers
    ADD COLUMN IF NOT EXISTS autotranslationdisabled boolean NOT NULL DEFAULT false;
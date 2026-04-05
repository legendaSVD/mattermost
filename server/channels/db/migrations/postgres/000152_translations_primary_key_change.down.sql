ALTER TABLE translations DROP CONSTRAINT translations_pkey;
ALTER TABLE translations ADD PRIMARY KEY (objectId, dstLang);
ALTER TABLE translations ALTER COLUMN objectType DROP NOT NULL;
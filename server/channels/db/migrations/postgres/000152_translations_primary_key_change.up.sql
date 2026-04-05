UPDATE translations SET objectType = 'post' WHERE objectType IS NULL;
ALTER TABLE translations ALTER COLUMN objectType SET NOT NULL;
ALTER TABLE translations DROP CONSTRAINT translations_pkey;
ALTER TABLE translations ADD PRIMARY KEY (objectId, objectType, dstLang);
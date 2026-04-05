ALTER TABLE threads DROP COLUMN IF EXISTS deleteat;
ALTER TABLE threads ADD COLUMN IF NOT EXISTS threaddeleteat bigint;
UPDATE threads SET threaddeleteat = posts.deleteat FROM posts WHERE threads.threaddeleteat IS NULL AND posts.id = threads.postid;
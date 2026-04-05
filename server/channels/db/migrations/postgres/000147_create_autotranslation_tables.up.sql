CREATE TABLE IF NOT EXISTS translations (
    objectId            varchar(26)    NOT NULL,
    dstLang             varchar        NOT NULL,
    objectType          varchar        NULL,
    providerId          varchar        NOT NULL,
    normHash            char(64)       NOT NULL,
    text                text           NOT NULL,
    confidence          real                     ,
    meta                jsonb                    ,
    updateAt            bigint         NOT NULL,
    PRIMARY KEY (objectId, dstLang)
);
CREATE INDEX IF NOT EXISTS idx_translations_updateat
    ON translations (updateAt DESC);
ALTER TABLE channels
    ADD COLUMN IF NOT EXISTS autotranslation boolean NOT NULL DEFAULT false;
ALTER TABLE channelmembers
    ADD COLUMN IF NOT EXISTS autotranslation boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_channelmembers_autotranslation_enabled
    ON channelmembers (channelid)
    WHERE autotranslation = true;
CREATE INDEX IF NOT EXISTS idx_channels_autotranslation_enabled
    ON channels (id)
    WHERE autotranslation = true;
CREATE INDEX IF NOT EXISTS idx_users_id_locale
    ON users (id, locale);
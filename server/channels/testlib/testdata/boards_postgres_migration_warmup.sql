SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
INSERT INTO public.focalboard_system_settings VALUES ('UniqueIDsMigrationComplete', 'true');
INSERT INTO public.focalboard_system_settings VALUES ('TeamLessBoardsMigrationComplete', 'true');
INSERT INTO public.focalboard_system_settings VALUES ('DeletedMembershipBoardsMigrationComplete', 'true');
INSERT INTO public.focalboard_system_settings VALUES ('CategoryUuidIdMigrationComplete', 'true');
INSERT INTO public.focalboard_system_settings VALUES ('DeDuplicateCategoryBoardTableComplete', 'true');
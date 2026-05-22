-- ============================================================
-- Syntess Atrium — Read-Only Database User aanmaken
-- ============================================================
-- Voer dit script uit als SYSDBA via isql of DBeaver:
--
--   isql -user SYSDBA -pass masterkey /opt/syntess/data/SYNTESS.FDB
--   INPUT /pad/naar/create-readonly-user.sql;
--
-- Of via DBeaver: New SQL Script → Run
-- ============================================================

-- 1. Gebruiker aanmaken (Firebird 3+ syntax)
CREATE OR ALTER USER SYNTESS_RO
  PASSWORD 'changeme_readonly_pass'
  FIRSTNAME 'Syntess'
  LASTNAME 'Readonly';

-- 2. CONNECT privilege op de database
GRANT CONNECT ON DATABASE TO SYNTESS_RO;

-- 3. SELECT rechten op alle AT_* tabellen
--    Pas aan als er meer/minder tabellen zijn.
--    In Firebird 3+ kun je ook: GRANT SELECT ON ALL TABLES TO SYNTESS_RO;
--    maar dat geeft ook toegang tot systeem-views. Expliciete lijst is veiliger.

GRANT SELECT ON AT_KLANTEN           TO SYNTESS_RO;
GRANT SELECT ON AT_PROJECTEN         TO SYNTESS_RO;
GRANT SELECT ON AT_WERKBONNEN        TO SYNTESS_RO;
GRANT SELECT ON AT_KLNTBREG          TO SYNTESS_RO;
GRANT SELECT ON AT_DOCUMENT          TO SYNTESS_RO;
GRANT SELECT ON AT_GROOTBOEK_RUBRIEKEN TO SYNTESS_RO;
GRANT SELECT ON AT_GROOTBOEK_MUTATIES  TO SYNTESS_RO;
GRANT SELECT ON AT_KOSTENSOORT       TO SYNTESS_RO;
GRANT SELECT ON AT_INKOOPFACTUREN    TO SYNTESS_RO;
GRANT SELECT ON AT_LEVERANCIERS      TO SYNTESS_RO;

-- 4. Controleer: login als SYNTESS_RO en probeer een SELECT
-- isql -user SYNTESS_RO -pass changeme_readonly_pass /opt/syntess/data/SYNTESS.FDB
-- SQL> SELECT COUNT(*) FROM AT_KLANTEN;
-- SQL> INSERT INTO AT_KLANTEN (NAAM) VALUES ('test');  -- moet falen met "no permission"

COMMIT;

-- ============================================================
-- Opmerking: Verander het wachtwoord naar een sterk wachtwoord
-- en sla het op in de .env file van de backend (FB_PASSWORD).
-- Commit NOOIT het echte wachtwoord naar versiebeheer.
-- ============================================================

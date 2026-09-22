-- UseKollo — scheduled indexer, run from Supabase Cron.
--
-- Run this once, after supabase/setup.sql, and after the app is deployed to a
-- URL Supabase can reach. Replace the two values in step 2 first.
--
-- Why here rather than vercel.json: Vercel's Hobby plan permits one cron run
-- per day. pg_cron has no such limit, so the reconciliation pass can run every
-- few minutes instead — which is the difference between an out-of-app
-- transaction showing up in the activity feed within minutes versus the next
-- day.

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
-- pg_cron schedules the job; pg_net makes the outbound HTTP call. Both can
-- also be toggled from Dashboard -> Database -> Extensions, which is the more
-- reliable route if either CREATE below is refused.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- 2. Secrets
-- ---------------------------------------------------------------------------
-- These go in Vault rather than inline in the job body. A scheduled job's SQL
-- is stored in plain text in `cron.job`, readable by anyone with database
-- access, so pasting CRON_SECRET directly into the schedule below would leave
-- the credential sitting in a queryable table.

-- Your deployed app's origin, no trailing slash. Must be publicly reachable:
-- Supabase calls it over the internet, so localhost will not work.
select vault.create_secret(
  'https://your-app.vercel.app',
  'kollo_app_base_url',
  'UseKollo app origin, called by the indexer cron'
);

-- Must match CRON_SECRET in the app's environment exactly.
select vault.create_secret(
  'paste-your-CRON_SECRET-here',
  'kollo_cron_secret',
  'Bearer token the indexer endpoint checks'
);

-- To change either later, update rather than re-create:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'kollo_app_base_url'),
--     'https://new-url.example.com'
--   );

-- ---------------------------------------------------------------------------
-- 3. Schedule
-- ---------------------------------------------------------------------------
-- Every 5 minutes. The endpoint is idempotent — activity rows upsert on
-- (tx_hash, type) and the ledger checkpoint only moves forward — so an
-- overlapping or repeated run is harmless.

select cron.schedule(
  'kollo-indexer',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'kollo_app_base_url'
    ) || '/api/cron/index',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'kollo_cron_secret'
      )
    ),
    -- pg_net defaults to 5s, which a pass with a backlog will exceed. Note
    -- this only bounds how long we wait for the response; the request itself
    -- still completes server-side, and the next run resumes from the
    -- checkpoint either way.
    timeout_milliseconds := 30000
  );
  $$
);

-- ---------------------------------------------------------------------------
-- Operating it
-- ---------------------------------------------------------------------------

-- What is scheduled:
--   select jobid, jobname, schedule, active from cron.job;

-- Did the job fire? (pg_cron's view — reports the SQL ran, not the HTTP result)
--   select jobid, status, return_message, start_time
--   from cron.job_run_details
--   order by start_time desc
--   limit 20;

-- What did the endpoint actually answer? (pg_net's view — this is the one
-- that tells you whether the indexer is working)
--   select id, status_code, content, created
--   from net._http_response
--   order by created desc
--   limit 20;
--
-- Expect 200 with a body like
--   {"statusCode":200,...,"data":{"scannedFrom":...,"rowsRecorded":0,...}}
-- A 403 means kollo_cron_secret does not match the app's CRON_SECRET.
-- A 401 with an HTML body means Vercel Deployment Protection is intercepting
-- the request before it reaches the route — see docs/08-environment-setup.md.

-- Run it once, right now, without waiting for the schedule:
--   select net.http_get(
--     url := (select decrypted_secret from vault.decrypted_secrets
--             where name = 'kollo_app_base_url') || '/api/cron/index',
--     headers := jsonb_build_object('Authorization', 'Bearer ' ||
--       (select decrypted_secret from vault.decrypted_secrets
--        where name = 'kollo_cron_secret')),
--     timeout_milliseconds := 30000
--   );

-- Pause / resume / remove:
--   update cron.job set active = false where jobname = 'kollo-indexer';
--   update cron.job set active = true  where jobname = 'kollo-indexer';
--   select cron.unschedule('kollo-indexer');

-- Re-running this file: `cron.schedule` upserts on the job name, so the
-- schedule block is safe to re-run. The `vault.create_secret` calls in step 2
-- are not — they error on a duplicate name. Use vault.update_secret instead.

-- Sets (or replaces) the Vault entries the items insert trigger reads. psql vars: :url, :secret.
-- Hosted: run the same two statement pairs in the SQL editor with the real values.
select vault.update_secret(id, :'url') from vault.secrets where name = 'extract_url';
select vault.create_secret(:'url', 'extract_url')
  where not exists (select 1 from vault.secrets where name = 'extract_url');
select vault.update_secret(id, :'secret') from vault.secrets where name = 'extract_secret';
select vault.create_secret(:'secret', 'extract_secret')
  where not exists (select 1 from vault.secrets where name = 'extract_secret');

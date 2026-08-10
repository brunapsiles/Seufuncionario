-- Fecha o isolamento por workspace em indicadores e consolida a operação
-- interna na mesma tabela que alimenta o Portal do Cliente.

ALTER TABLE todogreen_green_scores
  ADD COLUMN workspace_owner_id TEXT NOT NULL DEFAULT '';

UPDATE todogreen_green_scores
   SET workspace_owner_id = COALESCE((
     SELECT c.workspace_owner_id
       FROM todogreen_clients c
      WHERE c.tenant_id = todogreen_green_scores.tenant_id
        AND c.id = todogreen_green_scores.client_id
      LIMIT 1
   ), '')
 WHERE workspace_owner_id = '';

CREATE INDEX IF NOT EXISTS idx_todogreen_green_scores_workspace
  ON todogreen_green_scores
    (tenant_id, workspace_owner_id, client_id, scope_type, calculated_at DESC);

ALTER TABLE todogreen_client_portal_events
  ADD COLUMN workspace_owner_id TEXT NOT NULL DEFAULT '';

UPDATE todogreen_client_portal_events
   SET workspace_owner_id = COALESCE((
     SELECT c.workspace_owner_id
       FROM todogreen_clients c
      WHERE c.tenant_id = todogreen_client_portal_events.tenant_id
        AND c.id = todogreen_client_portal_events.client_id
      LIMIT 1
   ), '')
 WHERE workspace_owner_id = '';

CREATE INDEX IF NOT EXISTS idx_todogreen_client_portal_events_workspace
  ON todogreen_client_portal_events
    (tenant_id, workspace_owner_id, client_id, created_at DESC);

ALTER TABLE todogreen_client_operations ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_todogreen_client_operations_workspace
  ON todogreen_client_operations
    (tenant_id, workspace_owner_id, archived_at, updated_at DESC);

-- Preserva registros já criados pelo painel interno. A tabela antiga fica
-- disponível nesta migração para rollback operacional; novas escritas passam
-- a usar somente todogreen_client_operations.
INSERT OR IGNORE INTO todogreen_client_operations
  (id, tenant_id, client_id, workspace_owner_id, product_id, reference,
   status, service_date, fields_json, incident_count, distance_km, revision,
   created_by, updated_by, created_at, updated_at, archived_at)
SELECT o.id, o.tenant_id, o.client_id, o.workspace_owner_id, o.product_id,
       COALESCE(NULLIF(json_extract(o.fields_json, '$.route'), ''), o.product_id, ''),
       o.status,
       CASE WHEN length(o.reference_month) = 7 THEN o.reference_month || '-01' ELSE NULL END,
       json_patch(COALESCE(o.fields_json, '{}'), json_object(
         'deliveries', o.deliveries,
         'packages', o.packages,
         'trips', o.trips,
         'distanceKm', o.distance_km,
         'occupancyPercent', o.occupancy_percent
       )),
       COALESCE(CAST(json_extract(o.fields_json, '$.incidents') AS INTEGER), 0),
       o.distance_km, o.revision, o.created_by, o.updated_by,
       o.created_at, o.updated_at, o.archived_at
  FROM todogreen_operations o
 WHERE EXISTS (
   SELECT 1 FROM todogreen_clients c
    WHERE c.id = o.client_id
      AND c.tenant_id = o.tenant_id
      AND c.workspace_owner_id = o.workspace_owner_id
 );

ALTER TABLE todogreen_ciot_integrations ADD COLUMN credential_ciphertext TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_ciot_integrations ADD COLUMN credential_iv TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_ciot_integrations ADD COLUMN credential_filename TEXT NOT NULL DEFAULT '';
ALTER TABLE todogreen_ciot_integrations ADD COLUMN credential_uploaded_at TEXT;

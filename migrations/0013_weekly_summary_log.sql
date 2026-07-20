CREATE TABLE IF NOT EXISTS weekly_summary_log (
  user_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  PRIMARY KEY (user_id, week_start)
);

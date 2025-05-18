// SQLite database schema definitions for mcards

export const MCARD_TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS card (
  hash TEXT PRIMARY KEY,
  g_time TEXT NOT NULL,
  content BLOB NOT NULL
)
`;

export const TRIGGERS = {
  ensureUnique: `
  CREATE TRIGGER IF NOT EXISTS ensure_unique_hash
  BEFORE INSERT ON card
  FOR EACH ROW
  BEGIN
    SELECT RAISE(ABORT, 'Card with this hash already exists')
    WHERE EXISTS (SELECT 1 FROM card WHERE hash = NEW.hash);
  END
  `
};

export default {
  MCARD_TABLE_SCHEMA,
  TRIGGERS
};

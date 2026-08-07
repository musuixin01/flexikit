CREATE TABLE IF NOT EXISTS discovery_tools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  tags TEXT DEFAULT '',
  icon TEXT,
  source VARCHAR(50) NOT NULL,
  source_url VARCHAR(500),
  hot_score FLOAT DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  discovered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discovery_tools_name ON discovery_tools(name);
CREATE INDEX IF NOT EXISTS idx_discovery_tools_source ON discovery_tools(source);
CREATE INDEX IF NOT EXISTS idx_discovery_tools_hot_score ON discovery_tools(hot_score);
CREATE INDEX IF NOT EXISTS idx_discovery_tools_discovered_at ON discovery_tools(discovered_at);

-- Migration: Add Community Tables
-- Description: Forums, Topics, Posts, Votes, User Stats, and Bookmarks

-- Enums
CREATE TYPE community_forum_status AS ENUM ('active', 'archived');
CREATE TYPE vote_type AS ENUM ('upvote', 'downvote');

-- Community Forums (categories)
CREATE TABLE community_forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7) DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  status community_forum_status DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_forums_slug ON community_forums(slug);
CREATE INDEX idx_forums_status ON community_forums(status);
CREATE INDEX idx_forums_sort ON community_forums(sort_order);

-- Community Topics (discussion threads)
CREATE TABLE community_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID NOT NULL REFERENCES community_forums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  slug VARCHAR(255) NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE NOT NULL,
  is_solved BOOLEAN DEFAULT FALSE NOT NULL,
  view_count INTEGER DEFAULT 0 NOT NULL,
  reply_count INTEGER DEFAULT 0 NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_topics_forum ON community_topics(forum_id);
CREATE INDEX idx_topics_user ON community_topics(user_id);
CREATE INDEX idx_topics_slug ON community_topics(slug);
CREATE INDEX idx_topics_pinned ON community_topics(is_pinned);
CREATE INDEX idx_topics_created ON community_topics(created_at);

-- Community Posts (replies/comments)
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES community_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_accepted_answer BOOLEAN DEFAULT FALSE NOT NULL,
  vote_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_posts_topic ON community_posts(topic_id);
CREATE INDEX idx_posts_user ON community_posts(user_id);
CREATE INDEX idx_posts_parent ON community_posts(parent_id);
CREATE INDEX idx_posts_accepted ON community_posts(is_accepted_answer);
CREATE INDEX idx_posts_created ON community_posts(created_at);

-- Community Votes (upvotes/downvotes)
CREATE TABLE community_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL,
  target_id UUID NOT NULL,
  vote_type vote_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_votes_user ON community_votes(user_id);
CREATE INDEX idx_votes_target ON community_votes(target_type, target_id);

-- Community User Stats (reputation tracking)
CREATE TABLE community_user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  reputation INTEGER DEFAULT 0 NOT NULL,
  topics_count INTEGER DEFAULT 0 NOT NULL,
  posts_count INTEGER DEFAULT 0 NOT NULL,
  upvotes_received INTEGER DEFAULT 0 NOT NULL,
  downvotes_received INTEGER DEFAULT 0 NOT NULL,
  answers_accepted INTEGER DEFAULT 0 NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_stats_user ON community_user_stats(user_id);
CREATE INDEX idx_user_stats_reputation ON community_user_stats(reputation);

-- Community Bookmarks
CREATE TABLE community_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES community_topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, topic_id)
);

CREATE INDEX idx_bookmarks_user ON community_bookmarks(user_id);
CREATE INDEX idx_bookmarks_topic ON community_bookmarks(topic_id);

-- Seed default forums
INSERT INTO community_forums (name, slug, description, icon, color, sort_order) VALUES
  ('General Discussion', 'general', 'Talk about anything related to app development and MVPLABX', 'message-circle', '#6366f1', 1),
  ('Q&A', 'qa', 'Ask questions and get answers from the community', 'help-circle', '#10b981', 2),
  ('Showcase', 'showcase', 'Show off your apps and get feedback', 'layout', '#f59e0b', 3),
  ('Feature Requests', 'feature-requests', 'Suggest and vote on new features', 'lightbulb', '#ec4899', 4),
  ('Feedback', 'feedback', 'Share your thoughts and suggestions', 'thumbs-up', '#8b5cf6', 5);

-- Function to update topic reply count
CREATE OR REPLACE FUNCTION update_topic_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_topics 
    SET reply_count = reply_count + 1 
    WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_topics 
    SET reply_count = reply_count - 1 
    WHERE id = OLD.topic_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update reply count
CREATE TRIGGER trigger_update_topic_reply_count
AFTER INSERT OR DELETE ON community_posts
FOR EACH ROW EXECUTE FUNCTION update_topic_reply_count();

-- Add self-referential foreign key for nested replies
ALTER TABLE community_posts 
ADD CONSTRAINT community_posts_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES community_posts(id) ON DELETE CASCADE;
-- Initial migration for ChatX
-- Enables gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users
CREATE TABLE "User" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  password text NOT NULL,
  "avatarUrl" text,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);

-- Refresh tokens
CREATE TABLE "RefreshToken" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz DEFAULT now()
);

-- Servers
CREATE TABLE "Server" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  "ownerId" uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  visibility text DEFAULT 'private',
  "createdAt" timestamptz DEFAULT now()
);

-- Roles
CREATE TABLE "Role" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "serverId" uuid NOT NULL REFERENCES "Server"(id) ON DELETE CASCADE,
  name text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Server members
CREATE TABLE "ServerMember" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "serverId" uuid NOT NULL REFERENCES "Server"(id) ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "roleId" uuid REFERENCES "Role"(id),
  "joinedAt" timestamptz DEFAULT now(),
  UNIQUE ("serverId", "userId")
);

-- Channels
CREATE TABLE "Channel" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "serverId" uuid NOT NULL REFERENCES "Server"(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text DEFAULT 'text',
  topic text,
  "createdAt" timestamptz DEFAULT now()
);

-- Messages
CREATE TABLE "Message" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "channelId" uuid NOT NULL REFERENCES "Channel"(id) ON DELETE CASCADE,
  "authorId" uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  content text NOT NULL,
  attachments jsonb,
  "createdAt" timestamptz DEFAULT now(),
  "editedAt" timestamptz,
  deleted boolean DEFAULT false
);

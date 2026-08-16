import type { CustomNode } from '../../store/useGraphStore';
import type { Edge } from '@xyflow/react';

export interface ProjectMetadata {
  id?: string;
  name: string;
  updatedAt: number;
  nodeCount: number;
  edgeCount: number;
  description?: string;
}

export interface ProjectData {
  version: string;
  name: string;
  savedAt: number;
  nodes: CustomNode[];
  edges: Edge[];
  filePath?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface StorageProvider {
  id: string;
  name: string;
  description: string;
  isCloud: boolean;
  isAvailable: boolean;
  isAuthenticated: boolean;
  user: UserProfile | null;

  init?: () => Promise<void>;
  signIn?: () => Promise<UserProfile | null>;
  signOut?: () => Promise<void>;
  saveProject: (project: ProjectData) => Promise<{ success: boolean; fileId?: string; message?: string }>;
  loadProject: () => Promise<ProjectData | null>;
  listProjects?: () => Promise<ProjectMetadata[]>;
}

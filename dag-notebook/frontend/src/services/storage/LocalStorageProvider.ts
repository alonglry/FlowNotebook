import type { StorageProvider, ProjectData, ProjectMetadata } from './types';

const STORAGE_KEY_ACTIVE = 'flownotebook_active_project';
const STORAGE_KEY_LIST = 'flownotebook_projects_index';

export class LocalStorageProvider implements StorageProvider {
  id = 'local_storage';
  name = 'Browser Storage';
  description = 'Save pipelines directly inside your browser cache';
  isCloud = false;
  isAvailable = true;
  isAuthenticated = true;
  user = null;

  async saveProject(project: ProjectData): Promise<{ success: boolean; fileId?: string; message?: string }> {
    try {
      const projectId = `proj_${Date.now()}`;
      const payload = JSON.stringify(project);

      // Save as active
      localStorage.setItem(STORAGE_KEY_ACTIVE, payload);

      // Also add to project list
      const existingListRaw = localStorage.getItem(STORAGE_KEY_LIST);
      const existingList: ProjectMetadata[] = existingListRaw ? JSON.parse(existingListRaw) : [];

      const updatedList = [
        {
          id: projectId,
          name: project.name || 'Untitled Pipeline',
          updatedAt: Date.now(),
          nodeCount: project.nodes.length,
          edgeCount: project.edges.length,
        },
        ...existingList.filter((p) => p.name !== project.name),
      ];

      localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(updatedList));
      localStorage.setItem(`flownotebook_proj_${project.name}`, payload);

      return { success: true, fileId: projectId, message: 'Saved to browser storage' };
    } catch (e: any) {
      return { success: false, message: `Failed to save: ${e.message}` };
    }
  }

  async loadProject(projectName?: string): Promise<ProjectData | null> {
    try {
      const key = projectName ? `flownotebook_proj_${projectName}` : STORAGE_KEY_ACTIVE;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[LocalStorageProvider] Load error:', e);
      return null;
    }
  }

  async listProjects(): Promise<ProjectMetadata[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LIST);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
}

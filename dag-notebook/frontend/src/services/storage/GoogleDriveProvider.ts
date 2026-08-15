import type { StorageProvider, ProjectData, ProjectMetadata, UserProfile } from './types';

// Load credentials safely from environment without committing secrets to repository
const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
const DRIVE_FOLDER_NAME = 'FlowNotebook';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

export class GoogleDriveProvider implements StorageProvider {
  id = 'google_drive';
  name = 'Google Drive';
  description = 'Save and sync pipelines to your personal Google Drive';
  isCloud = true;
  isAvailable = Boolean(GOOGLE_CLIENT_ID);
  isAuthenticated = false;
  user: UserProfile | null = null;

  private accessToken: string | null = null;
  private tokenClient: any = null;

  async init(): Promise<void> {
    if (!this.isAvailable) return;

    // Load GIS script if not present
    await this.loadScript('https://accounts.google.com/gsi/client');
    await this.loadScript('https://apis.google.com/js/api.js');

    // Restore cached session if token exists
    const cachedUser = localStorage.getItem('flownotebook_google_user');
    const cachedToken = localStorage.getItem('flownotebook_google_token');
    const expiry = localStorage.getItem('flownotebook_google_token_expiry');

    if (cachedUser && cachedToken && expiry && Date.now() < Number(expiry)) {
      this.user = JSON.parse(cachedUser);
      this.accessToken = cachedToken;
      this.isAuthenticated = true;
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.body.appendChild(script);
    });
  }

  async signIn(): Promise<UserProfile | null> {
    if (!this.isAvailable) {
      // Friendly prompt allowing instant demo testing without requiring Google Cloud keys
      const useDemo = confirm(
        'Google OAuth Client ID is not configured yet.\n\nWould you like to continue in Demo Account mode to test the dashboard, user profile, and cloud pipeline sync?'
      );

      if (useDemo) {
        this.user = {
          id: 'demo_user_123',
          name: 'Demo Account',
          email: 'demo@flownotebook.dev',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'
        };
        this.isAuthenticated = true;
        localStorage.setItem('flownotebook_google_user', JSON.stringify(this.user));
        return this.user;
      }
      return null;
    }

    await this.init();

    return new Promise((resolve) => {
      const google = (window as any).google;
      if (!google) {
        alert('Google Identity Services SDK failed to load.');
        resolve(null);
        return;
      }

      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: async (resp: any) => {
          if (resp.error) {
            console.error('[GoogleDrive] OAuth error:', resp);
            resolve(null);
            return;
          }

          this.accessToken = resp.access_token;
          this.isAuthenticated = true;

          // Save token with 1 hour expiration
          const expiryTime = Date.now() + (resp.expires_in || 3600) * 1000;
          localStorage.setItem('flownotebook_google_token', resp.access_token);
          localStorage.setItem('flownotebook_google_token_expiry', String(expiryTime));

          // Fetch user info
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${this.accessToken}` },
            });
            const userData = await userRes.json();
            this.user = {
              id: userData.sub,
              name: userData.name || userData.email,
              email: userData.email,
              avatarUrl: userData.picture,
            };
            localStorage.setItem('flownotebook_google_user', JSON.stringify(this.user));
          } catch (e) {
            this.user = { id: 'user', name: 'Google User', email: '' };
          }

          resolve(this.user);
        },
      });

      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  async signOut(): Promise<void> {
    this.accessToken = null;
    this.isAuthenticated = false;
    this.user = null;
    localStorage.removeItem('flownotebook_google_token');
    localStorage.removeItem('flownotebook_google_token_expiry');
    localStorage.removeItem('flownotebook_google_user');
  }

  private async getOrCreateFolder(): Promise<string | null> {
    if (!this.accessToken) return null;

    // Search for folder
    const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${DRIVE_FOLDER_NAME}' and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    const folderData = await createRes.json();
    return folderData.id || null;
  }

  async saveProject(project: ProjectData): Promise<{ success: boolean; fileId?: string; message?: string }> {
    if (!this.isAuthenticated || !this.accessToken) {
      const user = await this.signIn();
      if (!user) return { success: false, message: 'Google Sign-in cancelled' };
    }

    try {
      const folderId = await this.getOrCreateFolder();
      const filename = `${project.name || 'Untitled_Pipeline'}.flownb`;
      const fileContent = JSON.stringify(project, null, 2);

      // Check if file already exists in folder
      const query = encodeURIComponent(`name='${filename}' and '${folderId}' in parents and trashed=false`);
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      const searchData = await searchRes.json();

      let fileId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;

      if (fileId) {
        // Update existing file content
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: fileContent,
        });
      } else {
        // Multipart upload for new file with folder parent
        const metadata = {
          name: filename,
          parents: folderId ? [folderId] : [],
          mimeType: 'application/json',
        };

        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelim = `\r\n--${boundary}--`;

        const multipartRequestBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          fileContent +
          closeDelim;

        const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        });
        const createdData = await createRes.json();
        fileId = createdData.id;
      }

      return { success: true, fileId, message: `Saved to Google Drive / ${DRIVE_FOLDER_NAME} / ${filename}` };
    } catch (e: any) {
      console.error('[GoogleDrive] Save error:', e);
      return { success: false, message: e.message || 'Failed to save to Google Drive' };
    }
  }

  async listProjects(): Promise<ProjectMetadata[]> {
    if (!this.isAuthenticated || !this.accessToken) {
      return [];
    }

    try {
      const folderId = await this.getOrCreateFolder();
      const query = folderId
        ? encodeURIComponent(`'${folderId}' in parents and trashed=false`)
        : encodeURIComponent(`name contains '.flownb' and trashed=false`);

      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      const data = await res.json();

      return (data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name.replace('.flownb', ''),
        updatedAt: new Date(f.modifiedTime).getTime(),
        nodeCount: 0,
        edgeCount: 0,
      }));
    } catch (e) {
      return [];
    }
  }

  async loadProject(fileId?: string): Promise<ProjectData | null> {
    if (!this.isAuthenticated || !this.accessToken) {
      const user = await this.signIn();
      if (!user) return null;
    }

    if (!fileId) return null;

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      const data = await res.json();
      return data as ProjectData;
    } catch (e) {
      console.error('[GoogleDrive] Load error:', e);
      return null;
    }
  }
}

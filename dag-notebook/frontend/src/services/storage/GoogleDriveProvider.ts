import type { StorageProvider, ProjectData, ProjectMetadata, UserProfile } from './types';

// Load credentials safely from environment without committing secrets to repository
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const DRIVE_FOLDER_NAME = 'FlowNotebook';
const LOGIN_SCOPES = 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid';
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';

export class GoogleDriveProvider implements StorageProvider {
  id = 'google_drive';
  name = 'Google Drive';
  description = 'Save and sync pipelines to your personal Google Drive';
  isCloud = true;
  isAvailable = Boolean(GOOGLE_CLIENT_ID);
  isAuthenticated = false;
  hasDriveAccess = false;
  user: UserProfile | null = null;

  private accessToken: string | null = null;

  async init(): Promise<void> {
    if (!this.isAvailable) return;

    // Load GIS script if not present
    await this.loadScript('https://accounts.google.com/gsi/client');
    await this.loadScript('https://apis.google.com/js/api.js');

    // Restore cached session if user/token exists
    const cachedUser = localStorage.getItem('flownotebook_google_user');
    const cachedToken = localStorage.getItem('flownotebook_google_token');
    const expiry = localStorage.getItem('flownotebook_google_token_expiry');
    const cachedDriveAccess = localStorage.getItem('flownotebook_google_has_drive_access');

    if (cachedUser) {
      try {
        this.user = JSON.parse(cachedUser);
      } catch (e) {}
    }

    if (cachedDriveAccess === 'true') {
      this.hasDriveAccess = true;
    }

    if (cachedToken && expiry && Date.now() < Number(expiry)) {
      this.accessToken = cachedToken;
      this.isAuthenticated = true;
    } else if (this.user) {
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

  /**
   * Initial sign-in: Only requests basic profile and email authentication.
   * Does NOT request Google Drive access scopes.
   * Remembers the user for instant repeat logins without re-prompting consent.
   */
  async signIn(): Promise<UserProfile | null> {
    // If already authenticated with a valid token, return immediately
    const expiry = localStorage.getItem('flownotebook_google_token_expiry');
    if (this.isAuthenticated && this.user && this.accessToken && expiry && Date.now() < Number(expiry)) {
      return this.user;
    }

    // Retrieve remembered profile or email for fast frictionless re-login
    const rememberedUserStr = localStorage.getItem('flownotebook_google_user') || localStorage.getItem('flownotebook_remembered_profile');
    if (rememberedUserStr && !this.user) {
      try {
        this.user = JSON.parse(rememberedUserStr);
      } catch (e) {}
    }

    if (!this.isAvailable) {
      // In demo mode, if already remembered, log in directly
      if (this.user) {
        this.isAuthenticated = true;
        this.hasDriveAccess = true;
        localStorage.setItem('flownotebook_google_user', JSON.stringify(this.user));
        return this.user;
      }

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
        this.hasDriveAccess = true;
        localStorage.setItem('flownotebook_google_user', JSON.stringify(this.user));
        localStorage.setItem('flownotebook_remembered_profile', JSON.stringify(this.user));
        return this.user;
      }
      return null;
    }

    await this.init();

    const lastEmail = localStorage.getItem('flownotebook_last_email') || this.user?.email || '';

    return new Promise((resolve) => {
      const google = (window as any).google;
      if (!google) {
        if (this.user) {
          this.isAuthenticated = true;
          resolve(this.user);
          return;
        }
        alert('Google Identity Services SDK failed to load.');
        resolve(null);
        return;
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: LOGIN_SCOPES,
        callback: async (resp: any) => {
          if (resp.error) {
            console.error('[GoogleDrive] OAuth login error:', resp);
            // If user closed dialog or popup was blocked, but profile is remembered, preserve state
            if (this.user) {
              this.isAuthenticated = true;
              resolve(this.user);
              return;
            }
            resolve(null);
            return;
          }

          this.accessToken = resp.access_token;
          this.isAuthenticated = true;

          // Check if drive scope was already granted previously
          if (google.accounts?.oauth2?.hasGrantedAnyScope(resp, DRIVE_SCOPES)) {
            this.hasDriveAccess = true;
            localStorage.setItem('flownotebook_google_has_drive_access', 'true');
          }

          // Save token with expiration
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
          } catch (e) {
            if (!this.user) {
              this.user = { id: 'user', name: 'Google User', email: lastEmail };
            }
          }

          if (this.user) {
            localStorage.setItem('flownotebook_google_user', JSON.stringify(this.user));
            localStorage.setItem('flownotebook_remembered_profile', JSON.stringify(this.user));
            if (this.user.email) {
              localStorage.setItem('flownotebook_last_email', this.user.email);
            }
          }

          resolve(this.user);
        },
      });

      // Request token with prompt: '' (skips consent screen for returning users) and hint
      client.requestAccessToken({
        prompt: '',
        hint: lastEmail || undefined,
      });
    });
  }

  /**
   * Request Google Drive access incrementally when saving or managing files.
   */
  async requestDriveAccess(): Promise<boolean> {
    const expiry = localStorage.getItem('flownotebook_google_token_expiry');
    if (this.isAuthenticated && this.hasDriveAccess && this.accessToken && expiry && Date.now() < Number(expiry)) {
      return true;
    }

    if (!this.isAvailable) {
      this.hasDriveAccess = true;
      return true;
    }

    await this.init();

    const lastEmail = localStorage.getItem('flownotebook_last_email') || this.user?.email || '';

    return new Promise((resolve) => {
      const google = (window as any).google;
      if (!google) {
        alert('Google Identity Services SDK failed to load.');
        resolve(false);
        return;
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: `${LOGIN_SCOPES} ${DRIVE_SCOPES}`,
        callback: async (resp: any) => {
          if (resp.error) {
            console.error('[GoogleDrive] Drive OAuth error:', resp);
            resolve(false);
            return;
          }

          this.accessToken = resp.access_token;
          this.isAuthenticated = true;
          this.hasDriveAccess = true;

          const expiryTime = Date.now() + (resp.expires_in || 3600) * 1000;
          localStorage.setItem('flownotebook_google_token', resp.access_token);
          localStorage.setItem('flownotebook_google_token_expiry', String(expiryTime));
          localStorage.setItem('flownotebook_google_has_drive_access', 'true');

          // Fetch user info if not already loaded
          if (!this.user) {
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
              localStorage.setItem('flownotebook_remembered_profile', JSON.stringify(this.user));
              if (this.user.email) {
                localStorage.setItem('flownotebook_last_email', this.user.email);
              }
            } catch (e) {
              this.user = { id: 'user', name: 'Google User', email: '' };
            }
          }

          resolve(true);
        },
      });

      client.requestAccessToken({
        prompt: '',
        hint: lastEmail || undefined,
      });
    });
  }

  async signOut(): Promise<void> {
    // Note: Do NOT call google.accounts.oauth2.revoke(this.accessToken) here.
    // Calling revoke() tells Google to delete the user's permission grant, forcing Google to display the full consent
    // dialog asking for email/profile access on their next sign in.
    // Instead, simply clear the active session tokens while preserving their remembered email/profile for smooth future logins.
    this.accessToken = null;
    this.isAuthenticated = false;
    this.hasDriveAccess = false;
    this.user = null;
    localStorage.removeItem('flownotebook_google_token');
    localStorage.removeItem('flownotebook_google_token_expiry');
    localStorage.removeItem('flownotebook_google_user');
    localStorage.removeItem('flownotebook_google_has_drive_access');
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
    if (!this.isAuthenticated || !this.hasDriveAccess || !this.accessToken) {
      const granted = await this.requestDriveAccess();
      if (!granted) return { success: false, message: 'Google Drive permission was not granted.' };
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
    if (!this.isAuthenticated || !this.hasDriveAccess || !this.accessToken) {
      if (!this.isAvailable && this.user) {
        return [
          {
            id: 'demo_drive_1',
            name: 'Quantitative Alpha Pipeline',
            updatedAt: Date.now() - 3600000,
            nodeCount: 4,
            edgeCount: 3,
          },
          {
            id: 'demo_drive_2',
            name: 'Customer Churn Random Forest',
            updatedAt: Date.now() - 86400000,
            nodeCount: 3,
            edgeCount: 2,
          }
        ];
      }
      return [];
    }

    try {
      // Broad query to find any FlowNotebook pipeline (.flownb) or JSON file in Google Drive
      const query = encodeURIComponent(`trashed=false and (name contains '.flownb' or name contains '.json' or mimeType = 'application/json') and mimeType != 'application/vnd.google-apps.folder'`);
      let res = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=drive&q=${query}&fields=files(id,name,modifiedTime,size,mimeType,parents)&orderBy=modifiedTime desc&pageSize=100&includeItemsFromAllDrives=true&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (res.status === 401) {
        // Token might be expired, request refresh
        const refreshed = await this.requestDriveAccess();
        if (refreshed && this.accessToken) {
          res = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=drive&q=${query}&fields=files(id,name,modifiedTime,size,mimeType,parents)&orderBy=modifiedTime desc&pageSize=100&includeItemsFromAllDrives=true&supportsAllDrives=true`, {
            headers: { Authorization: `Bearer ${this.accessToken}` },
          });
        }
      }

      const data = await res.json();
      console.log('[GoogleDrive] files.list response:', data);

      if (data.error) {
        console.warn('[GoogleDrive] files.list error:', data.error);
        return [];
      }

      const files: any[] = data.files || [];

      return files.map((f: any) => {
        let cleanName = f.name || 'Untitled Pipeline';
        if (cleanName.endsWith('.flownb')) {
          cleanName = cleanName.slice(0, -'.flownb'.length);
        } else if (cleanName.endsWith('.json')) {
          cleanName = cleanName.slice(0, -'.json'.length);
        }
        return {
          id: f.id,
          name: cleanName || f.name || 'Untitled Pipeline',
          updatedAt: f.modifiedTime ? new Date(f.modifiedTime).getTime() : Date.now(),
          nodeCount: 0,
          edgeCount: 0,
        };
      });
    } catch (e) {
      console.error('[GoogleDrive] listProjects error:', e);
      return [];
    }
  }

  async loadProject(fileId?: string): Promise<ProjectData | null> {
    if (!this.isAuthenticated || !this.hasDriveAccess || !this.accessToken) {
      const granted = await this.requestDriveAccess();
      if (!granted) return null;
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

  async deleteProject(fileId: string): Promise<{ success: boolean; message?: string }> {
    if (!this.isAuthenticated || !this.hasDriveAccess || !this.accessToken) {
      const granted = await this.requestDriveAccess();
      if (!granted) return { success: false, message: 'Google Drive permission not granted.' };
    }

    if (!fileId) return { success: false, message: 'Invalid file ID.' };

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (res.ok || res.status === 204 || res.status === 404) {
        return { success: true, message: 'Deleted file from Google Drive.' };
      }

      const errData = await res.json().catch(() => ({}));
      return { success: false, message: errData.error?.message || 'Failed to delete file from Google Drive.' };
    } catch (e: any) {
      console.error('[GoogleDrive] Delete error:', e);
      return { success: false, message: e.message || 'Failed to delete file from Google Drive.' };
    }
  }
}

import type { Notebook } from '../types/document';

export interface CloudAccount {
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  expiresAt: number;
}

export interface SyncStatusInfo {
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: number | null;
  errorMessage?: string;
  syncedFilesCount: number;
}

const STORAGE_KEY_AUTH = 'mednotes_gdrive_auth';
const STORAGE_KEY_CLIENT_ID = 'mednotes_gdrive_client_id';
const STORAGE_KEY_AUTO_SYNC = 'mednotes_auto_sync_enabled';
const DEFAULT_FOLDER_NAME = 'MedNotes_Backup';

export class GoogleDriveService {
  private static instance: GoogleDriveService;

  private constructor() {
    this.loadGsiScript();
  }

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  // Dynamically load Google Identity Services SDK
  private loadGsiScript() {
    if (typeof window === 'undefined') return;
    if (document.getElementById('gsi-client-script')) return;

    const script = document.createElement('script');
    script.id = 'gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  // Get saved Client ID
  public getClientId(): string {
    return (
      localStorage.getItem(STORAGE_KEY_CLIENT_ID) ||
      'YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com'
    );
  }

  public setClientId(clientId: string) {
    localStorage.setItem(STORAGE_KEY_CLIENT_ID, clientId.trim());
  }

  // Auto-sync setting
  public isAutoSyncEnabled(): boolean {
    const val = localStorage.getItem(STORAGE_KEY_AUTO_SYNC);
    return val !== 'false'; // Default to TRUE (like GoodNotes)
  }

  public setAutoSyncEnabled(enabled: boolean) {
    localStorage.setItem(STORAGE_KEY_AUTO_SYNC, enabled ? 'true' : 'false');
  }

  // Check saved session
  public getSavedAccount(): CloudAccount | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_AUTH);
      if (!data) return null;
      const account: CloudAccount = JSON.parse(data);
      if (Date.now() > account.expiresAt) {
        // Token expired
        return null;
      }
      return account;
    } catch {
      return null;
    }
  }

  public saveAccount(account: CloudAccount) {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(account));
  }

  public signOut() {
    localStorage.removeItem(STORAGE_KEY_AUTH);
  }

  // Authenticate with Google OAuth2 or Quick One-Click Login
  public async signIn(
    customClientId?: string,
    userProfile?: { email?: string; name?: string }
  ): Promise<CloudAccount> {
    const clientId = customClientId || this.getClientId();

    return new Promise((resolve, reject) => {
      // Fast 1-click login or demo account if no custom Google Cloud Client ID is configured
      if (
        !customClientId ||
        clientId.includes('YOUR_GOOGLE_CLIENT_ID') ||
        clientId === 'FAST_LOGIN' ||
        clientId === 'YOUR_GOOGLE_CLIENT_ID_DEMO'
      ) {
        const email = userProfile?.email?.trim() || 'bacsy.tuonglai@gmail.com';
        const rawName = userProfile?.name?.trim() || (email.split('@')[0].replace(/[._]/g, ' ') || 'Bác sĩ / Sinh viên Y khoa');
        const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

        const account: CloudAccount = {
          email,
          name: formattedName,
          picture: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80',
          accessToken: 'demo_token_' + Date.now(),
          expiresAt: Date.now() + 86400000 * 30, // 30 days
        };
        this.saveAccount(account);
        resolve(account);
        return;
      }

      // Real Google Identity Services (GIS)
      const google = (window as unknown as { google?: { accounts: { oauth2: { initTokenClient: (config: unknown) => { requestAccessToken: () => void } } } } }).google;
      if (!google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services SDK chưa sẵn sàng. Vui lòng thử lại sau 3 giây.'));
        return;
      }

      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file email profile',
          callback: async (tokenResponse: { access_token?: string; expires_in?: number; error?: string }) => {
            if (tokenResponse.error) {
              reject(new Error(tokenResponse.error));
              return;
            }

            const accessToken = tokenResponse.access_token;
            if (!accessToken) {
              reject(new Error('Không nhận được access token từ Google.'));
              return;
            }

            try {
              // Fetch user profile
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              const userData = await userRes.json();

              const account: CloudAccount = {
                email: userData.email || 'user@google.com',
                name: userData.name || 'Người dùng Google',
                picture: userData.picture,
                accessToken,
                expiresAt: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
              };

              this.saveAccount(account);
              resolve(account);
            } catch {
              const fallbackAccount: CloudAccount = {
                email: 'google_user@gmail.com',
                name: 'Google User',
                accessToken,
                expiresAt: Date.now() + 3600 * 1000,
              };
              this.saveAccount(fallbackAccount);
              resolve(fallbackAccount);
            }
          },
        });

        client.requestAccessToken();
      } catch (err) {
        reject(err);
      }
    });
  }

  // Find or create "MedNotes_Backup" folder on Google Drive
  private async getOrCreateBackupFolder(accessToken: string): Promise<string> {
    if (accessToken.startsWith('demo_token_')) {
      return 'demo_folder_id';
    }

    // 1. Search for existing folder
    const q = `mimeType='application/vnd.google-apps.folder' and name='${DEFAULT_FOLDER_NAME}' and trashed=false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // 2. Create folder if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: DEFAULT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    const folderData = await createRes.json();
    return folderData.id;
  }

  // Backup single notebook to Google Drive (uploads rendered PDF and vector JSON)
  public async uploadNotebook(
    notebook: Notebook,
    account: CloudAccount,
    pdfBlob?: Blob
  ): Promise<void> {
    if (account.accessToken.startsWith('demo_token_')) {
      // Simulate cloud latency
      await new Promise((r) => setTimeout(r, 400));
      try {
        const cloudStorageKey = `mednotes_gdrive_cloud_${account.email}`;
        const existingRaw = localStorage.getItem(cloudStorageKey);
        const existingData = existingRaw ? JSON.parse(existingRaw) : {};
        existingData[notebook.id] = {
          id: notebook.id,
          title: notebook.title,
          updatedAt: Date.now(),
          pagesCount: notebook.pages.length,
          folder: DEFAULT_FOLDER_NAME,
          hasPdf: !!pdfBlob,
          data: notebook,
        };
        localStorage.setItem(cloudStorageKey, JSON.stringify(existingData));
      } catch (e) {
        console.warn('Simulated cloud store write error', e);
      }
      return;
    }

    const folderId = await this.getOrCreateBackupFolder(account.accessToken);
    const cleanTitle = notebook.title.replace(/[/\\?%*:|"<>]/g, '_').trim();

    // 1. Upload/Update Rendered PDF file (.pdf) for direct viewing on Google Drive & mobile
    if (pdfBlob) {
      try {
        const pdfFileName = `${cleanTitle}.pdf`;
        const qPdf = `name='${pdfFileName}' and '${folderId}' in parents and trashed=false`;
        const pdfSearchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qPdf)}&fields=files(id)`,
          { headers: { Authorization: `Bearer ${account.accessToken}` } }
        );

        let targetPdfId: string | null = null;
        if (pdfSearchRes.ok) {
          const data = await pdfSearchRes.json();
          if (data.files && data.files.length > 0) {
            targetPdfId = data.files[0].id;
          }
        }

        // If file doesn't exist, create file metadata first (bulletproof 2-step Google Drive API upload)
        if (!targetPdfId) {
          const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${account.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: pdfFileName,
              parents: [folderId],
              mimeType: 'application/pdf',
            }),
          });
          if (createRes.ok) {
            const data = await createRes.json();
            targetPdfId = data.id;
          } else {
            console.error('Failed to create PDF metadata on Drive:', await createRes.text());
          }
        }

        // Upload/Update binary content
        if (targetPdfId) {
          const uploadRes = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files/${targetPdfId}?uploadType=media`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${account.accessToken}`,
                'Content-Type': 'application/pdf',
              },
              body: pdfBlob,
            }
          );
          if (!uploadRes.ok) {
            console.error('Failed to upload PDF binary on Drive:', await uploadRes.text());
          }
        }
      } catch (err) {
        console.error('Failed to upload PDF file to Drive:', err);
      }
    }

    // 2. Upload/Update Vector JSON backup (.mednote.json for restoring vector edit layers)
    try {
      const jsonFileName = `${cleanTitle}.mednote.json`;
      const q = `name='${jsonFileName}' and '${folderId}' in parents and trashed=false`;
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
        { headers: { Authorization: `Bearer ${account.accessToken}` } }
      );

      let targetJsonId: string | null = null;
      if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.files && data.files.length > 0) {
          targetJsonId = data.files[0].id;
        }
      }

      if (!targetJsonId) {
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: jsonFileName,
            parents: [folderId],
            mimeType: 'application/json',
          }),
        });
        if (createRes.ok) {
          const data = await createRes.json();
          targetJsonId = data.id;
        }
      }

      if (targetJsonId) {
        const payload = JSON.stringify(notebook, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${targetJsonId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${account.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: blob,
          }
        );
      }
    } catch (jsonErr) {
      console.warn('Vector JSON backup error:', jsonErr);
    }
  }

  // Delete old .mednote.json files from MedNotes_Backup folder on Google Drive
  public async deleteOldJsonBackups(account: CloudAccount): Promise<number> {
    if (account.accessToken.startsWith('demo_token_')) return 0;
    try {
      const folderId = await this.getOrCreateBackupFolder(account.accessToken);
      const q = `'${folderId}' in parents and name contains '.mednote.json' and trashed=false`;
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=100`,
        { headers: { Authorization: `Bearer ${account.accessToken}` } }
      );
      if (!searchRes.ok) return 0;
      const data = await searchRes.json();
      let count = 0;
      for (const file of data.files || []) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${account.accessToken}` },
        });
        count++;
      }
      return count;
    } catch (err) {
      console.warn('Failed to clean up old JSON backups:', err);
      return 0;
    }
  }

  // Sync all notebooks
  public async syncAllNotebooks(
    notebooks: Notebook[],
    account: CloudAccount,
    onProgress?: (synced: number, total: number) => void,
    getPdfBlob?: (notebook: Notebook) => Promise<Blob | null>
  ): Promise<void> {
    for (let i = 0; i < notebooks.length; i++) {
      let pdfBlob: Blob | undefined;
      if (getPdfBlob) {
        try {
          const b = await getPdfBlob(notebooks[i]);
          if (b) pdfBlob = b;
        } catch (e) {
          console.warn('Could not generate PDF for sync', e);
        }
      }
      await this.uploadNotebook(notebooks[i], account, pdfBlob);
      if (onProgress) {
        onProgress(i + 1, notebooks.length);
      }
    }
  }
}

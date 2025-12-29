declare var google: any;

// Client ID do Google Cloud Console
const CLIENT_ID = '903360204952-fb7gtkphn6n7um98ca9obkcp7gmt8qoc.apps.googleusercontent.com'; 
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export const googleDriveService = {
  tokenClient: null as any,
  accessToken: localStorage.getItem('fincontrol_gdrive_token'),
  tokenExpiry: parseInt(localStorage.getItem('fincontrol_gdrive_expiry') || '0'),

  init() {
    if (typeof google !== 'undefined' && google.accounts) {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.access_token) {
            this.setToken(response.access_token, response.expires_in);
          }
        },
      });
    }
  },

  setToken(token: string, expiresIn: number) {
    this.accessToken = token;
    const expiryTime = Date.now() + expiresIn * 1000;
    this.tokenExpiry = expiryTime;
    localStorage.setItem('fincontrol_gdrive_token', token);
    localStorage.setItem('fincontrol_gdrive_expiry', expiryTime.toString());
    
    // Dispara evento customizado para atualizar a UI
    window.dispatchEvent(new Event('gdrive_token_updated'));
  },

  isAuthenticated() {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  },

  requestToken() {
    if (!this.tokenClient) this.init();
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken();
    } else {
      console.error("Google Identity Services not loaded yet.");
      alert("Erro ao carregar serviços do Google. Verifique sua conexão.");
    }
  },

  logout() {
    this.accessToken = null;
    this.tokenExpiry = 0;
    localStorage.removeItem('fincontrol_gdrive_token');
    localStorage.removeItem('fincontrol_gdrive_expiry');
    // Revoke permissions if needed (optional)
    if (typeof google !== 'undefined' && this.accessToken) {
        google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
    window.dispatchEvent(new Event('gdrive_token_updated'));
  },

  async uploadFile(content: string, filename: string): Promise<{ success: boolean; message?: string }> {
    if (!this.isAuthenticated()) {
      return { success: false, message: 'Token expirado ou não autenticado.' };
    }

    const file = new Blob([content], { type: 'application/json' });
    const metadata = {
      name: filename,
      mimeType: 'application/json',
      // Parents: ['appDataFolder'] // Opcional: Salvar na pasta oculta de dados do app
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    try {
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: form,
      });

      const data = await response.json();
      if (response.ok) {
        return { success: true, message: 'Backup salvo no Google Drive!' };
      } else {
        console.error('Drive Upload Error:', data);
        return { success: false, message: `Erro no Google Drive: ${data.error?.message || 'Desconhecido'}` };
      }
    } catch (error: any) {
      console.error('Network Error:', error);
      return { success: false, message: 'Erro de conexão com Google Drive.' };
    }
  }
};

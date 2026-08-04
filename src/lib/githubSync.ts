import { EcosystemEntity, GitHubConfig } from '../types';

export const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  owner: '',
  repo: '',
  filePath: 'entities.json',
  branch: 'main',
  token: '',
  autoSyncOnApprove: true
};

/**
 * Unicode-safe Base64 encoding for UTF-8 JSON string
 */
function utf8ToBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
}

/**
 * Unicode-safe Base64 decoding
 */
function base64ToUtf8(str: string): string {
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(str.replace(/\s/g, '')), function (c: string) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );
}

/**
 * Reads entities.json from GitHub repository
 */
export async function fetchEntitiesFromGitHub(config: GitHubConfig): Promise<{
  success: boolean;
  data?: EcosystemEntity[];
  sha?: string;
  error?: string;
}> {
  try {
    const { owner, repo, filePath, branch, token } = config;
    if (!owner || !repo) {
      return { success: false, error: 'GitHub Kullanıcı Adı / Repo bilgisi eksik.' };
    }

    const pathClean = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${pathClean}?ref=${branch || 'main'}`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (token && token.trim()) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const res = await fetch(apiUrl, { headers });

    if (!res.ok) {
      // Fallback to raw github URL if API fails (e.g. rate limit or public raw)
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'main'}/${pathClean}`;
      const rawRes = await fetch(rawUrl);
      if (rawRes.ok) {
        const parsed = await rawRes.json();
        if (Array.isArray(parsed)) {
          return { success: true, data: parsed };
        }
      }
      return {
        success: false,
        error: `GitHub yanıt veremedi (${res.status}). Repo adı, dosya yolu veya erişim iznini kontrol edin.`
      };
    }

    const fileMeta = await res.json();
    let jsonText = '';

    if (fileMeta.content) {
      jsonText = base64ToUtf8(fileMeta.content);
    } else if (fileMeta.download_url) {
      const rawRes = await fetch(fileMeta.download_url);
      jsonText = await rawRes.text();
    }

    const parsedData = JSON.parse(jsonText);
    if (!Array.isArray(parsedData)) {
      return { success: false, error: 'GitHub dosya içeriği geçerli bir JSON dizisi (array) değil.' };
    }

    return {
      success: true,
      data: parsedData,
      sha: fileMeta.sha
    };
  } catch (err: any) {
    console.error('GitHub fetch failed:', err);
    return { success: false, error: err.message || 'GitHub ile iletişim kurulurken bir hata oluştu.' };
  }
}

/**
 * Commits updated entities.json directly to GitHub repository via GitHub API
 */
export async function commitEntitiesToGitHub(
  config: GitHubConfig,
  entities: EcosystemEntity[],
  commitMessage: string = 'Update entities.json via Mamuthub Admin'
): Promise<{
  success: boolean;
  sha?: string;
  error?: string;
}> {
  try {
    const { owner, repo, filePath, branch, token } = config;
    if (!owner || !repo || !token) {
      return {
        success: false,
        error: 'GitHub Commit işlemi için Kullanıcı Adı, Repo ve GitHub Personal Access Token (PAT) zorunludur.'
      };
    }

    const pathClean = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${pathClean}`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json'
    };

    // First get current file SHA (required for update)
    let currentSha: string | undefined = config.lastCommitSha;
    const getRes = await fetch(`${apiUrl}?ref=${branch || 'main'}`, { headers });

    if (getRes.ok) {
      const fileMeta = await getRes.json();
      currentSha = fileMeta.sha;
    }

    const jsonString = JSON.stringify(entities, null, 2);
    const base64Content = utf8ToBase64(jsonString);

    const bodyData: any = {
      message: commitMessage,
      content: base64Content,
      branch: branch || 'main'
    };

    if (currentSha) {
      bodyData.sha = currentSha;
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(bodyData)
    });

    const putData = await putRes.json();

    if (!putRes.ok) {
      throw new Error(putData.message || `GitHub Commit hatası (${putRes.status})`);
    }

    return {
      success: true,
      sha: putData.content?.sha || putData.commit?.sha
    };
  } catch (err: any) {
    console.error('GitHub Commit failed:', err);
    return { success: false, error: err.message || 'GitHub depoma commit atılırken bir hata oluştu.' };
  }
}

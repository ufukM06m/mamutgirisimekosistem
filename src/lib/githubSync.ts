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
 * Reads entities.json or ecosystem.json from GitHub repository with fallback paths
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

    const pathClean = filePath ? (filePath.startsWith('/') ? filePath.substring(1) : filePath) : 'entities.json';
    const candidatePaths = Array.from(new Set([
      pathClean,
      'entities.json',
      'ecosystem.json',
      'src/data/entities.json',
      'public/entities.json'
    ].filter(Boolean)));

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (token && token.trim()) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    // Try candidate paths in order
    for (const p of candidatePaths) {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${p}?ref=${branch || 'main'}`;
      try {
        const res = await fetch(apiUrl, { headers });
        if (res.ok) {
          const fileMeta = await res.json();
          let jsonText = '';

          if (fileMeta.content) {
            jsonText = base64ToUtf8(fileMeta.content);
          } else if (fileMeta.download_url) {
            const rawRes = await fetch(fileMeta.download_url);
            jsonText = await rawRes.text();
          }

          const parsedData = JSON.parse(jsonText);
          if (Array.isArray(parsedData)) {
            return {
              success: true,
              data: parsedData,
              sha: fileMeta.sha
            };
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch from ${p}:`, err);
      }
    }

    // Fallback to raw github URLs
    for (const p of candidatePaths) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'main'}/${p}`;
      try {
        const rawRes = await fetch(rawUrl);
        if (rawRes.ok) {
          const parsed = await rawRes.json();
          if (Array.isArray(parsed)) {
            return { success: true, data: parsed };
          }
        }
      } catch (e) {
        // ignore
      }
    }

    return {
      success: false,
      error: `GitHub reposundan veri okunamadı (${candidatePaths.join(', ')} dosyaları bulunamadı veya erişilemedi).`
    };
  } catch (err: any) {
    console.error('GitHub fetch failed:', err);
    return { success: false, error: err.message || 'GitHub ile iletişim kurulurken bir hata oluştu.' };
  }
}

/**
 * Commits updated entities directly to GitHub repository (syncs entities.json, ecosystem.json, and src/data/entities.json) via GitHub API
 */
export async function commitEntitiesToGitHub(
  config: GitHubConfig,
  entities: EcosystemEntity[],
  commitMessage: string = 'Update entities.json & ecosystem.json via Mamuthub Admin'
): Promise<{
  success: boolean;
  sha?: string;
  updatedFiles?: string[];
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

    const primaryPath = filePath ? (filePath.startsWith('/') ? filePath.substring(1) : filePath) : 'entities.json';
    
    // Target paths to keep all potential deployment sources updated
    const targetPaths = Array.from(new Set([
      primaryPath,
      'entities.json',
      'ecosystem.json',
      'src/data/entities.json',
      'public/entities.json'
    ].filter(Boolean)));

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json'
    };

    const jsonString = JSON.stringify(entities, null, 2);
    const base64Content = utf8ToBase64(jsonString);

    const successfulCommits: string[] = [];
    let lastSha: string | undefined = undefined;
    let lastError: string | undefined = undefined;

    for (const targetPath of targetPaths) {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`;

      // Check existing SHA
      let currentSha: string | undefined = undefined;
      try {
        const getRes = await fetch(`${apiUrl}?ref=${branch || 'main'}`, { headers });
        if (getRes.ok) {
          const fileMeta = await getRes.json();
          currentSha = fileMeta.sha;
        }
      } catch (e) {
        // file might not exist yet, which is fine
      }

      const bodyData: any = {
        message: `${commitMessage} [${targetPath}]`,
        content: base64Content,
        branch: branch || 'main'
      };

      if (currentSha) {
        bodyData.sha = currentSha;
      }

      try {
        const putRes = await fetch(apiUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify(bodyData)
        });

        const putData = await putRes.json();

        if (putRes.ok) {
          successfulCommits.push(targetPath);
          lastSha = putData.content?.sha || putData.commit?.sha || lastSha;
        } else {
          console.warn(`Commit to ${targetPath} failed:`, putData.message);
          lastError = putData.message || `HTTP ${putRes.status}`;
        }
      } catch (err: any) {
        console.error(`Error committing to ${targetPath}:`, err);
        lastError = err.message;
      }
    }

    if (successfulCommits.length > 0) {
      return {
        success: true,
        sha: lastSha,
        updatedFiles: successfulCommits
      };
    } else {
      return {
        success: false,
        error: lastError || 'GitHub commit atılamadı. Token izinlerini ve Repo adını kontrol edin.'
      };
    }
  } catch (err: any) {
    console.error('GitHub Commit failed:', err);
    return { success: false, error: err.message || 'GitHub depoma commit atılırken bir hata oluştu.' };
  }
}

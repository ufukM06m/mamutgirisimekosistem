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

    // 1. Try server-side proxy endpoint first (avoids CORS issues completely)
    try {
      const proxyRes = await fetch('/api/github/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          filePath: primaryPath,
          branch,
          token,
          entities,
          commitMessage
        })
      });

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData.success) {
          return {
            success: true,
            sha: proxyData.sha,
            updatedFiles: proxyData.updatedFiles
          };
        }
      }
    } catch (proxyErr) {
      console.warn('Server proxy commit unavailable, falling back to direct browser fetch...', proxyErr);
    }

    // 2. Direct browser fetch fallback (using clean CORS headers)
    const jsonString = JSON.stringify(entities, null, 2);
    const base64Content = utf8ToBase64(jsonString);

    const successfulCommits: string[] = [];
    let lastSha: string | undefined = undefined;
    let lastError: string | undefined = undefined;

    for (const targetPath of targetPaths) {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`;

      // Helper function to fetch fresh SHA from GitHub with cache busting query param only
      const fetchFreshSha = async (): Promise<string | undefined> => {
        try {
          const freshRes = await fetch(`${apiUrl}?ref=${branch || 'main'}&_t=${Date.now()}`, {
            headers
          });
          if (freshRes.ok) {
            const fileMeta = await freshRes.json();
            return fileMeta.sha;
          }
        } catch (e) {
          console.warn(`Could not fetch fresh SHA for ${targetPath}:`, e);
        }
        return undefined;
      };

      let currentSha = await fetchFreshSha();

      const attemptPut = async (shaToUse?: string) => {
        const bodyData: any = {
          message: `${commitMessage} [${targetPath}]`,
          content: base64Content,
          branch: branch || 'main'
        };

        if (shaToUse) {
          bodyData.sha = shaToUse;
        }

        const putRes = await fetch(apiUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify(bodyData)
        });

        const putData = await putRes.json();
        return { ok: putRes.ok, status: putRes.status, data: putData };
      };

      try {
        let result = await attemptPut(currentSha);

        // If SHA mismatch error occurs (e.g. 409 Conflict or "does not match"), retry once with fresh SHA
        if (!result.ok && (result.status === 409 || (result.data?.message && result.data.message.toLowerCase().includes('does not match')))) {
          console.warn(`SHA mismatch for ${targetPath}, retrying with fresh SHA...`);
          currentSha = await fetchFreshSha();
          result = await attemptPut(currentSha);
        }

        if (result.ok) {
          successfulCommits.push(targetPath);
          lastSha = result.data.content?.sha || result.data.commit?.sha || lastSha;
        } else {
          console.warn(`Commit to ${targetPath} failed:`, result.data?.message);
          lastError = result.data?.message || `HTTP ${result.status}`;
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

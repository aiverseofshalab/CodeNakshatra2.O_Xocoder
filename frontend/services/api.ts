import type { AnalyzerGraphData } from '@/types/graph';

const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8001';
    }
  }

  return 'https://openpulse-43sj.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

export class ApiClient {
  constructor(private readonly baseUrl: string = API_BASE_URL) {
    console.log(`[API Client] Initialized with base URL: ${this.baseUrl}`);
  }

  async health(): Promise<{ status: string; service: string; version: string }> {
    const response = await fetch(`${this.baseUrl}/health`, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json();
  }

  async analyzeRepository(repo: string): Promise<AnalyzerGraphData> {

    const parsed = this.parseRepoInput(repo);

    if (!parsed) {
      throw new Error('Invalid repository format');
    }

    const response = await fetch(`${this.baseUrl}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner: parsed.owner,
        repo: parsed.repo,
        ecosystem: null,
      }),
    });

    if (!response.ok) {
      throw new Error('Repository analysis failed');
    }

    return response.json();
  }

  async getDependencyAdvice(packageName: string) {

    const response = await fetch(`${this.baseUrl}/api/advisor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        package_name: packageName,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dependency advice');
    }

    return response.json();
  }

  private parseRepoInput(raw: string): { owner: string; repo: string } | null {

    const s = raw.trim().replace(/\.git$/, '');

    const urlMatch = s.match(/github\.com\/([^/]+)\/([^/]+)/);

    if (urlMatch) {
      return {
        owner: urlMatch[1],
        repo: urlMatch[2]
      };
    }

    const slashMatch = s.match(/^([^/]+)\/([^/]+)$/);

    if (slashMatch) {
      return {
        owner: slashMatch[1],
        repo: slashMatch[2]
      };
    }

    return null;
  }
}

export const apiClient = new ApiClient();
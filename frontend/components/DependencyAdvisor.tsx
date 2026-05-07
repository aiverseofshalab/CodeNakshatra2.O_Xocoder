'use client';

import { useState } from 'react';
import { apiClient } from '@/services/api';

export default function DependencyAdvisor() {

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function analyze() {

    if (!query) return;

    try {

      setLoading(true);

      const res = await apiClient.getDependencyAdvice(query);

      setResult(res.data);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mt-4">

      <h2 className="text-white text-sm font-semibold mb-3">
        AI Dependency Advisor
      </h2>

      <div className="flex gap-2">

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search dependency..."
          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
        />

        <button
          onClick={analyze}
          className="px-4 py-2 rounded-xl bg-white text-black text-sm font-medium"
        >
          Analyze
        </button>

      </div>

      {loading && (
        <p className="text-xs text-white/60 mt-3">
          Analyzing dependency...
        </p>
      )}

      {result && (
        <div className="mt-4 text-xs text-white space-y-3">

          <div>
            <span className="text-white/50">Package:</span>
            <div>{result.package}</div>
          </div>

          <div>
            <span className="text-white/50">Purpose:</span>
            <div>{result.purpose}</div>
          </div>

          <div>
            <span className="text-white/50">Risk:</span>
            <div>{result.risk_level}</div>
          </div>

          <div>
            <span className="text-white/50">Recommendation:</span>
            <div>{result.recommendation}</div>
          </div>

          <div>
            <span className="text-white/50">Modern Choice:</span>
            <div>{result.modern_choice}</div>
          </div>

          <div>
            <span className="text-white/50">Fastest Choice:</span>
            <div>{result.fastest_choice}</div>
          </div>

          <div>
            <span className="text-white/50">Safest Choice:</span>
            <div>{result.safest_choice}</div>
          </div>

          <div>
            <span className="text-white/50 block mb-2">
              Alternatives:
            </span>

            <div className="space-y-2">

              {result.best_alternatives?.map((alt: any, index: number) => (
                <div
                  key={index}
                  className="border border-white/10 rounded-xl p-2"
                >
                  <div className="font-semibold">
                    {alt.name}
                  </div>

                  <div className="text-white/70">
                    {alt.reason}
                  </div>

                  <div className="text-green-400">
                    Score: {alt.score}
                  </div>
                </div>
              ))}

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
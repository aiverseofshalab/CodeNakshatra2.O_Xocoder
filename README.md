# OpenPulse

[![License](https://img.shields.io/badge/License-Apache%202.0-blue)](https://opensource.org/licenses/Apache-2.0)
![PWA](https://img.shields.io/badge/PWA-Enabled-blue)
![Offline](https://img.shields.io/badge/Offline-Ready-blue)
![Hackathon](https://img.shields.io/badge/FOSS%20Hack-2026-orange)

OpenPulse (built during Code Nakshatra 2.O) is a deployable dependency-graph explorer for public GitHub repositories. Enter a repository in `owner/name` format, let the FastAPI backend fetch its `package.json`, and inspect the resulting dependency graph in a performant 3D scene built with Next.js, react-three-fiber, and Three.js.

![download (1) (2)](https://github.com/user-attachments/assets/92154596-4f8c-44ed-bb79-8f33376f9e3a)


🎥 Full Demo Video: [Watch on YouTube](https://youtu.be/2wZaQG6DARE?si=cDe2bYSiSR88fzaz)

🌐 Live Demo: [OpenPulse](https://open-pulse.onrender.com/)

## Problem statement

Dependency trees are easy to generate but hard to understand. Flat package lists hide which repositories are pulling in many direct dependencies, which packages look riskier than others, and how a project is structurally organized. OpenPulse turns that package list into an interactive graph that is quick enough for live demos and simple enough to deploy on Vercel and Render.

## Features

- Analyze a public GitHub repository through `GET /analyze?repo=owner/name`.
- Fetch repository metadata and decode the root `package.json` through the GitHub API.
- Extract direct dependencies only and cap the graph to 120 nodes for smooth rendering.
- Compute deterministic pseudo-random risk scores from package names.
- Fall back to a deterministic clustered demo dataset when analysis fails.
- Render nodes with `THREE.InstancedMesh` and edges with `LineSegments`.
- Inspect node details, risk, and connectivity from the side panel.
- Ship with CORS, health checks, env examples, and deployment-ready defaults.

## Architecture

### Backend

- **FastAPI** serves `/analyze`, `/health`, and the legacy `/api/graph/*` routes.
- **GitHub analyzer service** fetches repository metadata and `package.json` using async `httpx` requests.
- **Risk scoring** hashes each package name to create a stable risk score from `0.12` to `0.88`.
- **Graph payload** returns compact graph JSON:

```json
{
  "nodes": [{ "id": "facebook/react", "type": "repository", "risk": 0.12, "size": 2.6 }],
  "edges": [{ "source": "facebook/react", "target": "scheduler" }]
}
```

### Frontend

- **Next.js App Router** hosts the dashboard shell.
- **Zustand** stores the graph and node selection state.
- **react-three-fiber** renders the scene.
- **Three.js** powers instanced spheres, line segments, orbit controls, and fog.
- **Graph normalization** converts backend graph payloads into clustered 3D positions for smooth exploration.

## Local development

### Prerequisites

- Node.js 18+
- Python 3.11+

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`, enter a repository such as `facebook/react`, and click **Analyze**.

## Demo usage

1. Start the backend and frontend.
2. Open the homepage.
3. Enter `facebook/react`.
4. Click **Analyze**.
5. Wait for the staged loading messages:
   - `Fetching repository...`
   - `Building graph...`
   - `Rendering...`
6. Drag to orbit, scroll to zoom, and click a node to inspect its details.
7. If GitHub analysis fails, use **Load Demo** or let the automatic fallback graph render.

## Deployment

### Frontend on Vercel

1. Import the `frontend` directory as a Vercel project.
2. Set the build command to `npm run build` and output defaults for Next.js.
3. Add an environment variable:
   - `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com`
4. Deploy.

### Backend on Render

1. Create a new Web Service pointing at the `backend` directory.
2. Use the start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

3. Add environment variables:
   - `FRONTEND_URL=https://<your-vercel-app>.vercel.app`
   - `CORS_ORIGINS=https://<your-vercel-app>.vercel.app`
   - `GITHUB_TOKEN=<optional but recommended for higher rate limits>`
   - `MAX_GRAPH_NODES=120`
4. Deploy and verify `GET /health`.

## Environment variables

### Backend

- `API_HOST`
- `API_PORT`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `GITHUB_TOKEN`
- `GITHUB_API_BASE`
- `REQUEST_TIMEOUT`
- `MAX_GRAPH_NODES`
- `DATABASE_URL`
- `DATABASE_ECHO`

### Frontend

- `NEXT_PUBLIC_API_URL`

## Error handling

The analyzer explicitly returns useful API errors for:

- invalid repository format
- repository not found
- missing `package.json`
- GitHub API rate limits
- invalid `package.json` content
- repositories with zero direct dependencies

## Demo dataset generator

Regenerate the bundled demo dataset at any time:

```bash
python scripts/demo_data_generator.py
```

This produces `docs/demo_dataset.json` with a 120-node clustered graph compatible with the frontend renderer.

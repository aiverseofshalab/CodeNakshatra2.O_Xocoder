import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self) -> None:
        self.api_host = os.getenv('API_HOST', '0.0.0.0')
        self.api_port = int(os.getenv('API_PORT', '8001'))

        self.github_token = os.getenv('GITHUB_TOKEN', '').strip()
        self.github_api_base = os.getenv(
            'GITHUB_API_BASE',
            'https://api.github.com'
        ).rstrip('/')

        # ✅ GROQ
        self.groq_api_key = os.getenv('GROQ_API_KEY', '').strip()

        self.frontend_url = os.getenv(
            'FRONTEND_URL',
            'https://open-pulse.onrender.com'
        )

        self.cors_origins = [
            self.frontend_url,
            'https://openpulse-43sj.onrender.com',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:8001',
            'http://127.0.0.1:8001',
        ]

        self.max_graph_nodes = int(
            os.getenv('MAX_GRAPH_NODES', '120')
        )

        self.request_timeout = float(
            os.getenv('REQUEST_TIMEOUT', '30')
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
import json
from groq import Groq

from app.core.config import get_settings

settings = get_settings()

client = Groq(
    api_key=settings.groq_api_key
)


async def dependency_advice(package_name: str):

    prompt = f"""
You are an expert software architect and dependency security analyst.

Analyze this software dependency/package:

PACKAGE:
{package_name}

Rules:
- Return ONLY valid JSON
- No markdown
- No explanation outside JSON
- Alternatives must be real packages
- Keep responses concise

JSON FORMAT:

{{
  "package": "",
  "purpose": "",
  "risk_level": "",
  "best_alternatives": [
    {{
      "name": "",
      "reason": "",
      "score": ""
    }}
  ],
  "recommendation": "",
  "modern_choice": "",
  "fastest_choice": "",
  "safest_choice": ""
}}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2,
            max_tokens=800,
        )

        content = response.choices[0].message.content.strip()

        # Remove markdown wrappers if model adds them
        content = content.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(content)

        return parsed

    except Exception as e:
        return {
            "package": package_name,
            "purpose": "Unable to analyze dependency",
            "risk_level": "unknown",
            "best_alternatives": [],
            "recommendation": str(e),
            "modern_choice": "",
            "fastest_choice": "",
            "safest_choice": ""
        }
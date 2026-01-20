"""Mistral AI service for text extraction and embeddings."""
import os
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential


class MistralService:
    """Service for Mistral AI operations."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("MISTRAL_API_KEY", "")
        self.base_url = "https://api.mistral.ai/v1"
        self.embedding_model = "mistral-embed"
        self.chat_model = "mistral-large-latest"

    def _get_headers(self) -> Dict[str, str]:
        """Get API headers."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for a list of texts using Mistral."""
        if not self.api_key:
            # Return mock embeddings for demo if no API key
            import random
            return [[random.uniform(-1, 1) for _ in range(1024)] for _ in texts]

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/embeddings",
                headers=self._get_headers(),
                json={
                    "model": self.embedding_model,
                    "input": texts
                }
            )
            response.raise_for_status()
            data = response.json()
            return [item["embedding"] for item in data["data"]]

    async def get_embedding(self, text: str) -> List[float]:
        """Get embedding for a single text."""
        embeddings = await self.get_embeddings([text])
        return embeddings[0]

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def extract_structured_content(self, text: str) -> Dict[str, Any]:
        """Extract structured content from text using Mistral."""
        if not self.api_key:
            # Return mock extraction for demo
            return self._mock_extraction(text)

        prompt = """Analyze the following document text and extract structured information.
Return a JSON object with:
- "summary": A brief summary of the document (2-3 sentences)
- "topics": List of main topics discussed
- "entities": List of key entities (people, organizations, concepts) with their types
- "keywords": List of important keywords
- "relationships": List of relationships between entities in format {"source": "", "target": "", "relation": ""}

Document text:
{text}

Return only valid JSON, no other text."""

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._get_headers(),
                json={
                    "model": self.chat_model,
                    "messages": [
                        {"role": "user", "content": prompt.format(text=text[:15000])}
                    ],
                    "response_format": {"type": "json_object"}
                }
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]

            import json
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                return self._mock_extraction(text)

    def _mock_extraction(self, text: str) -> Dict[str, Any]:
        """Generate mock extraction for demo purposes."""
        words = text.split()[:100]
        
        # Extract potential topics from text
        topics = []
        keywords = []
        for word in words:
            if len(word) > 5 and word.isalpha():
                if len(topics) < 5:
                    topics.append(word.lower())
                if len(keywords) < 10:
                    keywords.append(word.lower())

        return {
            "summary": f"Document containing {len(words)} words discussing various topics.",
            "topics": list(set(topics))[:5] if topics else ["general", "document"],
            "entities": [
                {"name": "Document", "type": "concept"},
                {"name": "Content", "type": "concept"}
            ],
            "keywords": list(set(keywords))[:10] if keywords else ["content", "text"],
            "relationships": []
        }

    async def extract_topics_from_chunks(self, chunks: List[str]) -> List[Dict[str, Any]]:
        """Extract topics from multiple text chunks."""
        topics = []
        
        for i, chunk in enumerate(chunks):
            extraction = await self.extract_structured_content(chunk)
            for topic in extraction.get("topics", []):
                topics.append({
                    "name": topic,
                    "chunk_index": i,
                    "keywords": extraction.get("keywords", []),
                    "entities": extraction.get("entities", [])
                })

        return topics

    async def generate_topic_description(self, topic_name: str, context: str) -> str:
        """Generate a description for a topic based on context."""
        if not self.api_key:
            return f"Topic about {topic_name} based on document analysis."

        prompt = f"""Given the topic "{topic_name}" and the following context, generate a brief description (1-2 sentences) of what this topic covers.

Context:
{context[:3000]}

Description:"""

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._get_headers(),
                json={
                    "model": self.chat_model,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 150
                }
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()

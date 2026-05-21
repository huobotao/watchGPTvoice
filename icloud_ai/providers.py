"""Pluggable LLM backends. Same interface for OpenAI / Anthropic / Ollama.

Anthropic gets explicit prompt-cache markers on the system block so re-runs
against the same corpus are cheap. OpenAI does automatic caching above 1k tokens
in recent SDKs; nothing to do client-side. Ollama is local, caching N/A.
"""
from __future__ import annotations

import os
from abc import ABC, abstractmethod


class LLMProvider(ABC):
    name: str

    @abstractmethod
    def chat(self, system: str, user: str, *, cache_system: bool = True) -> str:
        ...


class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(self, model: str = "gpt-4o"):
        from openai import OpenAI
        self.client = OpenAI()
        self.model = model

    def chat(self, system: str, user: str, *, cache_system: bool = True) -> str:
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return resp.choices[0].message.content or ""


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(self, model: str = "claude-opus-4-7"):
        from anthropic import Anthropic
        self.client = Anthropic()
        self.model = model

    def chat(self, system: str, user: str, *, cache_system: bool = True) -> str:
        system_blocks: list[dict] = [{"type": "text", "text": system}]
        if cache_system:
            system_blocks[0]["cache_control"] = {"type": "ephemeral"}
        msg = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_blocks,
            messages=[{"role": "user", "content": user}],
        )
        return "".join(getattr(b, "text", "") for b in msg.content)


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self, model: str = "llama3.1:8b", base_url: str | None = None):
        import httpx
        self.client = httpx.Client(timeout=600)
        self.base_url = base_url or os.environ.get(
            "OLLAMA_HOST", "http://localhost:11434"
        )
        self.model = model

    def chat(self, system: str, user: str, *, cache_system: bool = True) -> str:
        resp = self.client.post(
            f"{self.base_url}/api/chat",
            json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "stream": False,
            },
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"]


_DEFAULTS = {
    "openai": "gpt-4o",
    "anthropic": "claude-opus-4-7",
    "ollama": "llama3.1:8b",
}


def make_provider(name: str, model: str | None = None) -> LLMProvider:
    name = name.lower()
    model = model or _DEFAULTS.get(name)
    if name == "openai":
        return OpenAIProvider(model)
    if name == "anthropic":
        return AnthropicProvider(model)
    if name == "ollama":
        return OllamaProvider(model)
    raise ValueError(f"unknown provider: {name!r}. choose from {list(_DEFAULTS)}")

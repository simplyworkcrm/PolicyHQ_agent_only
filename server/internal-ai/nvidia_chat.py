import argparse
import os
from pathlib import Path
import sys

from openai import OpenAI


DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"


def load_dotenv_value(key: str) -> str:
    script_path = Path(__file__).resolve()
    candidate_paths = [
        script_path.parents[1] / ".env",
        script_path.parents[2] / ".env",
    ]

    for env_path in candidate_paths:
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            name, value = line.split("=", 1)
            if name.strip().lstrip("\ufeff") == key:
                return value.strip().strip('"').strip("'")

    return ""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Direct NVIDIA chat client for PolicyHQ internal AI testing."
    )
    parser.add_argument(
        "prompt",
        nargs="?",
        default="",
        help="Prompt to send. If omitted, stdin will be used.",
    )
    parser.add_argument(
        "--model",
        default=os.getenv("NVIDIA_MODEL", DEFAULT_MODEL),
        help=f"Model name. Defaults to {DEFAULT_MODEL}.",
    )
    parser.add_argument(
        "--base-url",
        default=os.getenv("NVIDIA_BASE_URL", DEFAULT_BASE_URL),
        help=f"Base URL. Defaults to {DEFAULT_BASE_URL}.",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.6,
        help="Sampling temperature.",
    )
    parser.add_argument(
        "--top-p",
        type=float,
        default=0.95,
        help="Top-p value.",
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=65536,
        help="Max output tokens.",
    )
    parser.add_argument(
        "--reasoning-budget",
        type=int,
        default=16384,
        help="Reasoning budget passed in extra_body.",
    )
    parser.add_argument(
        "--disable-thinking",
        action="store_true",
        help="Disable reasoning/thinking mode.",
    )
    return parser


def read_prompt(args: argparse.Namespace) -> str:
    if args.prompt.strip():
        return args.prompt.strip()

    if not sys.stdin.isatty():
        return sys.stdin.read().strip()

    return ""


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    api_key = os.getenv("NVIDIA_API_KEY", "").strip() or load_dotenv_value("NVIDIA_API_KEY")
    if not api_key:
        print("Missing NVIDIA_API_KEY environment variable.", file=sys.stderr)
        return 1

    prompt = read_prompt(args)
    if not prompt:
        print("A prompt is required.", file=sys.stderr)
        return 1

    client = OpenAI(
        base_url=args.base_url,
        api_key=api_key,
    )

    extra_body = {
        "chat_template_kwargs": {
            "enable_thinking": not args.disable_thinking,
        },
        "reasoning_budget": args.reasoning_budget,
    }

    completion = client.chat.completions.create(
        model=args.model,
        messages=[{"role": "user", "content": prompt}],
        temperature=args.temperature,
        top_p=args.top_p,
        max_tokens=args.max_tokens,
        extra_body=extra_body,
        stream=False,
    )

    message = completion.choices[0].message
    reasoning = getattr(message, "reasoning_content", None)

    if reasoning:
        print("=== reasoning ===")
        print(reasoning)
        print()

    print("=== response ===")
    print(message.content or "")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

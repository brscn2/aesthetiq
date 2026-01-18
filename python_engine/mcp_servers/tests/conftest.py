import os
import sys
from pathlib import Path


def pytest_configure():
    # Ensure `python_engine/` is on sys.path so `import mcp_servers...` works.
    python_engine_dir = Path(__file__).resolve().parents[2]
    if str(python_engine_dir) not in sys.path:
        sys.path.insert(0, str(python_engine_dir))

    # Make tests deterministic by default.
    os.environ.setdefault("MONGODB_URI", "")


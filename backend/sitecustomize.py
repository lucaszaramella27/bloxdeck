from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
LOCAL_PACKAGES_DIR = ROOT_DIR / ".python-packages"

is_virtualenv = sys.prefix != sys.base_prefix
use_local_packages = os.environ.get("BLOXDECK_USE_LOCAL_PACKAGES") == "1" or not is_virtualenv

if use_local_packages and LOCAL_PACKAGES_DIR.exists():
    sys.path.insert(0, str(LOCAL_PACKAGES_DIR))

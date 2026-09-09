from __future__ import annotations

import os
from logging.config import fileConfig
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT_DIR = Path(__file__).resolve().parents[1]

from alembic import context
from sqlalchemy import engine_from_config, pool

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}

    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")

    return values


def normalize_database_url(url: str) -> str:
    parts = urlsplit(url.strip().strip('"').strip("'"))
    query = [(key, value) for key, value in parse_qsl(parts.query) if key != "schema"]
    scheme = "postgresql+pg8000" if parts.scheme in {"postgres", "postgresql"} else parts.scheme

    return urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def get_database_url() -> str:
    env_values = {
        **read_env_file(ROOT_DIR / ".env"),
        **read_env_file(ROOT_DIR / "backend" / ".env"),
        **os.environ,
    }
    database_url = env_values.get("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL was not found in environment, .env, or backend/.env")

    return normalize_database_url(database_url)


config.set_main_option("sqlalchemy.url", get_database_url())


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

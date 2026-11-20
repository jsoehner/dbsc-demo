# Build & Functional Verification Report

- **Verification Date:** `2026-11-20`
- **Verified By:** **Jeffs' Automated build and deploy agent**
- **Repository:** `jsoehner/dbsc-demo`
- **Status:** `VERIFIED`

---

## 1. Trusted OSS Split-Horizon Configuration

Onboarded via `setup_trusted_oss_repo.py` (`--mode virtual`):

| Scope | Setting | Value |
| :--- | :--- | :--- |
| Local LAN | `uv.toml` PyPI index | `http://oss.jsigroup.local:8080/pypi/virtual/simple` |
| Local LAN | `.env` (`TRUSTED_OSS_CACHE_URL`) | `http://oss.jsigroup.local:8080` |
| GitHub Actions (WAN) | `TRUSTED_OSS_CACHE_URL` | `https://jsigroup-oss.duckdns.org` |
| GitHub Actions (WAN) | `TRUSTED_OSS_MODE` | `virtual` |
| GitHub Actions (WAN) | `TRUSTED_OSS_GPG_EMAIL` | `oss-signing@the-techy.com` |
| GitHub Actions (WAN) | mTLS Secrets | `OSS_MTLS_CLIENT_CERT`, `OSS_MTLS_CLIENT_KEY` |

Git hygiene verified: `.env`, `uv.toml`, `.mvn/settings.xml`, `.mvn/maven.config`, and `.npmrc` are excluded via `.git/info/exclude` and never committed.

---

## 2. Build & Runtime Commands

```bash
# 1. Dependency installation from Trusted OSS virtual PyPI index
uv venv /tmp/dbsc-demo-venv
uv pip install --python /tmp/dbsc-demo-venv/bin/python \
  --index-url http://oss.jsigroup.local:8080/pypi/virtual/simple \
  -r requirements.txt

# 2. Python syntax verification
PYTHONPYCACHEPREFIX=/tmp/pycache-dbsc-demo /tmp/dbsc-demo-venv/bin/python -m py_compile app.py

# 3. Container image build verification
docker build -t dbsc-demo:verify .

# 4. Isolated local verification server
PYTHONDONTWRITEBYTECODE=1 PORT=15001 FLASK_HOST=127.0.0.1 /tmp/dbsc-demo-venv/bin/python app.py
```

- **Resolved Packages (11):** `flask==3.1.3`, `cryptography==50.0.2`, `pyjwt==2.15.1`, `werkzeug==3.1.9`, `jinja2==3.1.6`, `click==8.5.1`, `blinker==1.9.0`, `itsdangerous==2.2.0`, `markupsafe==3.0.4`, `cffi==2.1.1`, `pycparser==3.12`.
- **Docker Build:** Succeeded cleanly (`python:3.14-slim`, non-root `appuser`).

---

## 3. Functional Verification Results

### 3.1 Guided Headless Chrome (CDP) Verification

Executed against `http://localhost:15001/` with all 5 interactive UI steps in the DBSC-enabled flow:

- **Page Title:** `DBSC Demo`
- **HTTP Status:** `200`
- **Console Errors:** `0`
- **JS Exceptions:** `0`
- **Interactive Clicks (`5/5 CLICKED`):**
  1. `.btn-primary` (Login with DBSC enabled — WebCrypto RSA-PSS 2048-bit key generation + `POST /login` -> `200`)
  2. `#btn-fetch-data` (Signed request `GET /data` -> `200`, rendered `Sensitive data for alice: Account Balance $1,000,000`)
  3. `.btn-danger` (Execute Malware `POST /steal_cookie` -> `200`)
  4. `#btn-check-cookie` (Check Drop Server `GET /hacker_status` -> `200`)
  5. `#btn-use-cookie` (Replay Attack `POST /hacker_access` -> `403`, blocked due to invalid RSA-PSS signature)

### 3.2 `curl` API Probes (`api_verify.py`)

| Endpoint | Method | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `GET` | `2xx-3xx` | `200` | PASS |
| `/static/main.js` | `GET` | `2xx-3xx` | `200` | PASS |
| `/static/style.css` | `GET` | `2xx-3xx` | `200` | PASS |
| `/hacker_status` | `GET` | `2xx-3xx` | `200` | PASS |
| `/data` (unauthenticated) | `GET` | `401` | `401` | PASS |

### 3.3 End-to-End Cryptographic & Session Assertions

Verified **11/11** assertions against Flask `test_client()`:
- Unauthenticated `/data` rejected (`401`).
- **Scenario 1 (Standard Cookie):** Login (`200`), data fetch (`200`), cookie exfiltration (`200`), hacker replay succeeds (`200`), logout (`200`).
- **Scenario 2 (DBSC RSA-PSS 2048 / SHA-256):** Login with SPKI PEM public key (`200`), missing signature rejected (`401`), expired timestamp rejected (`401`), `NaN` timestamp rejected (`400`), forged signature rejected (`403`), valid RSA-PSS signature accepted (`200`), stolen cookie replay blocked (`403`), logout invalidates session (`401`).

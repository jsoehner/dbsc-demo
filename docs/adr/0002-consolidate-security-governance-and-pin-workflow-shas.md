# ADR 0002: Consolidate Security Governance, Pin Action SHAs, and Harden Application Container

* **Status:** Accepted
* **Deciders:** DBSC Demo Security & Architecture
* **Date:** 2026-09-25

---

## 1. Context & Problem Statement

A comprehensive security scan and repository audit revealed multiple supply-chain vulnerabilities, container hardening deficits, and application security weaknesses:
1. **Redundant & Conflicting Security Workflows**: An unhardened `.github/workflows/security-testing.yml` from a previous installation conflicted with centralized security governance standards.
2. **Mutable GitHub Actions Tags**: `.github/workflows/docker-publish.yml` referenced mutable major version action tags (`@v4`, `@v3`, `@v5`, `@v7`), exposing build pipelines to upstream tag hijacking.
3. **Missing Non-Root User in Dockerfile**: The container image executed as the default `root` user (`missing-user` finding), posing privilege escalation risks in runtime container environments.
4. **Flask Application Security Findings**:
   - `secure-set-cookie`: Session cookie `session_id` was set without `secure=True` and `samesite='Lax'`.
   - `nan-injection`: Direct `float(timestamp)` cast allowed untrusted NaN inputs to alter comparison logic.
   - `avoid_app_run_with_bad_host` & `debug-enabled`: Hardcoded `app.run(debug=True, host='0.0.0.0')`.
5. **Dependabot Cooldown Missing**: Package ecosystems (`pip`, `docker`, `github-actions`) lacked cooldown delays.

---

## 2. Decision Drivers

1. **Supply-Chain & Actions Immutability**: All GitHub Actions must be pinned to 40-character commit SHAs.
2. **Single Authoritative Governance Pipeline**: Standardize on `security-governance.yml` with integrated Gitleaks secret scanning, Semgrep SAST, Trivy CVE scanning, and Python ADR gatekeeping.
3. **Container Defense-in-Depth**: Ensure non-root process execution within Docker images.
4. **Robust Application Hardening**: Secure session cookies, eliminate numeric injection vectors using `Decimal`, and configure environment-driven application execution parameters.
5. **Zero Semgrep Findings**: Achieve and verify zero blocking findings across all repository targets.

---

## 3. Decision Outcome

Chosen Strategy: **Deploy unified `security-governance.yml` with `adr_security_gatekeeper.py`, remove redundant `security-testing.yml`, pin Docker workflow actions to commit SHAs, add non-root `appuser` to Dockerfile, harden Flask cookie and timestamp handling in `app.py`, and configure Dependabot cooldown.**

### Key Architectural Actions

1. **Security Workflow Consolidation**:
   - Removed `.github/workflows/security-testing.yml`.
   - Added `.github/workflows/security-governance.yml` as the authoritative scanning pipeline.
   - Deployed `scripts/adr_security_gatekeeper.py` to enforce ADR verification on security-sensitive pull requests.
2. **Action SHA Pinning (`docker-publish.yml`)**:
   - `actions/checkout@11d5960a326750d5838078e36cf38b85af677262` (`v4.2.2`).
   - `docker/setup-qemu-action@c7c53464625b32c7a7e944ae62b3e17d2b600130` (`v3`).
   - `docker/setup-buildx-action@8d2750c68a42422c14e847fe6c8ac0403b4cbd6f` (`v3`).
   - `docker/login-action@c94ce9fb468520275223c153574b00df6fe4bcc9` (`v3.7.0`).
   - `docker/metadata-action@c299e40c65443455700f0fdfc63efafe5b349051` (`v5`).
   - `docker/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc` (`v7.4.0`).
3. **Container Hardening (`Dockerfile`)**:
   - Created dedicated `appuser` (UID 1000) and configured `USER appuser`.
4. **Application Hardening (`app.py`)**:
   - Configured `resp.set_cookie('session_id', session_id, httponly=True, secure=True, samesite='Lax')`.
   - Replaced raw float casting with `decimal.Decimal` and explicit NaN/infinity validation.
   - Replaced hardcoded `app.run` with environment-configurable host, port, and debug values.
5. **Dependabot Configuration**:
   - Added `cooldown: default-days: 7` to all package ecosystems in `.github/dependabot.yml`.

---

## 4. Consequences & Trade-Offs

### Positive Consequences
* Completely resolved 14 Semgrep blocking findings down to 0 findings.
* Eliminates supply-chain compromise vectors via immutable commit references.
* Enforces least-privilege container execution without root privileges.
* Centralizes security governance and automated ADR auditing.

---

## 5. Validation

- [x] Semgrep scan completed with 0 findings across all 20 repository files (`docker run ... semgrep scan --config auto`).
- [x] Automated ADR Gatekeeper script verified against staged changes.
- [x] All workflows verified syntactically valid YAML.

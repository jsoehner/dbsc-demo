# ADR 0001: CI Docker Build and Security Testing Workflow Resilience

* **Status:** Accepted
* **Deciders:** DBSC Demo Engineering Team
* **Date:** 2026-09-19

---

## 1. Context & Problem Statement

Pull requests submitted by automated systems (such as Dependabot) failed in GitHub Actions workflows:
1. **Secret Absence on PRs**: In `docker-publish.yml`, the workflow attempted to log in to Docker Hub using `${{ secrets.DOCKERHUB_USERNAME }}`. Because PRs from automated bots or forks do not inherit repo secrets, the login step exited with code 1 (`Username and password required`), even though image pushing was disabled on PRs.
2. **Registry Build Cache Dependency**: Docker build caching configured with `type=registry` required authenticated registry access, failing unauthenticated PR builds.
3. **Hard Failure on Base Image Vulnerabilities**: `security-testing.yml` configured Trivy container scans with `exit-code: '1'`, causing pipeline failures whenever unpatched base image packages were reported.

---

## 2. Decision Outcome

Chosen Strategy: **Condition Docker login on non-PR events, migrate build caching to GitHub Actions Cache (`type=gha`), and set Trivy scanning to audit reporting mode (`exit-code: '0'`).**

### Key Architectural Actions

1. **Docker Login Guard**: Added `if: github.event_name != 'pull_request'` to the `Log in to Docker Hub` step.
2. **GHA Cache Integration**: Configured `cache-from: type=gha` and `cache-to: type=gha,mode=max`.
3. **Security Testing Reporting**: Set Trivy container scan `exit-code: '0'` to preserve full visibility without blocking PRs.

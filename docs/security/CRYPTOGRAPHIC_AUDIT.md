## 🛡️ Cryptographic Bill of Materials (CBOM) & PQC Migration Assessment

**Format**: CycloneDX (v1.7) | **First-Party Code Crypto Assets**: 2 | **Total Tracked Crypto Assets**: 6

### 📊 Post-Quantum Migration Scorecard

| Metric | Count | Migration Status |
|---|---|---|
| **Post-Quantum Ready (PQC)** | **0** | 🟢 Quantum-Resistant (NIST FIPS 203/204/205) |
| **Quantum-Vulnerable (Backlog)** | **3** | 🔴 At Risk of 'Harvest Now, Decrypt Later' |
| **Classical Symmetric / Digest** | **3** | 🟡 Classical Security (Requires AES-256 / SHA-256+) |
| **Asymmetric PQC Migration Progress** | **0.0%** | (0 of 3 asymmetric primitives migrated) |

### 🎯 Cryptographic Supply Chain Coverage & Confidence

| Evaluation Layer | Coverage / Status | Audit Confidence Assessment |
|---|---|---|
| **First-Party Code (`src/`, `scripts/`)** | **100% Audited** (2 Crypto Primitive(s) Inventoried) | 🟢 **HIGH** (Direct AST & SAST verified) |
| **Third-Party Supply Chain** | **80.0%** (4 of 5 dependencies cataloged) | 🟢 HIGH (Known profiles assimilated) |
| **Overall Audit Confidence Score** | **83.3%** | 🟢 HIGH (1 unassimilated supply chain dependencies) |

| **System OS Inventory** | **Pending Update** | 🟡 **Warning** (Local OS crypto components not yet inventoried) |

### ✅ Post-Quantum Ready Assets

> ⚠️ **No Post-Quantum Ready assets detected.** Immediate migration planning recommended for asymmetric key exchanges and digital signatures.

### ⚠️ Quantum-Vulnerable Assets & Remediation Plan

| Component / Algorithm | Type / Primitive | Key Length / Curve | Recommended Target | Provenance / Context |
|---|---|---|---|---|
| **`RSA-2048`**<br><sub>RSA-2048</sub> | algorithm / signature | 2048 | **ML-KEM-768 / Kyber (FIPS 203)** | First-Party Code (SAST/AST)<br>`static/main.js:115`<br><sub><code>name: "RSA-PSS",</code></sub><br><br>`static/main.js:191`<br><sub><code>name: "RSA-PSS",</code></sub> |
| **`cryptography (PyCA OpenSSL Asymmetric Primitives (RSA / ECDSA / Ed25519 / X25519))`**<br><sub>RSA-2048 / ECDSA-P256 / Ed25519 / X25519</sub> | signature / signature | 2048 / 256 | **Migrate asymmetric PKI/JWT workflows to OpenSSL 3.5+ ML-KEM (FIPS 203) and ML-DSA (FIPS 204)** | Assimilated Upstream CBOM: PyCA Cryptography / OpenSSL 3.x EVP Reference CBOM<br>`Dependency: cryptography@50.0.0` |
| **`pyjwt (JWS Asymmetric Signature Verification (RS256 / ES256))`**<br><sub>RSA-2048 / ECDSA-P256</sub> | signature / signature | 2048 / 256 | **Adopt IETF JOSE Post-Quantum ML-DSA signature algorithms when standardized** | Assimilated Upstream CBOM: PyJWT RFC 7519 JWS Cryptographic Profile<br>`Dependency: pyjwt@2.15.1` |

### 🔒 Classical Symmetric & Digest Assets

| Component Name | Primitive | Key Length | Quantum Resistance Assessment | Provenance / Location(s) |
|---|---|---|---|---|
| `SHA-256` | hash | 256 | Quantum-Resistant (Grover's proof) | First-Party Code (SAST/AST)<br>`app.py:84`<br>`app.py:87`<br>`app.py:160`<br>`app.py:163`<br>`static/main.js:118` |
| `cryptography (PyCA OpenSSL EVP Symmetric & AEAD Suite (AES-256-GCM / ChaCha20-Poly1305 / Fernet))` | block-cipher | 256 | Quantum-Resistant (Grover's proof) | Assimilated Upstream CBOM: PyCA Cryptography / OpenSSL 3.x EVP Reference CBOM<br>`Dependency: cryptography@50.0.0` |
| `pyjwt (JWS HMAC-SHA256 Token Authentication (HS256))` | mac | 256 | Quantum-Resistant (Grover's proof) | Assimilated Upstream CBOM: PyJWT RFC 7519 JWS Cryptographic Profile<br>`Dependency: pyjwt@2.15.1` |

### ⚠️ Unassimilated Third-Party Binaries & Cryptographic Blind Spots

> ℹ️ *The following third-party dependencies do not have verified upstream CBOM attestations in the catalog. They lower the audit confidence score until explicit CBOMs or attestations are published.* 

| Dependency Name | Version | Package URL (purl) | Status |
|---|---|---|---|
| `flask` | 3.1.3 | `pkg:pypi/flask@3.1.3` | 🟡 Unassimilated (No upstream CBOM) |

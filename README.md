# DBSC Session Binding Demo

This project provides a Dockerized web application designed to demonstrate the security benefits of Device Bound Session Credentials (DBSC). 

It specifically highlights how standard HTTP cookies are vulnerable to theft and replay attacks, and how "Session Binding" (tying a session to a cryptographic hardware key) mitigates this vulnerability.

## Project Structure
- `app.py`: A Python/Flask backend simulating an authentication server.
- `templates/index.html`: The interactive split-screen demo UI.
- `static/main.js`: The client-side logic using WebCrypto API to simulate hardware key pairs.
- `static/style.css`: Modern UI styling.
- `Dockerfile` & `docker-compose.yml`: Containerization files.
- `docs/architecture.md`: Detailed architectural diagrams and flow explanations.

## Running the Application
1. Ensure Docker and Docker Compose are installed.
2. Run the application:
   ```bash
   docker-compose up --build
   ```
3. Open a browser and navigate to `http://localhost:5000`.

## How to use the Demo
### Scenario 1: The Vulnerable Session (Standard Cookies)
1. On the **Victim's Browser** panel, uncheck the "Enable DBSC" checkbox and click Login.
2. Once logged in, click "Fetch Sensitive Data" to verify it works.
3. Click "Execute Malware (Exfiltrate Cookie)". This simulates malware stealing your `session_id` cookie and sending it to the hacker.
4. On the **Hacker's Terminal** panel, click "Check Drop Server". It will report the cookie was found.
5. Click "Attempt to use Stolen Cookie". 
   - **Result**: The hacker successfully accesses the sensitive data because the server only validates the presence of the cookie.

### Scenario 2: The Secure Session (DBSC Enabled)
1. Logout from the Victim's panel.
2. Check the "Enable DBSC" checkbox and click Login. 
   - *Behind the scenes: The browser generates a non-exportable WebCrypto key pair and registers the public key with the server.*
3. Click "Fetch Sensitive Data". 
   - *Behind the scenes: The browser signs a timestamp with the private key and sends it along with the cookie. The server validates the signature against the registered public key.*
4. Click "Execute Malware (Exfiltrate Cookie)". The cookie is stolen again.
5. On the Hacker's Terminal, click "Check Drop Server", then "Attempt to use Stolen Cookie".
   - **Result**: The attack FAILS. Even though the hacker has the exact same valid session cookie, they do not possess the non-exportable private key (which remains on the victim's hardware). The server rejects the request due to an invalid signature.

## Why this matters
Traditional sessions rely on a single bearer token (the cookie). If that token is stolen via malware or XSS, it can be replayed from anywhere. DBSC fundamentally changes this by requiring Proof-of-Possession of a cryptographic key tightly bound to the user's specific device hardware (like a TPM or Secure Enclave).

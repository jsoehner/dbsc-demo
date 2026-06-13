# Implementation Plan: DBSC & Cookie Theft Prevention Demonstration

This plan outlines the steps to build a Dockerized web application designed to demonstrate the security benefits of Device Bound Session Credentials (DBSC), as detailed in the provided Google Workspace blog post. The demonstration will show how traditional session cookies can be stolen and reused, whereas DBSC-bound sessions prevent such hijacking.

## Phase 1: Project Setup and Containerization
- **Initialize Web Application**: Set up a basic web server (e.g., Node.js with Express or Python with Flask).
- **Dockerization**: Create a `Dockerfile` and `docker-compose.yml` to package the application. This ensures it can be run consistently in any environment.
- **Frontend Setup**: Scaffold a simple frontend interface (HTML/CSS/JS) to serve as the user login and dashboard.

## Phase 2: Traditional Session Implementation (The Vulnerability)
- **Basic Authentication**: Implement a simple username/password login system.
- **Standard Session Cookies**: Upon successful login, issue a standard, HTTP-only session cookie.
- **Cookie Theft Simulation**: Create a mechanism to "steal" the cookie. This could be a simulated malware action (an "Export Cookie" button for demo purposes) or a deliberately vulnerable XSS endpoint that leaks the cookie to a simulated attacker.
- **Attacker Replay View**: Create a separate "Attacker Terminal" view where the stolen cookie can be pasted and used to access the user's dashboard, demonstrating the vulnerability.

## Phase 3: DBSC / Session Binding Implementation (The Solution)
- **Implement Device Binding**: 
  - *Option A (DBSC Draft API)*: If targeting modern Chrome (146+ with flags enabled), implement the emerging DBSC draft specification using the Web Crypto API to bind the session to a hardware-backed key.
  - *Option B (Simulation)*: Since DBSC is an emerging standard, we can simulate the backend validation by requiring a secondary device-specific token (like a mocked TPM signature or client certificate) alongside the cookie.
- **Backend Validation**: Update the backend to verify the device-bound signature on every request, not just the session cookie.
- **Blocked Theft Attempt**: Demonstrate that if the "Attacker" attempts to use the stolen bound cookie without the corresponding private key (which cannot be extracted from the device's TPM), the server rejects the request.

## Phase 4: User Interface and Demonstration Flow
- **Dashboard UI**: Build a clean, modern UI showing the user's active session state.
- **Split-Screen Demo**: 
  - **Left Side (Victim)**: Shows the user logging in, generating a session.
  - **Right Side (Attacker)**: Shows the attacker receiving the stolen cookie and attempting to use it.
- **Toggle Mechanism**: Add a toggle to switch the application between "Insecure (Standard Cookies)" and "Secure (DBSC Enabled)" to clearly contrast the two behaviors.

## Phase 5: Documentation and Polish
- **Instructions**: Add a `README.md` with clear instructions on how to build, run, and execute the demonstration.
- **Browser Requirements**: Document the specific Chrome versions or flags required if using native DBSC APIs.
- **Visuals**: Add CSS styling to make the demonstration visually clear (e.g., Red for attacker success, Green for blocked attacks).

## Next Steps
Please review this plan. If you approve, we can begin Phase 1 by initializing the web application framework and setting up the Docker environment. Let me know if you have a preferred technology stack (e.g., Node.js vs Python).

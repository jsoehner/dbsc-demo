// Web Crypto API utility for converting ArrayBuffer to Hex string
function buf2hex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

// Convert PEM to ArrayBuffer (for demonstration, we will just send SPKI exported keys)
function spkiToPEM(keydata) {
    var keydataS = arrayBufferToString(keydata);
    var keydataB64 = window.btoa(keydataS);
    var pem = "-----BEGIN PUBLIC KEY-----\n" + 
        keydataB64.match(/.{1,64}/g).join('\n') + 
        "\n-----END PUBLIC KEY-----";
    return pem;
}

function arrayBufferToString( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return binary;
}

// Global state for demonstration purposes
let dbscPrivateKey = null;
let dbscPublicKeyPEM = null;
let sessionActive = false;

// Instructions UI Logic
function updateInstructions() {
    const enableDbsc = document.getElementById('enable-dbsc').checked;
    const titleEl = document.getElementById('instruction-title');
    const contentEl = document.getElementById('instruction-content');

    if (enableDbsc) {
        titleEl.innerHTML = '<span class="icon">🛡️</span> Servers with DBSC enabled';
        document.querySelector('.instruction-panel').style.borderRightColor = '#10b981'; // Green accent
        contentEl.innerHTML = `
            <p>In this scenario, we demonstrate the security benefits of Device Bound Session Credentials (DBSC).</p>
            <ol>
                <li><strong>Ensure the checkbox is checked</strong> and click Login.</li>
                <li>Alice logs in. Under the hood, her browser generates a hardware-backed cryptographic key pair. The server links her session cookie to this specific key.</li>
                <li><strong>Click Execute Malware</strong>. The malware successfully steals the session cookie from memory, but cannot steal the hardware-bound private key.</li>
                <li>On the Hacker's Terminal, <strong>click Check Drop Server</strong> to retrieve the stolen cookie.</li>
                <li><strong>Click Attempt to use Stolen Cookie</strong>.</li>
                <li><strong>Result:</strong> The server rejects the hacker's request. The hacker has the cookie, but lacks the private key needed to cryptographically sign the request payload!</li>
            </ol>
        `;
    } else {
        titleEl.innerHTML = '<span class="icon">⚠️</span> Servers without DBSC enabled';
        document.querySelector('.instruction-panel').style.borderRightColor = '#ef4444'; // Red accent
        contentEl.innerHTML = `
            <p>In this scenario, we demonstrate the inherent vulnerability of standard session cookies.</p>
            <ol>
                <li><strong>Uncheck the DBSC checkbox</strong> and click Login.</li>
                <li>Alice logs in. The server issues a standard session cookie and sends it to the browser.</li>
                <li><strong>Click Execute Malware</strong>. This simulates malicious software scanning browser memory to exfiltrate the session cookie.</li>
                <li>On the Hacker's Terminal, <strong>click Check Drop Server</strong> to retrieve the stolen cookie.</li>
                <li><strong>Click Attempt to use Stolen Cookie</strong>.</li>
                <li><strong>Result:</strong> The hacker successfully accesses Alice's sensitive data! Without DBSC, the server only checks for the presence of the cookie.</li>
            </ol>
        `;
    }
}

// Initialize instructions on load
window.addEventListener('DOMContentLoaded', () => {
    updateInstructions();
});

function trace(msg) {
    const traceDiv = document.getElementById('victim-trace');
    if (traceDiv.innerHTML.includes('Waiting for activity')) {
        traceDiv.innerHTML = '';
    }
    const time = new Date().toLocaleTimeString();
    traceDiv.innerHTML += `<div><span class="text-gray">[${time}]</span> ${msg}</div>`;
    traceDiv.scrollTop = traceDiv.scrollHeight;
}

function traceKey(pem) {
    const traceDiv = document.getElementById('victim-trace');
    traceDiv.innerHTML += `<div class="trace-key">${pem}</div>`;
    traceDiv.scrollTop = traceDiv.scrollHeight;
}

function traceBubble(msg) {
    const traceDiv = document.getElementById('victim-trace');
    if (traceDiv.innerHTML.includes('Waiting for activity')) {
        traceDiv.innerHTML = '';
    }
    traceDiv.innerHTML += `<div class="chat-bubble">💡 ${msg}</div>`;
    traceDiv.scrollTop = traceDiv.scrollHeight;
}

// Victim Functions
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const enableDbsc = document.getElementById('enable-dbsc').checked;
    
    let payload = { username, password };
    
    document.getElementById('victim-trace').innerHTML = ''; // Clear trace log

    if (enableDbsc) {
        trace("User selected DBSC. Generating hardware-bound WebCrypto KeyPair...");
        try {
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "RSA-PSS",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                },
                true,
                ["sign", "verify"]
            );
            dbscPrivateKey = keyPair.privateKey;
            
            const exportedPublicKey = await window.crypto.subtle.exportKey(
                "spki",
                keyPair.publicKey
            );
            dbscPublicKeyPEM = spkiToPEM(exportedPublicKey);
            payload.dbsc_public_key = dbscPublicKeyPEM;
            
            trace("KeyPair generated. Public key bound to this browser:");
            traceKey(dbscPublicKeyPEM);
            trace("Sending login request WITH public key binding payload...");
            
        } catch (e) {
            console.error("Key generation failed:", e);
            alert("WebCrypto API error");
            return;
        }
    } else {
        trace("DBSC disabled. Standard login flow initiated. No keys generated.");
        dbscPrivateKey = null;
        dbscPublicKeyPEM = null;
    }

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (response.ok) {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('victim-dashboard').classList.remove('hidden');
        
        const statusEl = document.getElementById('binding-status');
        if (data.dbsc_enabled) {
            statusEl.innerHTML = `🛡️ <strong style="color:var(--success)">Hardware Bound Session Active</strong>`;
            trace("Login successful. Server responded with session cookie bound to the public key.");
        } else {
            statusEl.innerHTML = `⚠️ <strong>Standard Cookie Session Active (Vulnerable)</strong>`;
            trace("Login successful. Server responded with standard session cookie.");
        }
        
        sessionActive = true;
        document.getElementById('victim-data').innerText = "Logged in successfully. Try fetching data.";
        
        // Add balloon to guide to the next step
        showBalloon('btn-fetch-data', 'Login successful! Now click Fetch Sensitive Data to see how your browser signs the request.');
    } else {
        alert("Login failed: " + data.error);
        trace(`Login failed: ${data.error}`);
    }
}

async function fetchData() {
    let headers = {};
    
    trace("Initiating data fetch request...");

    if (dbscPrivateKey) {
        const timestamp = (Date.now() / 1000).toString();
        trace(`DBSC Active: Preparing to sign payload: timestamp=${timestamp}`);
        
        const message = new TextEncoder().encode(timestamp);
        
        const signatureBuffer = await window.crypto.subtle.sign(
            {
                name: "RSA-PSS",
                saltLength: 32,
            },
            dbscPrivateKey,
            message
        );
        
        const sigHex = buf2hex(signatureBuffer);
        headers['X-Timestamp'] = timestamp;
        headers['X-Signature'] = sigHex;
        
        trace("Payload signed with hardware-bound private key. Attaching signature headers:");
        trace(`<span class="text-gray">X-Signature:</span> ${sigHex.substring(0, 32)}...`);
        
        document.getElementById('example-payload').innerHTML = `<div class="success-msg"><strong>Payload WITH Signature:</strong></div><pre style="white-space: pre-wrap; font-size: 0.8rem; margin-top: 10px;">GET /data HTTP/1.1\nCookie: session_id=... \nX-Timestamp: ${timestamp}\nX-Signature: ${sigHex.substring(0, 32)}...</pre>`;
    } else {
        trace("DBSC not active: Sending request with just the session cookie.");
        document.getElementById('example-payload').innerHTML = `<div class="error-msg"><strong>Payload WITHOUT Signature:</strong></div><pre style="white-space: pre-wrap; font-size: 0.8rem; margin-top: 10px;">GET /data HTTP/1.1\nCookie: session_id=... \n(No cryptographic proof)</pre>`;
    }

    const response = await fetch('/data', { headers });
    const data = await response.json();
    
    const outBox = document.getElementById('victim-data');
    if (response.ok) {
        outBox.innerHTML = `<span class="success-msg">${data.message}</span>`;
        trace("Server validated request and returned data successfully.");
        showBalloon('victim-data', 'Data shown successfully! Now try clicking Execute Malware to simulate an attack.');
    } else {
        outBox.innerHTML = `<span class="error-msg">${data.error}</span>`;
        trace(`Server rejected request: ${data.error}`);
    }
}

async function logout() {
    trace("Initiating logout...");
    await fetch('/logout', { method: 'POST' });
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('victim-dashboard').classList.add('hidden');
    dbscPrivateKey = null;
    dbscPublicKeyPEM = null;
    sessionActive = false;
    document.getElementById('victim-data').innerText = "";
    document.getElementById('victim-trace').innerHTML = '<div class="text-gray">Waiting for activity...</div>';
    document.getElementById('example-payload').innerHTML = '<div class="text-gray">Waiting for request...</div>';
    
    // reset hacker terminal for convenience
    document.getElementById('btn-use-cookie').disabled = true;
    logToTerminal("Target machine disconnected. Drop server reset.", "text-gray");
    
    // Clear any active balloons
    closeBalloon();
}

async function stealCookie() {
    trace("SIMULATION: Malware executing memory scan to extract cookies...");
    const response = await fetch('/steal_cookie', { method: 'POST' });
    const data = await response.json();
    if (response.ok) {
        trace("SIMULATION: Cookie successfully extracted and exfiltrated to attacker drop server!");
        logToTerminal("Received connection from victim machine...");
        logToTerminal("Exfiltrated session cookie successfully!", "success-msg");
        document.getElementById('btn-use-cookie').disabled = false;
        showBalloon('btn-check-cookie', 'Malware successful! Now click Check Drop Server on the Hacker Panel.');
    } else {
        trace(`SIMULATION FAILED: ${data.error}`);
        alert("Failed to steal cookie: " + data.error);
    }
}

// Hacker Functions
function logToTerminal(msg, className="") {
    const logDiv = document.getElementById('hacker-log');
    logDiv.innerHTML += `<div class="${className}"><span class="prompt">root@kali:~#</span> ${msg}</div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function logBubble(msg) {
    const logDiv = document.getElementById('hacker-log');
    logDiv.innerHTML += `<div class="chat-bubble">💡 ${msg}</div>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

async function checkStolenCookie() {
    const response = await fetch('/hacker_status');
    const data = await response.json();
    if (data.has_stolen_cookie) {
        logToTerminal("Checked drop server: FOUND stolen cookie.", "success-msg");
        document.getElementById('btn-use-cookie').disabled = false;
        showBalloon('btn-use-cookie', "Cookie found! Now click Attempt to use Stolen Cookie to see if DBSC protects the session.");
    } else {
        logToTerminal("Checked drop server: No cookies found yet.");
    }
}

async function useStolenCookie() {
    logToTerminal("Attempting to access /data using stolen session cookie...");
    
    const fakeSignature = "deadbeef";
    const fakeTimestamp = (Date.now() / 1000).toString();
    
    const response = await fetch('/hacker_access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            signature: fakeSignature,
            timestamp: fakeTimestamp
        })
    });
    
    const data = await response.json();
    if (response.ok) {
        logToTerminal(`[SUCCESS] ${data.message}`, "success-msg");
        logToTerminal("Cookie theft successful! Session was NOT bound to the device.", "success-msg");
        showBalloon('btn-logout', 'Vulnerability demonstrated! Now click Logout and try the demo again with the DBSC box checked.');
    } else {
        logToTerminal(`[DENIED] ${data.error}`, "error-msg");
        logToTerminal("Exploit failed. The server rejected the request because the cryptographic signature over the payload was missing or invalid. The hacker has the cookie, but not the hardware-bound private key!", "error-msg");
        logBubble(`<strong>Hacker's Payload (Failed):</strong><br><pre>POST /hacker_access HTTP/1.1\nCookie: session_id=...\n{"signature": "deadbeef", "timestamp": "..."}</pre>`);
    }
}

// Tutorial Balloon Functions
let balloonTimeout;
function showBalloon(targetId, message) {
    let balloon = document.getElementById('tutorial-balloon');
    if (!balloon) {
        balloon = document.createElement('div');
        balloon.id = 'tutorial-balloon';
        balloon.className = 'tutorial-balloon';
        document.body.appendChild(balloon);
    }
    
    balloon.innerHTML = `
        <div class="balloon-message">${message}</div>
        <button onclick="closeBalloon()" class="balloon-close-btn">Next Step</button>
    `;
    balloon.style.display = 'block';
    balloon.classList.remove('hidden');
    
    const target = document.getElementById(targetId);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    
    setTimeout(() => {
        balloon.style.top = (rect.top + window.scrollY - balloon.offsetHeight - 15) + 'px';
        balloon.style.left = (rect.left + window.scrollX + rect.width / 2 - balloon.offsetWidth / 2) + 'px';
    }, 10);
    
    clearTimeout(balloonTimeout);
    balloonTimeout = setTimeout(closeBalloon, 10000);
}

function closeBalloon() {
    const balloon = document.getElementById('tutorial-balloon');
    if (balloon) {
        balloon.style.display = 'none';
        balloon.classList.add('hidden');
    }
}

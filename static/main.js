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
    } else {
        trace("DBSC not active: Sending request with just the session cookie.");
    }

    const response = await fetch('/data', { headers });
    const data = await response.json();
    
    const outBox = document.getElementById('victim-data');
    if (response.ok) {
        outBox.innerHTML = `<span class="success-msg">${data.message}</span>`;
        trace("Server validated request and returned data successfully.");
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
    
    // reset hacker terminal for convenience
    document.getElementById('btn-use-cookie').disabled = true;
    logToTerminal("Target machine disconnected. Drop server reset.", "text-gray");
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

async function checkStolenCookie() {
    const response = await fetch('/hacker_status');
    const data = await response.json();
    if (data.has_stolen_cookie) {
        logToTerminal("Checked drop server: FOUND stolen cookie.", "success-msg");
        document.getElementById('btn-use-cookie').disabled = false;
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
    } else {
        logToTerminal(`[DENIED] ${data.error}`, "error-msg");
        logToTerminal("Exploit failed. The server rejected the request because the cryptographic signature over the payload was missing or invalid. The hacker has the cookie, but not the hardware-bound private key!", "error-msg");
    }
}

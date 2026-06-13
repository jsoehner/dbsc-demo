import os
import uuid
import time
import json
from flask import Flask, request, jsonify, make_response, render_template
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.exceptions import InvalidSignature

app = Flask(__name__)

# In-memory session store for demonstration
# structure: session_id -> { "user": "username", "dbsc_public_key": "pem_string" }
SESSIONS = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    dbsc_public_key = data.get('dbsc_public_key') # Optional, if DBSC is used

    if not username or not password:
        return jsonify({"error": "Missing credentials"}), 400

    # In a real app, verify password here
    # For demo, accept any
    
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = {
        "user": username,
        "dbsc_public_key": dbsc_public_key
    }
    
    resp = make_response(jsonify({"message": "Logged in successfully", "dbsc_enabled": bool(dbsc_public_key)}))
    resp.set_cookie('session_id', session_id, httponly=True)
    return resp

@app.route('/data', methods=['GET'])
def get_data():
    session_id = request.cookies.get('session_id')
    
    if not session_id or session_id not in SESSIONS:
        return jsonify({"error": "Unauthorized: No valid session"}), 401
        
    session_data = SESSIONS[session_id]
    
    # If DBSC is enabled for this session, enforce signature check
    if session_data.get('dbsc_public_key'):
        timestamp = request.headers.get('X-Timestamp')
        signature_hex = request.headers.get('X-Signature')
        
        if not timestamp or not signature_hex:
            return jsonify({"error": "DBSC Error: Missing signature or timestamp"}), 401
            
        # Verify timestamp freshness (e.g., within 5 minutes)
        try:
            ts_float = float(timestamp)
            if abs(time.time() - ts_float) > 300:
                return jsonify({"error": "DBSC Error: Timestamp expired"}), 401
        except ValueError:
            return jsonify({"error": "DBSC Error: Invalid timestamp"}), 400
            
        # Verify signature
        try:
            public_key = serialization.load_pem_public_key(
                session_data['dbsc_public_key'].encode('utf-8')
            )
            signature = bytes.fromhex(signature_hex)
            message = timestamp.encode('utf-8')
            
            public_key.verify(
                signature,
                message,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
        except InvalidSignature:
            return jsonify({"error": "DBSC Error: Invalid signature! Session binding failed."}), 403
        except Exception as e:
            return jsonify({"error": f"DBSC Error: Verification failed ({str(e)})"}), 400

    return jsonify({"message": f"Sensitive data for {session_data['user']}: Account Balance $1,000,000"})

@app.route('/logout', methods=['POST'])
def logout():
    session_id = request.cookies.get('session_id')
    if session_id in SESSIONS:
        del SESSIONS[session_id]
    resp = make_response(jsonify({"message": "Logged out"}))
    resp.delete_cookie('session_id')
    return resp
    
# --- HACKER SIMULATION ENDPOINTS ---

# In memory storage for the "stolen" cookie
STOLEN_COOKIE = None

@app.route('/steal_cookie', methods=['POST'])
def steal_cookie():
    """Simulates malware exfiltrating the cookie from the browser."""
    global STOLEN_COOKIE
    # In reality, malware on the machine grabs the cookie from the browser's cookie store (even if HttpOnly).
    # We simulate this by having the server willingly give up the current session's cookie to the "hacker's drop site".
    session_id = request.cookies.get('session_id')
    if session_id:
        STOLEN_COOKIE = session_id
        return jsonify({"message": "Cookie successfully exfiltrated!"})
    return jsonify({"error": "No cookie found"}), 404

@app.route('/hacker_status', methods=['GET'])
def hacker_status():
    return jsonify({"has_stolen_cookie": STOLEN_COOKIE is not None})

@app.route('/hacker_access', methods=['POST'])
def hacker_access():
    """Simulates the hacker using the stolen cookie from a remote machine."""
    global STOLEN_COOKIE
    if not STOLEN_COOKIE:
        return jsonify({"error": "Hacker has no stolen cookie"}), 400
        
    session_id = STOLEN_COOKIE
    
    if session_id not in SESSIONS:
        return jsonify({"error": "Unauthorized: Stolen cookie is invalid or expired."}), 401
        
    session_data = SESSIONS[session_id]
    
    # If DBSC is enabled for this session, enforce signature check
    if session_data.get('dbsc_public_key'):
        # The hacker tries to provide a signature, but they don't have the private key!
        # They might try to replay an old signature or just forge one.
        signature_hex = request.json.get('signature', '1234abcd') # Fake signature
        timestamp = request.json.get('timestamp', str(time.time()))
        
        try:
            public_key = serialization.load_pem_public_key(
                session_data['dbsc_public_key'].encode('utf-8')
            )
            # Even if the hacker provides a valid hex string, it won't be a valid signature for the message
            # unless they possess the private key (which is bound to the victim's hardware).
            signature = bytes.fromhex(signature_hex)
            message = timestamp.encode('utf-8')
            
            public_key.verify(
                signature,
                message,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
        except Exception:
            return jsonify({"error": "Hacker Blocked! DBSC Error: Invalid signature. The hacker has the cookie but not the hardware-bound private key."}), 403

    return jsonify({"message": f"Hacker Success! Accessed sensitive data for user {session_data['user']} using stolen cookie."})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')

import os
import secrets
import sqlite3
from flask import Flask, request, jsonify, render_template, session, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(16))

# Configuration for file uploads
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'txt', 'docx', 'mp4', 'mp3', 'zip', 'webm', 'ogg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ---------- Database functions ----------
DB_PATH = "messages.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Private messages
    c.execute('''CREATE TABLE IF NOT EXISTS messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  sender_id TEXT,
                  recipient_id TEXT,
                  content TEXT,
                  file_url TEXT,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    # Contacts
    c.execute('''CREATE TABLE IF NOT EXISTS contacts
                 (owner_id TEXT,
                  contact_id TEXT,
                  nickname TEXT,
                  pinned INTEGER DEFAULT 0,
                  PRIMARY KEY (owner_id, contact_id))''')
    # Groups
    c.execute('''CREATE TABLE IF NOT EXISTS groups
                 (group_id TEXT PRIMARY KEY,
                  group_name TEXT,
                  created_by TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    c.execute('''CREATE TABLE IF NOT EXISTS group_members
                 (group_id TEXT,
                  user_id TEXT,
                  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (group_id, user_id))''')
    c.execute('''CREATE TABLE IF NOT EXISTS group_messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  group_id TEXT,
                  sender_id TEXT,
                  content TEXT,
                  file_url TEXT,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

# Private messages
def save_message(sender, recipient, content, file_url=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO messages (sender_id, recipient_id, content, file_url) VALUES (?,?,?,?)",
              (sender, recipient, content, file_url))
    conn.commit()
    msg_id = c.lastrowid
    conn.close()
    return msg_id

def get_conversation(user_a, user_b):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT sender_id, recipient_id, content, file_url, timestamp
                 FROM messages
                 WHERE (sender_id=? AND recipient_id=?)
                    OR (sender_id=? AND recipient_id=?)
                 ORDER BY timestamp""", (user_a, user_b, user_b, user_a))
    rows = c.fetchall()
    conn.close()
    return rows

# Contacts
def add_contact(owner, contact_id, nickname=None, pinned=0):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO contacts (owner_id, contact_id, nickname, pinned) VALUES (?,?,?,?)",
              (owner, contact_id, nickname, pinned))
    conn.commit()
    conn.close()

def get_contacts(owner):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT contact_id, nickname, pinned FROM contacts WHERE owner_id=? ORDER BY pinned DESC, nickname", (owner,))
    rows = c.fetchall()
    conn.close()
    return [{"id": row[0], "nickname": row[1], "pinned": row[2]} for row in rows]

def delete_contact(owner, contact_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM contacts WHERE owner_id=? AND contact_id=?", (owner, contact_id))
    conn.commit()
    conn.close()

def toggle_pin_contact(owner, contact_id, pinned):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE contacts SET pinned=? WHERE owner_id=? AND contact_id=?", (pinned, owner, contact_id))
    conn.commit()
    conn.close()

# Groups
def create_group(creator, group_name, member_ids):
    group_id = secrets.token_hex(4)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO groups (group_id, group_name, created_by) VALUES (?,?,?)",
              (group_id, group_name, creator))
    c.execute("INSERT INTO group_members (group_id, user_id) VALUES (?,?)", (group_id, creator))
    for uid in member_ids:
        if uid != creator:
            c.execute("INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?,?)", (group_id, uid))
    conn.commit()
    conn.close()
    return group_id

def get_user_groups(user_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT g.group_id, g.group_name
                 FROM groups g
                 JOIN group_members gm ON g.group_id = gm.group_id
                 WHERE gm.user_id=?""", (user_id,))
    rows = c.fetchall()
    conn.close()
    return [{"id": row[0], "name": row[1]} for row in rows]

def save_group_message(group_id, sender, content, file_url=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO group_messages (group_id, sender_id, content, file_url) VALUES (?,?,?,?)",
              (group_id, sender, content, file_url))
    conn.commit()
    msg_id = c.lastrowid
    conn.close()
    return msg_id

def get_group_messages(group_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT sender_id, content, file_url, timestamp
                 FROM group_messages
                 WHERE group_id=?
                 ORDER BY timestamp""", (group_id,))
    rows = c.fetchall()
    conn.close()
    return [{"sender": row[0], "content": row[1], "file_url": row[2], "time": row[3]} for row in rows]

def add_group_member(group_id, user_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?,?)", (group_id, user_id))
    conn.commit()
    conn.close()

def remove_group_member(group_id, user_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM group_members WHERE group_id=? AND user_id=?", (group_id, user_id))
    conn.commit()
    conn.close()

# ---------- Flask routes ----------
@app.route('/')
def index():
    if 'user_id' not in session:
        session['user_id'] = secrets.token_hex(4)
    return render_template('index.html', my_id=session['user_id'])

@app.route('/api/send', methods=['POST'])
def send_message():
    sender = session.get('user_id')
    if not sender:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    recipient = data.get('recipient')
    content = data.get('content')
    file_url = data.get('file_url')
    if not recipient or (not content and not file_url):
        return jsonify({"error": "Missing recipient or content"}), 400
    msg_id = save_message(sender, recipient, content, file_url)
    return jsonify({"status": "sent", "msg_id": msg_id})

@app.route('/api/messages/<contact_id>')
def get_private_messages(contact_id):
    user = session.get('user_id')
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    msgs = get_conversation(user, contact_id)
    return jsonify(msgs)

@app.route('/api/contacts', methods=['GET'])
def list_contacts():
    user = session.get('user_id')
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    contacts = get_contacts(user)
    return jsonify(contacts)

@app.route('/api/contacts', methods=['POST'])
def add_contact_route():
    user = session.get('user_id')
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    contact_id = data.get('contact_id')
    nickname = data.get('nickname')
    if not contact_id:
        return jsonify({"error": "Missing contact_id"}), 400
    add_contact(user, contact_id, nickname)
    return jsonify({"status": "added"})

@app.route('/api/contacts/<contact_id>', methods=['DELETE'])
def delete_contact_route(contact_id):
    user = session.get('user_id')
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    delete_contact(user, contact_id)
    return jsonify({"status": "deleted"})

@app.route('/api/contacts/<contact_id>/pin', methods=['POST'])
def pin_contact_route(contact_id):
    user = session.get('user_id')
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    pinned = data.get('pinned', 1)
    toggle_pin_contact(user, contact_id, pinned)
    return jsonify({"status": "updated"})

@app.route('/api/groups', methods=['GET'])
def list_groups():
    user = session.get('user_id')
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    groups = get_user_groups(user)
    return jsonify(groups)

@app.route('/api/groups', methods=['POST'])
def create_group_route():
    user = session.get('user_id')
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    group_name = data.get('name')
    member_ids = data.get('members', [])
    if not group_name:
        return jsonify({"error": "Missing group name"}), 400
    group_id = create_group(user, group_name, member_ids)
    return jsonify({"group_id": group_id, "status": "created"})

@app.route('/api/groups/<group_id>/messages', methods=['GET'])
def get_group_messages_route(group_id):
    user = session.get('user_id')
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    msgs = get_group_messages(group_id)
    return jsonify(msgs)

@app.route('/api/groups/<group_id>/send', methods=['POST'])
def send_group_message_route(group_id):
    user = session.get('user_id')
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    content = data.get('content')
    file_url = data.get('file_url')
    if not content and not file_url:
        return jsonify({"error": "Missing content"}), 400
    msg_id = save_group_message(group_id, user, content, file_url)
    return jsonify({"status": "sent", "msg_id": msg_id})

@app.route('/api/groups/<group_id>/members', methods=['POST'])
def add_member_route(group_id):
    user = session.get('user_id')
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    member_id = data.get('user_id')
    if not member_id:
        return jsonify({"error": "Missing user_id"}), 400
    add_group_member(group_id, member_id)
    return jsonify({"status": "added"})

@app.route('/api/groups/<group_id>/members/<member_id>', methods=['DELETE'])
def remove_member_route(group_id, member_id):
    user = session.get('user_id')
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    remove_group_member(group_id, member_id)
    return jsonify({"status": "removed"})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    user = session.get('user_id')
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_name = f"{secrets.token_hex(4)}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
        file.save(filepath)
        file_url = f"/uploads/{unique_name}"
        return jsonify({"file_url": file_url, "filename": filename})
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Initialize database
init_db()

if __name__ == '__main__':
    # Use PORT environment variable if available, otherwise default to 8080 for local testing
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)

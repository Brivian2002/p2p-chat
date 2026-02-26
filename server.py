import os
import secrets
import base64
from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(16))

# ---------- Detect environment ----------
ON_RENDER = os.environ.get('RENDER') == 'true'

# ---------- Database setup ----------
if ON_RENDER:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL must be set on Render")

    def get_db():
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
else:
    import sqlite3
    def get_db():
        conn = sqlite3.connect('messages.db')
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
    if ON_RENDER:
        # PostgreSQL syntax
        cur.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id TEXT NOT NULL,
                recipient_id TEXT NOT NULL,
                content TEXT,
                file_url TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS contacts (
                owner_id TEXT NOT NULL,
                contact_id TEXT NOT NULL,
                nickname TEXT,
                pinned INTEGER DEFAULT 0,
                PRIMARY KEY (owner_id, contact_id)
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS groups (
                group_id TEXT PRIMARY KEY,
                group_name TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS group_members (
                group_id TEXT REFERENCES groups(group_id),
                user_id TEXT NOT NULL,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id, user_id)
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS group_messages (
                id SERIAL PRIMARY KEY,
                group_id TEXT REFERENCES groups(group_id),
                sender_id TEXT NOT NULL,
                content TEXT,
                file_url TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # Avatar table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS avatars (
                user_id TEXT PRIMARY KEY,
                avatar_url TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    else:
        # SQLite syntax
        cur.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id TEXT NOT NULL,
                recipient_id TEXT NOT NULL,
                content TEXT,
                file_url TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS contacts (
                owner_id TEXT NOT NULL,
                contact_id TEXT NOT NULL,
                nickname TEXT,
                pinned INTEGER DEFAULT 0,
                PRIMARY KEY (owner_id, contact_id)
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS groups (
                group_id TEXT PRIMARY KEY,
                group_name TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS group_members (
                group_id TEXT REFERENCES groups(group_id),
                user_id TEXT NOT NULL,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id, user_id)
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS group_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id TEXT REFERENCES groups(group_id),
                sender_id TEXT NOT NULL,
                content TEXT,
                file_url TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS avatars (
                user_id TEXT PRIMARY KEY,
                avatar_url TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    conn.commit()
    cur.close()
    conn.close()

init_db()

# ---------- File upload config ----------
UPLOAD_FOLDER = 'uploads'
AVATAR_FOLDER = 'avatars'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'txt', 'docx', 'mp4', 'mp3', 'zip', 'webm', 'ogg', 'm4a', 'aac'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['AVATAR_FOLDER'] = AVATAR_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(AVATAR_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_user_id():
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return None
    return user_id

# ---------- Helper for unified contact upsert ----------
def upsert_contact(owner, contact_id, nickname, pinned=0):
    conn = get_db()
    cur = conn.cursor()
    if ON_RENDER:
        cur.execute("""
            INSERT INTO contacts (owner_id, contact_id, nickname, pinned)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (owner_id, contact_id) DO UPDATE SET
                nickname = EXCLUDED.nickname,
                pinned = EXCLUDED.pinned
        """, (owner, contact_id, nickname, pinned))
    else:
        cur.execute("INSERT OR REPLACE INTO contacts (owner_id, contact_id, nickname, pinned) VALUES (?,?,?,?)",
                    (owner, contact_id, nickname, pinned))
    conn.commit()
    cur.close()
    conn.close()

# ---------- Routes ----------
@app.route('/')
def index():
    return render_template('index.html')

# Private messages
@app.route('/api/send', methods=['POST'])
def send_message():
    sender = get_user_id()
    if not sender:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    recipient = data.get('recipient')
    content = data.get('content')
    file_url = data.get('file_url')
    if not recipient or (not content and not file_url):
        return jsonify({"error": "Missing recipient or content"}), 400
    conn = get_db()
    cur = conn.cursor()
    if ON_RENDER:
        cur.execute(
            "INSERT INTO messages (sender_id, recipient_id, content, file_url) VALUES (%s, %s, %s, %s) RETURNING id",
            (sender, recipient, content, file_url)
        )
        msg_id = cur.fetchone()['id']
    else:
        cur.execute(
            "INSERT INTO messages (sender_id, recipient_id, content, file_url) VALUES (?,?,?,?)",
            (sender, recipient, content, file_url)
        )
        msg_id = cur.lastrowid
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"status": "sent", "msg_id": msg_id})

@app.route('/api/messages/<contact_id>')
def get_private_messages(contact_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    if ON_RENDER:
        cur.execute("""
            SELECT sender_id, recipient_id, content, file_url, timestamp
            FROM messages
            WHERE (sender_id=%s AND recipient_id=%s)
               OR (sender_id=%s AND recipient_id=%s)
            ORDER BY timestamp
        """, (user, contact_id, contact_id, user))
    else:
        cur.execute("""
            SELECT sender_id, recipient_id, content, file_url, timestamp
            FROM messages
            WHERE (sender_id=? AND recipient_id=?)
               OR (sender_id=? AND recipient_id=?)
            ORDER BY timestamp
        """, (user, contact_id, contact_id, user))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = []
    for row in rows:
        if ON_RENDER:
            result.append([row['sender_id'], row['recipient_id'], row['content'], row['file_url'], row['timestamp']])
        else:
            result.append([row['sender_id'], row['recipient_id'], row['content'], row['file_url'], row['timestamp']])
    return jsonify(result)

# Contacts (unchanged from before)
@app.route('/api/contacts', methods=['GET'])
def list_contacts():
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    if ON_RENDER:
        cur.execute("SELECT contact_id, nickname, pinned FROM contacts WHERE owner_id=%s ORDER BY pinned DESC, nickname", (user,))
    else:
        cur.execute("SELECT contact_id, nickname, pinned FROM contacts WHERE owner_id=? ORDER BY pinned DESC, nickname", (user,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = []
    for row in rows:
        if ON_RENDER:
            result.append({"id": row['contact_id'], "nickname": row['nickname'], "pinned": row['pinned']})
        else:
            result.append({"id": row['contact_id'], "nickname": row['nickname'], "pinned": row['pinned']})
    return jsonify(result)

@app.route('/api/contacts', methods=['POST'])
def add_contact_route():
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    contact_id = data.get('contact_id')
    nickname = data.get('nickname')
    if not contact_id:
        return jsonify({"error": "Missing contact_id"}), 400
    upsert_contact(user, contact_id, nickname, pinned=0)
    return jsonify({"status": "added"})

@app.route('/api/contacts/<contact_id>', methods=['DELETE'])
def delete_contact_route(contact_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    if ON_RENDER:
        cur.execute("DELETE FROM contacts WHERE owner_id=%s AND contact_id=%s", (user, contact_id))
    else:
        cur.execute("DELETE FROM contacts WHERE owner_id=? AND contact_id=?", (user, contact_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"status": "deleted"})

@app.route('/api/contacts/<contact_id>/pin', methods=['POST'])
def pin_contact_route(contact_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    pinned = data.get('pinned', 1)
    upsert_contact(user, contact_id, None, pinned=pinned)
    return jsonify({"status": "updated"})

# Groups (simplified, keep as before)
@app.route('/api/groups', methods=['GET'])
def list_groups():
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    if ON_RENDER:
        cur.execute("""
            SELECT g.group_id, g.group_name
            FROM groups g
            JOIN group_members gm ON g.group_id = gm.group_id
            WHERE gm.user_id=%s
        """, (user,))
    else:
        cur.execute("""
            SELECT g.group_id, g.group_name
            FROM groups g
            JOIN group_members gm ON g.group_id = gm.group_id
            WHERE gm.user_id=?
        """, (user,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = [{"id": r[0], "name": r[1]} for r in rows]
    return jsonify(result)

@app.route('/api/groups', methods=['POST'])
def create_group_route():
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    group_name = data.get('name')
    member_ids = data.get('members', [])
    if not group_name:
        return jsonify({"error": "Missing group name"}), 400
    group_id = secrets.token_hex(4)
    conn = get_db()
    cur = conn.cursor()
    try:
        if ON_RENDER:
            cur.execute("INSERT INTO groups (group_id, group_name, created_by) VALUES (%s, %s, %s)",
                        (group_id, group_name, user))
            cur.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)", (group_id, user))
            for uid in member_ids:
                if uid != user:
                    cur.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (group_id, uid))
        else:
            cur.execute("INSERT INTO groups (group_id, group_name, created_by) VALUES (?,?,?)",
                        (group_id, group_name, user))
            cur.execute("INSERT INTO group_members (group_id, user_id) VALUES (?,?)", (group_id, user))
            for uid in member_ids:
                if uid != user:
                    cur.execute("INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?,?)", (group_id, uid))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
    return jsonify({"group_id": group_id, "status": "created"})

@app.route('/api/groups/<group_id>/messages', methods=['GET'])
def get_group_messages_route(group_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    if ON_RENDER:
        cur.execute("""
            SELECT sender_id, content, file_url, timestamp
            FROM group_messages
            WHERE group_id=%s
            ORDER BY timestamp
        """, (group_id,))
    else:
        cur.execute("""
            SELECT sender_id, content, file_url, timestamp
            FROM group_messages
            WHERE group_id=?
            ORDER BY timestamp
        """, (group_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = []
    for r in rows:
        result.append({"sender": r[0], "content": r[1], "file_url": r[2], "time": r[3]})
    return jsonify(result)

@app.route('/api/groups/<group_id>/send', methods=['POST'])
def send_group_message_route(group_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    content = data.get('content')
    file_url = data.get('file_url')
    if not content and not file_url:
        return jsonify({"error": "Missing content"}), 400
    conn = get_db()
    cur = conn.cursor()
    if ON_RENDER:
        cur.execute(
            "INSERT INTO group_messages (group_id, sender_id, content, file_url) VALUES (%s, %s, %s, %s) RETURNING id",
            (group_id, user, content, file_url)
        )
        msg_id = cur.fetchone()['id']
    else:
        cur.execute(
            "INSERT INTO group_messages (group_id, sender_id, content, file_url) VALUES (?,?,?,?)",
            (group_id, user, content, file_url)
        )
        msg_id = cur.lastrowid
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"status": "sent", "msg_id": msg_id})

# File upload (general)
@app.route('/api/upload', methods=['POST'])
def upload_file():
    user = get_user_id()
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

# Avatar upload
@app.route('/api/avatar', methods=['POST'])
def upload_avatar():
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"avatar_{user}.{ext}"
        filepath = os.path.join(app.config['AVATAR_FOLDER'], filename)
        file.save(filepath)
        avatar_url = f"/avatars/{filename}"
        # Store in database
        conn = get_db()
        cur = conn.cursor()
        if ON_RENDER:
            cur.execute("INSERT INTO avatars (user_id, avatar_url) VALUES (%s, %s) ON CONFLICT (user_id) DO UPDATE SET avatar_url = EXCLUDED.avatar_url, updated_at = CURRENT_TIMESTAMP",
                        (user, avatar_url))
        else:
            cur.execute("INSERT OR REPLACE INTO avatars (user_id, avatar_url) VALUES (?,?)", (user, avatar_url))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"avatar_url": avatar_url})
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/avatars/<filename>')
def get_avatar(filename):
    return send_from_directory(app.config['AVATAR_FOLDER'], filename)

@app.route('/api/avatar/<user_id>', methods=['GET'])
def get_avatar_url(user_id):
    conn = get_db()
    cur = conn.cursor()
    if ON_RENDER:
        cur.execute("SELECT avatar_url FROM avatars WHERE user_id=%s", (user_id,))
    else:
        cur.execute("SELECT avatar_url FROM avatars WHERE user_id=?", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row:
        return jsonify({"avatar_url": row[0] if not ON_RENDER else row['avatar_url']})
    return jsonify({"avatar_url": None})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    debug_mode = not ON_RENDER
    app.run(host='0.0.0.0', port=port, debug=debug_mode)

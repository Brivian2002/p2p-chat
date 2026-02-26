import os
import secrets
from flask import Flask, request, jsonify, render_template, send_from_directory, g
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(16))

# ---------- Detect environment ----------
ON_RENDER = os.environ.get('RENDER') == 'true'

# ---------- Database setup ----------
if ON_RENDER:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    from psycopg2 import pool
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL must be set on Render")

    # Create a connection pool (min 1, max 10 connections)
    try:
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            1, 10, dsn=DATABASE_URL, cursor_factory=RealDictCursor
        )
    except Exception as e:
        print(f"Failed to create connection pool: {e}")
        raise

    def get_db():
        """Get a connection from the pool."""
        try:
            return connection_pool.getconn()
        except Exception as e:
            print(f"Error getting connection from pool: {e}")
            raise

    def release_db(conn):
        """Return a connection to the pool."""
        if conn:
            connection_pool.putconn(conn)

else:
    import sqlite3
    def get_db():
        conn = sqlite3.connect('messages.db')
        conn.row_factory = sqlite3.Row
        return conn

    def release_db(conn):
        if conn:
            conn.close()

def init_db():
    conn = get_db()
    cur = conn.cursor()
    try:
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
            cur.execute('''
                CREATE TABLE IF NOT EXISTS avatars (
                    user_id TEXT PRIMARY KEY,
                    avatar_url TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            cur.execute('''
                CREATE TABLE IF NOT EXISTS reactions (
                    id SERIAL PRIMARY KEY,
                    message_id INTEGER NOT NULL,
                    user_id TEXT NOT NULL,
                    emoji TEXT NOT NULL,
                    UNIQUE(message_id, user_id, emoji)
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
            cur.execute('''
                CREATE TABLE IF NOT EXISTS reactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    message_id INTEGER NOT NULL,
                    user_id TEXT NOT NULL,
                    emoji TEXT NOT NULL,
                    UNIQUE(message_id, user_id, emoji)
                )
            ''')
        conn.commit()
    finally:
        cur.close()
        release_db(conn)

init_db()

# ---------- File upload config ----------
UPLOAD_FOLDER = 'uploads'
AVATAR_FOLDER = 'avatars'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'txt', 'docx', 'mp4', 'mp3', 'zip', 'webm', 'ogg', 'm4a', 'aac', 'wav'}
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

def upsert_contact(owner, contact_id, nickname, pinned=0):
    conn = get_db()
    cur = conn.cursor()
    try:
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
    finally:
        cur.close()
        release_db(conn)

# ---------- Routes ----------
@app.route('/')
def index():
    return render_template('index.html')

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
    try:
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
    finally:
        cur.close()
        release_db(conn)
    return jsonify({"status": "sent", "msg_id": msg_id})

@app.route('/api/messages/<contact_id>')
def get_private_messages(contact_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    try:
        if ON_RENDER:
            cur.execute("""
                SELECT id, sender_id, recipient_id, content, file_url, timestamp
                FROM messages
                WHERE (sender_id=%s AND recipient_id=%s)
                   OR (sender_id=%s AND recipient_id=%s)
                ORDER BY timestamp
            """, (user, contact_id, contact_id, user))
        else:
            cur.execute("""
                SELECT id, sender_id, recipient_id, content, file_url, timestamp
                FROM messages
                WHERE (sender_id=? AND recipient_id=?)
                   OR (sender_id=? AND recipient_id=?)
                ORDER BY timestamp
            """, (user, contact_id, contact_id, user))
        rows = cur.fetchall()
        msg_ids = [r[0] for r in rows]
        reactions = {}
        if msg_ids:
            placeholders = ','.join(['%s'] * len(msg_ids)) if ON_RENDER else ','.join(['?'] * len(msg_ids))
            cur.execute(f"SELECT message_id, user_id, emoji FROM reactions WHERE message_id IN ({placeholders})", msg_ids)
            for r in cur.fetchall():
                mid = r[0]
                if mid not in reactions:
                    reactions[mid] = []
                reactions[mid].append({"user": r[1], "emoji": r[2]})
    finally:
        cur.close()
        release_db(conn)
    result = []
    for row in rows:
        if ON_RENDER:
            msg_id = row['id']
            result.append({
                "id": msg_id,
                "sender": row['sender_id'],
                "recipient": row['recipient_id'],
                "content": row['content'],
                "file_url": row['file_url'],
                "timestamp": row['timestamp'],
                "reactions": reactions.get(msg_id, [])
            })
        else:
            msg_id = row[0]
            result.append({
                "id": msg_id,
                "sender": row[1],
                "recipient": row[2],
                "content": row[3],
                "file_url": row[4],
                "timestamp": row[5],
                "reactions": reactions.get(msg_id, [])
            })
    return jsonify(result)

@app.route('/api/messages/<int:msg_id>', methods=['DELETE'])
def delete_message(msg_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    try:
        if ON_RENDER:
            cur.execute("DELETE FROM messages WHERE id=%s AND (sender_id=%s OR recipient_id=%s)", (msg_id, user, user))
        else:
            cur.execute("DELETE FROM messages WHERE id=? AND (sender_id=? OR recipient_id=?)", (msg_id, user, user))
        deleted = cur.rowcount
        conn.commit()
    finally:
        cur.close()
        release_db(conn)
    if deleted:
        return jsonify({"status": "deleted"})
    return jsonify({"error": "Message not found or not authorized"}), 404

@app.route('/api/messages/<int:msg_id>/react', methods=['POST'])
def add_reaction(msg_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    emoji = data.get('emoji')
    if not emoji:
        return jsonify({"error": "Missing emoji"}), 400
    conn = get_db()
    cur = conn.cursor()
    try:
        if ON_RENDER:
            cur.execute(
                "INSERT INTO reactions (message_id, user_id, emoji) VALUES (%s, %s, %s) ON CONFLICT (message_id, user_id, emoji) DO NOTHING",
                (msg_id, user, emoji)
            )
        else:
            cur.execute(
                "INSERT OR IGNORE INTO reactions (message_id, user_id, emoji) VALUES (?,?,?)",
                (msg_id, user, emoji)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        release_db(conn)
    return jsonify({"status": "added"})

@app.route('/api/messages/<int:msg_id>/react', methods=['DELETE'])
def remove_reaction(msg_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    emoji = data.get('emoji')
    if not emoji:
        return jsonify({"error": "Missing emoji"}), 400
    conn = get_db()
    cur = conn.cursor()
    try:
        if ON_RENDER:
            cur.execute("DELETE FROM reactions WHERE message_id=%s AND user_id=%s AND emoji=%s", (msg_id, user, emoji))
        else:
            cur.execute("DELETE FROM reactions WHERE message_id=? AND user_id=? AND emoji=?", (msg_id, user, emoji))
        conn.commit()
    finally:
        cur.close()
        release_db(conn)
    return jsonify({"status": "removed"})

@app.route('/api/contacts', methods=['GET'])
def list_contacts():
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    try:
        if ON_RENDER:
            cur.execute("SELECT contact_id, nickname, pinned FROM contacts WHERE owner_id=%s ORDER BY pinned DESC, nickname", (user,))
        else:
            cur.execute("SELECT contact_id, nickname, pinned FROM contacts WHERE owner_id=? ORDER BY pinned DESC, nickname", (user,))
        rows = cur.fetchall()
    finally:
        cur.close()
        release_db(conn)
    result = []
    for row in rows:
        if ON_RENDER:
            result.append({"id": row['contact_id'], "nickname": row['nickname'], "pinned": row['pinned']})
        else:
            result.append({"id": row[0], "nickname": row[1], "pinned": row[2]})
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

@app.route('/api/contacts/<contact_id>', methods=['PUT'])
def update_contact_route(contact_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    nickname = data.get('nickname')
    pinned = data.get('pinned')
    upsert_contact(user, contact_id, nickname, pinned if pinned is not None else 0)
    return jsonify({"status": "updated"})

@app.route('/api/contacts/<contact_id>', methods=['DELETE'])
def delete_contact_route(contact_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    try:
        if ON_RENDER:
            cur.execute("DELETE FROM contacts WHERE owner_id=%s AND contact_id=%s", (user, contact_id))
        else:
            cur.execute("DELETE FROM contacts WHERE owner_id=? AND contact_id=?", (user, contact_id))
        conn.commit()
    finally:
        cur.close()
        release_db(conn)
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

@app.route('/api/groups', methods=['GET'])
def list_groups():
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    try:
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
    finally:
        cur.close()
        release_db(conn)
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
        release_db(conn)
    return jsonify({"group_id": group_id, "status": "created"})

@app.route('/api/groups/<group_id>/messages', methods=['GET'])
def get_group_messages_route(group_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    try:
        if ON_RENDER:
            cur.execute("""
                SELECT id, sender_id, content, file_url, timestamp
                FROM group_messages
                WHERE group_id=%s
                ORDER BY timestamp
            """, (group_id,))
        else:
            cur.execute("""
                SELECT id, sender_id, content, file_url, timestamp
                FROM group_messages
                WHERE group_id=?
                ORDER BY timestamp
            """, (group_id,))
        rows = cur.fetchall()
        msg_ids = [r[0] for r in rows]
        reactions = {}
        if msg_ids:
            placeholders = ','.join(['%s'] * len(msg_ids)) if ON_RENDER else ','.join(['?'] * len(msg_ids))
            cur.execute(f"SELECT message_id, user_id, emoji FROM reactions WHERE message_id IN ({placeholders})", msg_ids)
            for r in cur.fetchall():
                mid = r[0]
                if mid not in reactions:
                    reactions[mid] = []
                reactions[mid].append({"user": r[1], "emoji": r[2]})
    finally:
        cur.close()
        release_db(conn)
    result = []
    for row in rows:
        if ON_RENDER:
            result.append({
                "id": row['id'],
                "sender": row['sender_id'],
                "content": row['content'],
                "file_url": row['file_url'],
                "time": row['timestamp'],
                "reactions": reactions.get(row['id'], [])
            })
        else:
            result.append({
                "id": row[0],
                "sender": row[1],
                "content": row[2],
                "file_url": row[3],
                "time": row[4],
                "reactions": reactions.get(row[0], [])
            })
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
    try:
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
    finally:
        cur.close()
        release_db(conn)
    return jsonify({"status": "sent", "msg_id": msg_id})

@app.route('/api/groups/messages/<int:msg_id>', methods=['DELETE'])
def delete_group_message(msg_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    try:
        if ON_RENDER:
            cur.execute("DELETE FROM group_messages WHERE id=%s AND sender_id=%s", (msg_id, user))
        else:
            cur.execute("DELETE FROM group_messages WHERE id=? AND sender_id=?", (msg_id, user))
        deleted = cur.rowcount
        conn.commit()
    finally:
        cur.close()
        release_db(conn)
    if deleted:
        return jsonify({"status": "deleted"})
    return jsonify({"error": "Message not found or not authorized"}), 404

@app.route('/api/groups/<group_id>/members', methods=['POST'])
def add_member_route(group_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json
    member_id = data.get('user_id')
    if not member_id:
        return jsonify({"error": "Missing user_id"}), 400
    conn = get_db()
    cur = conn.cursor()
    try:
        if ON_RENDER:
            cur.execute("INSERT INTO group_members (group_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (group_id, member_id))
        else:
            cur.execute("INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?,?)", (group_id, member_id))
        conn.commit()
    finally:
        cur.close()
        release_db(conn)
    return jsonify({"status": "added"})

@app.route('/api/groups/<group_id>/members/<member_id>', methods=['DELETE'])
def remove_member_route(group_id, member_id):
    user = get_user_id()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    conn = get_db()
    cur = conn.cursor()
    try:
        if ON_RENDER:
            cur.execute("DELETE FROM group_members WHERE group_id=%s AND user_id=%s", (group_id, member_id))
        else:
            cur.execute("DELETE FROM group_members WHERE group_id=? AND user_id=?", (group_id, member_id))
        conn.commit()
    finally:
        cur.close()
        release_db(conn)
    return jsonify({"status": "removed"})

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
        conn = get_db()
        cur = conn.cursor()
        try:
            if ON_RENDER:
                cur.execute("INSERT INTO avatars (user_id, avatar_url) VALUES (%s, %s) ON CONFLICT (user_id) DO UPDATE SET avatar_url = EXCLUDED.avatar_url, updated_at = CURRENT_TIMESTAMP",
                            (user, avatar_url))
            else:
                cur.execute("INSERT OR REPLACE INTO avatars (user_id, avatar_url) VALUES (?,?)", (user, avatar_url))
            conn.commit()
        finally:
            cur.close()
            release_db(conn)
        return jsonify({"avatar_url": avatar_url})
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/avatars/<filename>')
def get_avatar(filename):
    return send_from_directory(app.config['AVATAR_FOLDER'], filename)

@app.route('/api/avatar/<user_id>', methods=['GET'])
def get_avatar_url(user_id):
    conn = get_db()
    cur = conn.cursor()
    try:
        if ON_RENDER:
            cur.execute("SELECT avatar_url FROM avatars WHERE user_id=%s", (user_id,))
        else:
            cur.execute("SELECT avatar_url FROM avatars WHERE user_id=?", (user_id,))
        row = cur.fetchone()
    finally:
        cur.close()
        release_db(conn)
    if row:
        return jsonify({"avatar_url": row[0] if not ON_RENDER else row['avatar_url']})
    return jsonify({"avatar_url": None})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    debug_mode = not ON_RENDER
    app.run(host='0.0.0.0', port=port, debug=debug_mode)

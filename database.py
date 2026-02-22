import sqlite3
import secrets

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
    # Pinned chats (for ordering)
    c.execute('''CREATE TABLE IF NOT EXISTS pinned_chats
                 (user_id TEXT,
                  chat_id TEXT,
                  chat_type TEXT,  -- 'contact' or 'group'
                  pinned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (user_id, chat_id, chat_type))''')
    # Diary entries
    c.execute('''CREATE TABLE IF NOT EXISTS diary_entries
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT,
                  title TEXT,
                  content TEXT,
                  entry_date TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    # Calendar events
    c.execute('''CREATE TABLE IF NOT EXISTS calendar_events
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT,
                  title TEXT,
                  start_date TEXT,
                  end_date TEXT,
                  description TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

# --- Private messages (with file support) ---
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

# --- Contacts ---
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

# --- Groups ---
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

# --- Pinned chats (optional, we now use pinned flag in contacts; for groups we could add a separate table)
# Not used directly, but kept for future.

# --- Diary ---
def add_diary_entry(user_id, title, content, entry_date):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO diary_entries (user_id, title, content, entry_date) VALUES (?,?,?,?)",
              (user_id, title, content, entry_date))
    conn.commit()
    entry_id = c.lastrowid
    conn.close()
    return entry_id

def get_diary_entries(user_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, title, content, entry_date FROM diary_entries WHERE user_id=? ORDER BY entry_date DESC", (user_id,))
    rows = c.fetchall()
    conn.close()
    return [{"id": row[0], "title": row[1], "content": row[2], "date": row[3]} for row in rows]

def delete_diary_entry(user_id, entry_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM diary_entries WHERE user_id=? AND id=?", (user_id, entry_id))
    conn.commit()
    conn.close()

# --- Calendar ---
def add_calendar_event(user_id, title, start_date, end_date, description):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO calendar_events (user_id, title, start_date, end_date, description) VALUES (?,?,?,?,?)",
              (user_id, title, start_date, end_date, description))
    conn.commit()
    event_id = c.lastrowid
    conn.close()
    return event_id

def get_calendar_events(user_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, title, start_date, end_date, description FROM calendar_events WHERE user_id=? ORDER BY start_date", (user_id,))
    rows = c.fetchall()
    conn.close()
    return [{"id": row[0], "title": row[1], "start": row[2], "end": row[3], "description": row[4]} for row in rows]

def delete_calendar_event(user_id, event_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM calendar_events WHERE user_id=? AND id=?", (user_id, event_id))
    conn.commit()
    conn.close()

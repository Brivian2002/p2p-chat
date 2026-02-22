import socket
import threading
import json
from database import save_message, update_contact

class PeerServer:
    def __init__(self, host='0.0.0.0', port=5555, my_id=None):
        self.host = host
        self.port = port
        self.my_id = my_id
        self.running = True
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server_socket.bind((host, port))
        self.server_socket.listen(5)
        print(f"Peer server listening on {host}:{port}")

    def start(self):
        threading.Thread(target=self._accept_loop, daemon=True).start()

    def _accept_loop(self):
        while self.running:
            try:
                client_sock, addr = self.server_socket.accept()
                threading.Thread(target=self._handle_peer, args=(client_sock, addr), daemon=True).start()
            except:
                break

    def _handle_peer(self, sock, addr):
        try:
            data = sock.recv(4096).decode()
            if not data:
                return
            msg = json.loads(data)
            if msg.get("recipient") == self.my_id:
                save_message(msg["sender"], msg["recipient"], msg["content"], delivered=True)
                ack = {"status": "delivered", "msg_id": msg.get("msg_id")}
                sock.send(json.dumps(ack).encode())
                update_contact(msg["sender"], addr[0], None)
        except Exception as e:
            print(f"Peer handling error: {e}")
        finally:
            sock.close()

    def send_message(self, peer_ip, peer_port, message_data):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            sock.connect((peer_ip, peer_port))
            sock.send(json.dumps(message_data).encode())
            response = sock.recv(1024).decode()
            if response:
                ack = json.loads(response)
                return ack.get("status") == "delivered"
        except Exception as e:
            print(f"Send error: {e}")
        finally:
            sock.close()
        return False

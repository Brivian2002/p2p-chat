import requests

# Use the local registry URL (since we're testing in Cloud Shell)
REGISTRY_URL = "http://10.88.0.4:5001"   # replace with the IP shown in the registry tab

def register(user_id, ip, port):
    try:
        response = requests.post(f"{REGISTRY_URL}/register", json={
            "user_id": user_id,
            "ip": ip,
            "port": port
        }, timeout=3)
        if response.status_code == 200:
            print("Registered with central registry")
        else:
            print("Registry registration failed")
    except Exception as e:
        print(f"Registry registration error: {e}")

def lookup(user_id):
    try:
        response = requests.get(f"{REGISTRY_URL}/lookup/{user_id}", timeout=3)
        if response.status_code == 200:
            data = response.json()
            return data.get("ip"), data.get("port")
    except Exception as e:
        print(f"Registry lookup error: {e}")
    return None, None

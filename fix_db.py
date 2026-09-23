import urllib.request
import json

def update_doc(path, payload):
    url = f'https://firestore.googleapis.com/v1/{path}'
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), method='PATCH', headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error updating {path}: {e}")

# Wait, without auth I cannot update via REST API unless security rules are public.

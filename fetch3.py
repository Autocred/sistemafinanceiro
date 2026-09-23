import urllib.request
import json

url = 'https://firestore.googleapis.com/v1/projects/sistemafinan/databases/(default)/documents/transacoes'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))
    for doc in data.get('documents', []):
        fields = doc.get('fields', {})
        valor = fields.get('valor', {}).get('doubleValue')
        if not valor:
            valor = fields.get('valor', {}).get('integerValue')
        
        if str(valor) in ['-33.98', '33.98']:
            print(f"Transaction: {doc.get('name')}")
            for k, v in fields.items():
                print(f"  {k}: {v}")

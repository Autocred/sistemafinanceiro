import urllib.request
import json

url = 'https://firestore.googleapis.com/v1/projects/sistemafinan/databases/(default)/documents/faturas'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))
    for doc in data.get('documents', []):
        fields = doc.get('fields', {})
        if fields.get('cartaoNome', {}).get('stringValue') == 'Mercado Pago ':
            mes = fields.get('mesReferencia', {}).get('stringValue')
            if mes in ['2026-09', '2026-10', '2026-08']:
                print(f"Fatura: {mes}")
                for k, v in fields.items():
                    print(f"  {k}: {v}")

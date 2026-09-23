import urllib.request
import json

url = 'https://firestore.googleapis.com/v1/projects/sistemafinan/databases/(default)/documents/cartoes'
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))
    for doc in data.get('documents', []):
        fields = doc.get('fields', {})
        nome = fields.get('nome', {}).get('stringValue')
        venc = fields.get('dataVencimento', {}).get('integerValue')
        fech = fields.get('dataFechamento', {}).get('integerValue')
        print(f"Cartão: {nome}, Venc: {venc}, Fech: {fech}")

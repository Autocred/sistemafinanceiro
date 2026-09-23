import os
import firebase_admin
from firebase_admin import credentials, firestore

env_vars = {}
with open('.env.local', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and '=' in line:
            k, v = line.split('=', 1)
            env_vars[k] = v.strip('"\'')

cred = credentials.Certificate({
    'type': 'service_account',
    'project_id': env_vars['FIREBASE_PROJECT_ID'],
    'private_key': env_vars['FIREBASE_PRIVATE_KEY'].replace('\\n', '\n'),
    'client_email': env_vars['FIREBASE_CLIENT_EMAIL'],
    'token_uri': 'https://oauth2.googleapis.com/token'
})

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

print('CARTOES:')
cartoes = list(db.collection('cartoes').get())
for c in cartoes:
    print(c.id, c.to_dict())

print('\nFATURAS MERCADO PAGO:')
faturas = list(db.collection('faturas').get())
for f in faturas:
    if f.to_dict().get('cartaoNome') == 'Mercado Pago':
        print(f.id, f.to_dict().get('mesReferencia'), f.to_dict().get('dataVencimento'), f.to_dict().get('status'))

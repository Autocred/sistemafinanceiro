import urllib.request
import json

req = urllib.request.Request('https://sistemafinanceiropessoal.vercel.app/api/fix-faturas')
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode('utf-8'))
    
    print('CARTOES:')
    for c in data.get('cartoes', []):
        print(f"{c.get('nome')}: dataVenc={c.get('dataVencimento')} dataFech={c.get('dataFechamento')}")
        
    print('\nFATURAS:')
    for f in data.get('faturas', []):
        if f.get('cartaoNome') == 'Mercado Pago':
            print(f"{f.get('mesReferencia')} - Venc: {f.get('dataVencimento')} - Fech: {f.get('dataFechamento')} - {f.get('valorTotal')} - {f.get('id')}")

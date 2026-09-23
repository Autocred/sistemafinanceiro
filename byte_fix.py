import os

def fix_all_files():
    # We replace exact byte sequences that cause the visual mojibake
    replacements = {
        # 'âˆ’' -> '-'
        b'\xc3\xa2\xcb\x86\xe2\x80\x99': b'-',
        b'\xc3\xa2\xe2\x80\x9d\xbf': b'-',
        
        # 'â€“' -> '-'
        b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9c': b'-',
        
        # 'â€”' -> '-'
        b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d': b'-',

        # 'ðŸ’³' -> '💳'
        b'\xc3\xb0\xc5\xb8\xe2\x80\x99\xc2\xb3': b'\xf0\x9f\x92\xb3',

        # 'ðŸ›’' -> '🛒'
        b'\xc3\xb0\xc5\xb8\xe2\x80\xba\xe2\x80\x99': b'\xf0\x9f\x9b\x92',

        # 'ðŸ“ˆ' -> '📈'
        b'\xc3\xb0\xc5\xb8\xe2\x80\x9c\xcb\x86': b'\xf0\x9f\x93\x88',

        # 'CartÃ£o' -> 'Cartão'
        b'Cart\xc3\x83\xc2\xa3o': b'Cart\xc3\xa3o',
        
        # 'CrÃ©dito' -> 'Crédito'
        b'Cr\xc3\x83\xc2\xa9dito': b'Cr\xc3\xa9dito',

        # Other double encodings we might encounter:
        # 'DescriÃ§Ã£o'
        b'Descri\xc3\x83\xc2\xa7\xc3\x83\xc2\xa3o': b'Descri\xc3\xa7\xc3\xa3o',
    }
    
    for root, dirs, files in os.walk('src'):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path, 'rb') as file:
                    content = file.read()
                
                original = content
                for _ in range(3):
                    for bad, good in replacements.items():
                        content = content.replace(bad, good)
                
                # We can also do a pass of cp1252 to utf8 decoding as bytes
                # since we know â (\xc3\xa2) is usually a sign of cp1252 double-encoding
                # Wait, doing bytes replacement for known patterns is safer
                
                if content != original:
                    print('Fixed bytes in:', path)
                    with open(path, 'wb') as file:
                        file.write(content)

if __name__ == '__main__':
    fix_all_files()

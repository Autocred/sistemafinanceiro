import os
import glob
import re

def decode_mojibake(match):
    try:
        # Get the matched string (e.g., 'â†“')
        bad_str = match.group(0)
        
        # Convert it to bytes using cp1252 (the encoding Windows usually uses for ANSI)
        raw_bytes = bad_str.encode('cp1252')
        
        # Decode the bytes using utf-8 to get the real character (e.g., '↓')
        good_str = raw_bytes.decode('utf-8')
        
        # Return the corrected character
        return good_str
    except Exception:
        # If it fails to encode/decode, leave it as is
        return match.group(0)

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # UTF-8 characters in cp1252 mojibake usually start with 'Ã' (\xc3) or 'â' (\xe2) or 'ð' (\xf0).
    # - 2-byte utf-8: \xc2-\xdf followed by \x80-\xbf
    # - 3-byte utf-8: \xe0-\xef followed by two \x80-\xbf
    # - 4-byte utf-8: \xf0-\xf4 followed by three \x80-\xbf
    # In cp1252, characters in the range \x80-\xbf include:
    # \x80=€, \x81=?, \x82=‚, \x83=ƒ, \x84=„, \x85=…, \x86=†, \x87=‡, \x88=ˆ, \x89=‰, \x8a=Š, \x8b=‹, \x8c=Œ, \x8d=?, \x8e=Ž, \x8f=?,
    # \x90=?, \x91=‘, \x92=’, \x93=“, \x94=”, \x95=•, \x96=–, \x97=—, \x98=˜, \x99=™, \x9a=š, \x9b=›, \x9c=œ, \x9d=?, \x9e=ž, \x9f=Ÿ
    # \xa0= , \xa1=¡, \xa2=¢, \xa3=£, \xa4=¤, \xa5=¥, \xa6=¦, \xa7=§, \xa8=¨, \xa9=©, \xaa=ª, \xab=«, \xac=¬, \xad=, \xae=®, \xaf=¯
    # \xb0=°, \xb1=±, \xb2=², \xb3=³, \xb4=´, \xb5=µ, \xb6=¶, \xb7=·, \xb8=¸, \xb9=¹, \xba=º, \xbb=», \xbc=¼, \xbd=½, \xbe=¾, \xbf=¿

    # Let's match potential 2, 3, or 4 character mojibake sequences
    # We'll use a regex that captures any character >= \x80 up to \xff.
    # Basically we find contiguous blocks of characters that are >= \x80
    
    # regex to find sequences of non-ASCII characters
    pattern = re.compile(r'[\x80-\xff]+')
    
    fixed_text = pattern.sub(decode_mojibake, text)
    
    # Hardcoded fixes for some edge cases where cp1252 has undefined chars like \x81 \x8d \x8f \x90 \x9d
    # Or cases that were partially fixed.
    hardcoded = {
        'ðŸ’³': '💳', 'ðŸ›’': '🛒', 'ðŸ“ˆ': '📈', 'ðŸ’µ': '💵', 'âš¡': '⚡', 'ðŸ”„': '🔄', 'ðŸ“¢': '📢', 'ðŸ“‹': '📋', 'ðŸ¤–': '🤖', 'âœ…': '✅', 'âš ': '⚠', 'ðŸ”Ž': '🔎',
        'ðŸ¢': '🏢', 'â€“': '–', 'ðŸ’§': '💡',
        'LanÃ§amentos': 'Lançamentos', 'MÃªs': 'Mês', 'AtÃ©': 'Até', 'DescriÃ§Ã£o': 'Descrição',
        'CartÃ£o': 'Cartão', 'CrÃ©dito': 'Crédito', 'DÃ©bito': 'Débito', 'TransferÃªncia': 'Transferência',
        'AÃ§Ãµes': 'Ações', 'OpÃ§Ãµes': 'Opções', 'AlteraÃ§Ã£o': 'Alteração',
        'â†“': '↓', 'â†‘': '↑', 'â†”': '↔', 'â^’': '-', 'â€¢': '•', 'âœ…': '✅', 'ðŸ‘¤': '👤', 'ðŸ’¡': '💡'
    }
    
    for bad, good in hardcoded.items():
        fixed_text = fixed_text.replace(bad, good)
        
    if fixed_text != text:
        print(f"Fixed {file_path}")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_text)

for file_path in glob.glob('src/components/*.tsx'):
    fix_file(file_path)

import os
import re

def reverse_cp1252_corruption(text):
    # This function looks for any sequence of characters in the text
    # that could be the result of reading utf-8 as cp1252.
    # It does this by checking if encoding the string as cp1252 and decoding as utf-8 works.
    
    # We will build the fixed string character by character or chunk by chunk
    # Actually, if we just try to encode the WHOLE text as cp1252, it will fail
    # because of legitimate characters like '✅' or '↓' that are already fixed.
    
    # So we look for sequences of characters that are all >= \x80
    # or specifically in the cp1252 range that often show up in mojibake.
    
    def replacer(match):
        bad_str = match.group(0)
        try:
            raw_bytes = bad_str.encode('cp1252')
            good_str = raw_bytes.decode('utf-8')
            # If the decoded string is exactly the same as the bad string, it means
            # it was just ascii, but our regex forces >= \x80.
            return good_str
        except Exception:
            # If it doesn't form valid utf-8, just return the original
            return bad_str

    # Match sequences of non-ascii characters
    pattern = re.compile(r'[^\x00-\x7F]+')
    
    return pattern.sub(replacer, text)

def fix_all_files():
    for root, dirs, files in os.walk('src'):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                original = content
                
                # Apply the reversible fix 3 times in case of multiple corruptions
                for _ in range(3):
                    content = reverse_cp1252_corruption(content)
                
                # Manual fallbacks for known un-reversible ones (due to cp1252 undefined holes)
                fallbacks = {
                    'ðŸ’³': '💳', 'ðŸ›’': '🛒', 'ðŸ“ˆ': '📈', 'ðŸ’µ': '💵', 'âš¡': '⚡', 'ðŸ”„': '🔄', 'ðŸ“¢': '📢', 'ðŸ“‹': '📋',
                    'ðŸ¤–': '🤖', 'âœ…': '✅', 'âš ': '⚠', 'ðŸ”Ž': '🔎', 'ðŸ ¢': '🏢', 'ðŸ’§': '💡', 'ðŸ‘¤': '👤', 'ðŸ’¡': '💡',
                    'ðŸ§\xa0': '🧠', 'ðŸ“Ž': '📎', 'â€“': '–', 'â€”': '—', 'â^’': '-'
                }
                for bad, good in fallbacks.items():
                    content = content.replace(bad, good)
                
                if content != original:
                    print('Fixed:', path)
                    with open(path, 'w', encoding='utf-8') as file:
                        file.write(content)

if __name__ == '__main__':
    fix_all_files()

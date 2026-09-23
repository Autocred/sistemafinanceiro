import os

def fix_all_files():
    replacements = {
        'LanÃ§amentos': 'Lançamentos',
        'MÃªs': 'Mês',
        'AtÃ©': 'Até',
        'DescriÃ§Ã£o': 'Descrição',
        'CartÃ£o': 'Cartão',
        'CrÃ©dito': 'Crédito',
        'DÃ©bito': 'Débito',
        'TransferÃªncia': 'Transferência',
        'AÃ§Ãµes': 'Ações',
        'OpÃ§Ãµes': 'Opções',
        'AlteraÃ§Ã£o': 'Alteração',
        'UsuÃ¡rio': 'Usuário',
        'RelatÃ³rios': 'Relatórios',
        'GrÃ¡ficos': 'Gráficos',
        'AtenÃ§Ã£o': 'Atenção',
        'ConfiguraÃ§Ãµes': 'Configurações',
        'InformaÃ§Ãµes': 'Informações',
        'PadrÃ£o': 'Padrão',
        'LÃ\xadquido': 'Líquido',
        'LÃ\xaddes': 'Líderes',
        'Ãšltimos': 'Últimos',
        'prÃ³ximo': 'próximo',
        'PrÃ³ximo': 'Próximo',
        'vocÃª': 'você',
        'VocÃª': 'Você',
        'NÃ£o': 'Não',
        'nÃ£o': 'não',
        'SimulaÃ§Ã£o': 'Simulação',
        'Ã§': 'ç', 'Ã£': 'ã', 'Ã©': 'é', 'Ãª': 'ê', 'Ã¡': 'á', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã\xad': 'í', 'Ãµ': 'õ', 'Ã¢': 'â',
        'Ã§Ã£o': 'ção', 'Ã§Ãµes': 'ções',
        'Â': '',
        'â€œ': '“', 'â€ ': '”', 'â€™': '’',
        'â^’': '-', 'â€“': '–', 'â€”': '—',
        'â†“': '↓', 'â†‘': '↑', 'â†”': '↔',
        'ðŸ’³': '💳', 'ðŸ›’': '🛒', 'ðŸ“ˆ': '📈', 'ðŸ’µ': '💵', 'âš¡': '⚡', 'ðŸ”„': '🔄', 'ðŸ“¢': '📢', 'ðŸ“‹': '📋',
        'ðŸ¤–': '🤖', 'âœ…': '✅', 'âš ': '⚠', 'ðŸ”Ž': '🔎', 'ðŸ ¢': '🏢', 'ðŸ’§': '💡', 'ðŸ‘¤': '👤', 'ðŸ’¡': '💡',
        'ðŸ§\xa0': '🧠', 'ðŸ“Ž': '📎',
        # Any residual double-encoded sequences we might have missed
        'Ã¢Ë†â€™': '-',
        'Ã¢â‚¬â€œ': '-',
        'Ã¢â‚¬â€': '-'
    }
    
    # Run the replacement multiple times to catch any nested weirdness
    for root, dirs, files in os.walk('src'):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                original = content
                for _ in range(2):
                    for bad, good in replacements.items():
                        content = content.replace(bad, good)
                
                if content != original:
                    print('Fixed:', path)
                    with open(path, 'w', encoding='utf-8') as file:
                        file.write(content)

if __name__ == '__main__':
    fix_all_files()

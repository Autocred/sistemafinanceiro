import os
import glob

def fix_text(text):
    replacements = {
        'LanÃ§amentos': 'Lançamentos',
        'MÃªs': 'Mês',
        'AtÃ©': 'Até',
        'EspecÃfica': 'Específica',
        'PerÃodos': 'Períodos',
        'DescriÃ§Ã£o': 'Descrição',
        'instantÃ¢nea': 'instantânea',
        'descriÃ§Ã£o': 'descrição',
        'OpÃ§Ãµes': 'Opções',
        'AÃ§Ãµes': 'Ações',
        'CartÃ£o': 'Cartão',
        'CrÃ©dito': 'Crédito',
        'DÃ©bito': 'Débito',
        'TransferÃªncia': 'Transferência',
        'AlteraÃ§Ã£o': 'Alteração',
        'AtenÃ§Ã£o': 'Atenção',
        'PadrÃ£o': 'Padrão',
        'vocÃª': 'você',
        'VocÃª': 'Você',
        'NÃ£o': 'Não',
        'nÃ£o': 'não',
        'SimulaÃ§Ã£o': 'Simulação',
        'PrÃ³ximo': 'Próximo',
        'prÃ³ximo': 'próximo',
        'Últimos': 'Últimos',
        'Ãšltimos': 'Últimos',
        'InformaÃ§Ãµes': 'Informações',
        'ConfiguraÃ§Ãµes': 'Configurações',
        'UsuÃ¡rio': 'Usuário',
        'RelatÃ³rios': 'Relatórios',
        'GrÃ¡ficos': 'Gráficos',
        'LÃ\xadquido': 'Líquido',
        'LÃ\xaddes': 'Líderes',
        'â^’': '-',
        'â€¢': '•',
        'ðŸ’³': '💳',
        'ðŸ›’': '🛒',
        'ðŸ“ˆ': '📈',
        'ðŸ’µ': '💵',
        'âš¡': '⚡',
        'ðŸ”„': '🔄',
        'ðŸ“¢': '📢',
        'ðŸ“‹': '📋',
        'ðŸ¤–': '🤖',
        'âœ…': '✅',
        'âš ': '⚠',
        'ðŸ”Ž': '🔎',
        'Ã§': 'ç',
        'Ã£': 'ã',
        'Ã©': 'é',
        'Ãª': 'ê',
        'Ã¡': 'á',
        'Ã³': 'ó',
        'Ãº': 'ú',
        'Ã\xad': 'í',
        'Ãµ': 'õ',
        'Ã¢': 'â',
        'Ã§Ã£o': 'ção',
        'Ã§Ãµes': 'ções',
        'Â': '',
        'â€œ': '“',
        'â€ ': '”',
        'â€™': '’',
    }
    
    for bad, good in replacements.items():
        text = text.replace(bad, good)
    return text

for file_path in glob.glob('src/components/*.tsx'):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    fixed = fix_text(content)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(fixed)

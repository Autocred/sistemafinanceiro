import re

def update_file():
    with open('src/components/LancamentosV2.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update filter logic
    content = content.replace(
        "const checkReceita = filtrosAtivos.includes('receita');\n    const checkDespesa = filtrosAtivos.includes('despesa');\n    let matchTipo = true;\n    if (!showAll && (checkReceita || checkDespesa)) {\n      matchTipo = (checkReceita && t.tipo === 'receita') || (checkDespesa && t.tipo === 'despesa');\n    }",
        "const checkReceita = filtrosAtivos.includes('receita');\n    const checkDespesa = filtrosAtivos.includes('despesa');\n    const checkCartao = filtrosAtivos.includes('cartao');\n    let matchTipo = true;\n    if (!showAll && (checkReceita || checkDespesa || checkCartao)) {\n      matchTipo = (checkReceita && t.tipo === 'receita') || (checkDespesa && t.tipo === 'despesa') || (checkCartao && t.formaPagamento === 'cartao_credito');\n    }"
    )

    # 2. Add button to type filters
    content = content.replace(
        "{ id: 'vencido', label: 'Vencidos' },\n            { id: 'recorrente', label: 'Recorrentes' }",
        "{ id: 'vencido', label: 'Vencidos' },\n            { id: 'cartao', label: '💳 Cartão' },\n            { id: 'recorrente', label: 'Recorrentes' }"
    )

    # 3. Enhance period button styles
    old_period_style = "style={{\n                padding: '6px 14px', borderRadius: 20,\n                background: periodoFiltro === f.id ? 'var(--text-primary)' : 'var(--bg-secondary)',\n                color: periodoFiltro === f.id ? 'var(--bg-primary)' : 'var(--text-primary)',\n                border: `1px solid ${periodoFiltro === f.id ? 'var(--text-primary)' : 'var(--border)'}`,\n                fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',\n                transition: 'all 0.2s ease-in-out'\n              }}"
    new_period_style = "style={{\n                padding: '8px 16px', borderRadius: '12px',\n                background: periodoFiltro === f.id ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'var(--bg-secondary)',\n                color: periodoFiltro === f.id ? '#ffffff' : 'var(--text-primary)',\n                border: `1px solid ${periodoFiltro === f.id ? 'transparent' : 'var(--border)'}`,\n                boxShadow: periodoFiltro === f.id ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',\n                fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',\n                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',\n                transform: periodoFiltro === f.id ? 'scale(1.02)' : 'scale(1)'\n              }}"
    content = content.replace(old_period_style, new_period_style)

    # 4. Enhance type filters style
    old_type_style = "style={{\n                padding: '6px 14px', borderRadius: 20,\n                background: isActive ? '#0284c7' : 'var(--bg-secondary)',\n                color: isActive ? '#fff' : 'var(--text-primary)',\n                border: `1px solid ${isActive ? '#0284c7' : 'var(--border)'}`,\n                fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',\n                transition: 'all 0.2s ease-in-out'\n              }}"
    new_type_style = "style={{\n                padding: '8px 16px', borderRadius: '12px',\n                background: isActive ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : 'var(--bg-secondary)',\n                color: isActive ? '#ffffff' : 'var(--text-primary)',\n                border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,\n                boxShadow: isActive ? '0 4px 12px rgba(2,132,199,0.25)' : 'none',\n                fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',\n                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',\n                transform: isActive ? 'scale(1.02)' : 'scale(1)'\n              }}"
    content = content.replace(old_type_style, new_type_style)

    with open('src/components/LancamentosV2.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    update_file()

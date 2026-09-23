// ─── PERMISSÕES DO SISTEMA ─────────────────────────────────
// Cada menu tem uma flag master (menu_*) que controla a visibilidade.
// Se desmarcado, o menu e seu ícone desaparecem completamente.
// Sub-permissões só são relevantes se o menu estiver habilitado.

export const PERMISSOES_SISTEMA = [
  // ─── Dashboard ───────────────────────────────
  { id: 'menu_dashboard', label: '📊 Menu Dashboard', grupo: 'Dashboard', isMenuToggle: true },
  { id: 'dashboard_ver', label: 'Ver Dashboard Geral', grupo: 'Dashboard' },

  // ─── Cockpit CFO ─────────────────────────────
  { id: 'menu_cfo', label: '🧠 Menu Cockpit CFO', grupo: 'Cockpit CFO', isMenuToggle: true },
  { id: 'dashboard_cfo', label: 'Ver Cockpit CFO', grupo: 'Cockpit CFO' },

  // ─── Extrato Bancário ────────────────────────
  { id: 'menu_extrato', label: '📖 Menu Extrato Bancário', grupo: 'Extrato Bancário', isMenuToggle: true },
  { id: 'extrato_ver', label: 'Ver Extrato Bancário Completo', grupo: 'Extrato Bancário' },

  // ─── Lançamentos ─────────────────────────────
  { id: 'menu_lancamentos', label: '📝 Menu Lançamentos', grupo: 'Lançamentos', isMenuToggle: true },
  { id: 'lancamentos_ver_proprios', label: 'Ver Apenas Seus Lançamentos', grupo: 'Lançamentos' },
  { id: 'lancamentos_ver_todos', label: 'Ver Todos os Lançamentos', grupo: 'Lançamentos' },
  { id: 'lancamentos_criar', label: 'Criar Novos Lançamentos', grupo: 'Lançamentos' },
  { id: 'lancamentos_editar', label: 'Editar Lançamentos Existentes', grupo: 'Lançamentos' },
  { id: 'lancamentos_excluir', label: 'Excluir Lançamentos', grupo: 'Lançamentos' },
  { id: 'lancamentos_aprovar', label: 'Aprovar Lançamentos Pendentes', grupo: 'Lançamentos' },

  // ─── Calendário ERP ──────────────────────────
  { id: 'menu_calendario', label: '📅 Menu Calendário ERP', grupo: 'Calendário ERP', isMenuToggle: true },
  { id: 'calendario_ver', label: 'Ver Calendário', grupo: 'Calendário ERP' },

  // ─── Conciliação OFX ─────────────────────────
  { id: 'menu_conciliacao', label: '🔄 Menu Conciliação OFX', grupo: 'Conciliação OFX', isMenuToggle: true },
  { id: 'conciliacao_acessar', label: 'Fazer Conciliação Bancária', grupo: 'Conciliação OFX' },

  // ─── Aprovações ──────────────────────────────
  { id: 'menu_aprovacoes', label: '✅ Menu Aprovações', grupo: 'Aprovações', isMenuToggle: true },
  { id: 'lancamentos_aprovar_menu', label: 'Aprovar Lançamentos', grupo: 'Aprovações' },

  // ─── Automações ──────────────────────────────
  { id: 'menu_regras', label: '⚡ Menu Automações', grupo: 'Automações', isMenuToggle: true },
  { id: 'regras_acessar', label: 'Criar Automações e Regras', grupo: 'Automações' },

  // ─── Relatórios ──────────────────────────────
  { id: 'menu_relatorios', label: '📈 Menu Relatórios', grupo: 'Relatórios', isMenuToggle: true },
  { id: 'relatorios_dre', label: 'Ver DRE', grupo: 'Relatórios' },
  { id: 'relatorios_fluxo', label: 'Ver Fluxo de Caixa', grupo: 'Relatórios' },

  // ─── Contas & Cartões ────────────────────────
  { id: 'menu_contas', label: '💳 Menu Contas & Cartões', grupo: 'Contas & Cartões', isMenuToggle: true },
  { id: 'contas_ver', label: 'Ver Contas e Cartões', grupo: 'Contas & Cartões' },
  { id: 'contas_criar', label: 'Criar Contas e Cartões', grupo: 'Contas & Cartões' },
  { id: 'contas_editar', label: 'Editar Contas e Cartões', grupo: 'Contas & Cartões' },
  { id: 'contas_excluir', label: 'Excluir Contas e Cartões', grupo: 'Contas & Cartões' },

  // ─── Cadastros ───────────────────────────────
  { id: 'menu_cadastros', label: '📋 Menu Cadastros', grupo: 'Cadastros', isMenuToggle: true },
  { id: 'cadastros_ver', label: 'Ver Fornecedores e Clientes', grupo: 'Cadastros' },
  { id: 'cadastros_criar', label: 'Cadastrar Novos (Fornecedores/Clientes)', grupo: 'Cadastros' },
  { id: 'cadastros_editar', label: 'Editar Cadastros', grupo: 'Cadastros' },
  { id: 'cadastros_excluir', label: 'Excluir Cadastros', grupo: 'Cadastros' },

  // ─── Minha Equipe ────────────────────────────
  { id: 'menu_equipe', label: '👥 Menu Minha Equipe', grupo: 'Minha Equipe', isMenuToggle: true },
  { id: 'equipe_acessar', label: 'Gerenciar Equipe', grupo: 'Minha Equipe' },

  // ─── IA Analista ─────────────────────────────
  { id: 'menu_chat', label: '🤖 Menu IA Analista', grupo: 'IA Analista', isMenuToggle: true },
  { id: 'chat_ia', label: 'Acessar Inteligência Artificial', grupo: 'IA Analista' },

  // ─── Configurações ───────────────────────────
  { id: 'menu_configuracoes', label: '⚙️ Menu Configurações', grupo: 'Configurações', isMenuToggle: true },
  { id: 'configuracoes_acessar', label: 'Acessar Configurações Gerais', grupo: 'Configurações' },

  // ─── Auditoria ───────────────────────────────
  { id: 'menu_auditoria', label: '🛡️ Menu Auditoria', grupo: 'Auditoria', isMenuToggle: true },
  { id: 'auditoria_ver', label: 'Ver Log de Auditoria', grupo: 'Auditoria' },
];

// Maps each NAV_ITEM.id to the menu toggle permission
export const MENU_PERMISSION_MAP: Record<string, string> = {
  'dashboard':      'menu_dashboard',
  'dashboard_mensal': 'menu_dashboard',
  'cfo':            'menu_cfo',
  'extrato':        'menu_extrato',
  'lancamentos':    'menu_lancamentos',
  'calendario':     'menu_calendario',
  'conciliacao':    'menu_conciliacao',
  'aprovacoes':     'menu_aprovacoes',
  'regras':         'menu_regras',
  'relatorios':     'menu_relatorios',
  'contas':         'menu_contas',
  'cadastros':      'menu_cadastros',
  'equipe':         'menu_equipe',
  'chat':           'menu_chat',
  'configuracoes':  'menu_configuracoes',
  'auditoria':      'menu_auditoria',
};

export function getDefaultPermissionsForRole(role: string): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  
  if (role === 'admin' || role === 'master' || role === 'manager') {
    PERMISSOES_SISTEMA.forEach(p => perms[p.id] = true);
    return perms;
  }
  
  // Set all to false first
  PERMISSOES_SISTEMA.forEach(p => perms[p.id] = false);

  if (role === 'financeiro') {
    // Menus habilitados
    perms['menu_dashboard'] = true;
    perms['menu_extrato'] = true;
    perms['menu_lancamentos'] = true;
    perms['menu_calendario'] = true;
    perms['menu_conciliacao'] = true;
    perms['menu_aprovacoes'] = true;
    perms['menu_relatorios'] = true;
    perms['menu_contas'] = true;
    perms['menu_cadastros'] = true;
    // Sub-permissões
    perms['dashboard_ver'] = true;
    perms['relatorios_dre'] = true;
    perms['relatorios_fluxo'] = true;
    perms['lancamentos_ver_todos'] = true;
    perms['lancamentos_criar'] = true;
    perms['lancamentos_editar'] = true;
    perms['lancamentos_aprovar'] = true;
    perms['lancamentos_aprovar_menu'] = true;
    perms['extrato_ver'] = true;
    perms['conciliacao_acessar'] = true;
    perms['contas_ver'] = true;
    perms['cadastros_ver'] = true;
    perms['cadastros_criar'] = true;
    perms['cadastros_editar'] = true;
    perms['calendario_ver'] = true;
  }
  
  if (role === 'user') {
    // Menus habilitados (poucos)
    perms['menu_dashboard'] = true;
    perms['menu_lancamentos'] = true;
    perms['menu_calendario'] = true;
    perms['menu_cadastros'] = true;
    // Sub-permissões
    perms['dashboard_ver'] = true;
    perms['lancamentos_ver_proprios'] = true;
    perms['lancamentos_criar'] = true;
    perms['cadastros_ver'] = true;
    perms['calendario_ver'] = true;
  }

  return perms;
}

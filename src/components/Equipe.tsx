'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getDb, firebaseConfig } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, AppUser, resetarSenha } from '@/lib/auth';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getConfiguracoes, salvarConfiguracoes } from '@/lib/storage';
import { ConfiguracaoApp } from '@/lib/types';
import { Users, UserPlus, Edit2, Ban, Trash2, CheckCircle2, Shield, Key, Mail, Briefcase, Plus, X, Save } from 'lucide-react';
import { registrarLogAuditoria } from '@/lib/saas';
import { PERMISSOES_SISTEMA, getDefaultPermissionsForRole } from '@/lib/permissions';

// Master UID real não Firebase (conta clovis@financeai.com)
const MASTER_REAL_UID = '9yxuafoC0AV9BrIKem05ponbmgn2';

// Cargos padrão do sistema (não editáveis)
const CARGOS_PADRAO = [
  { id: 'admin', nome: 'Administrador (Master)', fixo: true },
  { id: 'manager', nome: 'Gerente', fixo: true },
  { id: 'financeiro', nome: 'Analista Financeiro', fixo: true },
  { id: 'user', nome: 'Colaborador Comum', fixo: true },
];

type CargoCustom = { id: string; nome: string; permissoes: Record<string, boolean> };

export default function Equipe() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState<ConfiguracaoApp | null>(null);
  const [myTenantId, setMyTenantId] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'membros' | 'cargos'>('membros');

  // ─── User form states ───
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('user');
  const [userPermissoes, setUserPermissoes] = useState<Record<string, boolean>>({});
  const [opcaoSenha, setOpcaoSenha] = useState<'gerar' | 'email'>('gerar');
  const [senhaGeradaTela, setSenhaGeradaTela] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // ─── Cargo form states ───
  const [showCargoForm, setShowCargoForm] = useState(false);
  const [editCargo, setEditCargo] = useState<CargoCustom | null>(null);
  const [cargoNome, setCargoNome] = useState('');
  const [cargoPermissoes, setCargoPermissoes] = useState<Record<string, boolean>>({});

  const [resolvedUid, setResolvedUid] = useState<string | null>(null);
  const auth = getFirebaseAuth();

  // Resolve UID
  useEffect(() => {
    const isBypass = typeof window !== 'undefined' && (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true';
    if (isBypass) { setResolvedUid(MASTER_REAL_UID); return; }
    if (auth.currentUser) setResolvedUid(auth.currentUser.uid);
    const unsub = auth.onAuthStateChanged(user => {
      if (user) { setResolvedUid(user.uid); } else {
        const bypassNow = typeof window !== 'undefined' && (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true';
        setResolvedUid(bypassNow ? MASTER_REAL_UID : null);
      }
    });
    return () => unsub();
  }, [auth]);

  // Load team data
  const loadData = useCallback(async () => {
    if (!resolvedUid) { setLoading(false); return; }
    setLoading(true);
    try {
      try {
        const isBypass = typeof window !== 'undefined' && (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true';
        const configUid = isBypass ? 'clovis-master-bypass' : resolvedUid;
        const configDB = await getConfiguracoes(configUid);
        setCfg(configDB);
      } catch (e) { console.warn('Config load failed:', e); }

      let tenantIdLocal: string | null = null;
      const myDoc = await getDoc(doc(getDb(), 'users', resolvedUid));
      if (myDoc.exists()) tenantIdLocal = myDoc.data().tenantId || null;
      if (!tenantIdLocal) {
        tenantIdLocal = resolvedUid;
        await setDoc(doc(getDb(), 'users', resolvedUid), { tenantId: tenantIdLocal }, { merge: true });
      }
      setMyTenantId(tenantIdLocal);

      const q = query(collection(getDb(), 'users'), where('tenantId', '==', tenantIdLocal));
      const snap = await getDocs(q);
      const data: AppUser[] = [];
      snap.forEach(d => { data.push({ ...d.data(), uid: d.id } as AppUser); });
      setUsers(data);
    } catch (e) { console.error('loadData error:', e); }
    finally { setLoading(false); }
  }, [resolvedUid]);

  useEffect(() => { if (resolvedUid) loadData(); }, [resolvedUid, loadData]);

  // ─── All cargos (padrão + custom) ───
  const cargosCustom: CargoCustom[] = cfg?.cargosPersonalizados || [];
  const todosCargos = [
    ...CARGOS_PADRAO.map(c => ({ ...c, permissoes: getDefaultPermissionsForRole(c.id), custom: false })),
    ...cargosCustom.map(c => ({ ...c, fixo: false, custom: true })),
  ];

  // Get permissions for a cargo ID
  const getPermissoesCargo = (cargoId: string): Record<string, boolean> => {
    const custom = cargosCustom.find(c => c.id === cargoId);
    if (custom) return custom.permissoes;
    return getDefaultPermissionsForRole(cargoId);
  };

  // ─── CARGO CRUD ───
  const openNewCargoForm = () => {
    setEditCargo(null);
    setCargoNome('');
    const perms: Record<string, boolean> = {};
    PERMISSOES_SISTEMA.forEach(p => perms[p.id] = false);
    setCargoPermissoes(perms);
    setShowCargoForm(true);
  };

  const openEditCargoForm = (c: CargoCustom) => {
    setEditCargo(c);
    setCargoNome(c.nome);
    const perms: Record<string, boolean> = {};
    PERMISSOES_SISTEMA.forEach(p => perms[p.id] = false);
    setCargoPermissoes({ ...perms, ...c.permissoes });
    setShowCargoForm(true);
  };

  const salvarCargo = async () => {
    if (!cargoNome.trim()) { alert('Digite o nome do cargo.'); return; }
    if (!resolvedUid) return;

    const isBypass = typeof window !== 'undefined' && (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true';
    const configUid = isBypass ? 'clovis-master-bypass' : resolvedUid;

    let novosCargos = [...cargosCustom];
    if (editCargo) {
      const exists = novosCargos.some(c => c.id === editCargo.id);
      if (exists) {
        novosCargos = novosCargos.map(c => c.id === editCargo.id ? { ...c, nome: cargoNome.trim(), permissoes: cargoPermissoes } : c);
      } else {
        // Editando um cargo padrão pela primeira vez
        novosCargos.push({ id: editCargo.id, nome: cargoNome.trim(), permissoes: cargoPermissoes });
      }
    } else {
      const id = 'cargo_' + Date.now();
      novosCargos.push({ id, nome: cargoNome.trim(), permissoes: cargoPermissoes });
    }

    const updatedCfg = { ...(cfg || {} as ConfiguracaoApp), cargosPersonalizados: novosCargos };
    await salvarConfiguracoes(updatedCfg, configUid);
    setCfg(updatedCfg);
    setShowCargoForm(false);
    alert(editCargo ? 'Cargo atualizado!' : 'Cargo criado com sucesso!');
  };

  const excluirCargo = async (cargoId: string, isDefault: boolean = false) => {
    if (isDefault) {
      if (!confirm('Reverter este cargo padrão para as configurações de fábrica?')) return;
    } else {
      if (!confirm('Excluir este cargo? Usuários com este cargo manterão as permissões atuais.')) return;
    }
    if (!resolvedUid) return;

    const isBypass = typeof window !== 'undefined' && (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true';
    const configUid = isBypass ? 'clovis-master-bypass' : resolvedUid;

    const novosCargos = cargosCustom.filter(c => c.id !== cargoId);
    const updatedCfg = { ...(cfg || {} as ConfiguracaoApp), cargosPersonalizados: novosCargos };
    await salvarConfiguracoes(updatedCfg, configUid);
    setCfg(prev => prev ? { ...prev, cargosPersonalizados: novosCargos } : prev);
  };

  const toggleCargoPermissao = (id: string) => {
    setCargoPermissoes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── USER CRUD ───
  const openNewForm = () => {
    setEditUser(null);
    setNome(''); setEmail('');
    setCargo('user');
    setUserPermissoes(getPermissoesCargo('user'));
    setSenhaGeradaTela(''); setOpcaoSenha('gerar');
    setStatusMsg(''); setShowForm(true);
  };

  const openEditForm = (u: AppUser) => {
    setEditUser(u);
    setNome(u.nome); setEmail(u.email);
    setCargo(u.role || 'user');
    setUserPermissoes(u.permissoes || getPermissoesCargo(u.role || 'user'));
    setSenhaGeradaTela(''); setStatusMsg('');
    setShowForm(true);
  };

  const handleClickSubmit = async () => {
    if (!resolvedUid) { alert('Você precisa estar logado.'); return; }
    if (!myTenantId) { alert('Erro: ID da empresa não encontrado.'); return; }
    if (!nome.trim()) { alert('Preencha o nome.'); return; }
    if (!email.trim()) { alert('Preencha o e-mail.'); return; }

    setIsSubmitting(true); setStatusMsg('Processando...');

    try {
      if (editUser) {
        await updateDoc(doc(getDb(), 'users', editUser.uid), {
          nome: nome.trim(), role: cargo,
          permissoes: userPermissoes,
          atualizadoEm: new Date().toISOString()
        });
        try { await registrarLogAuditoria('EQUIPE_EDITAR', 'equipe', editUser.uid, `Cargo de ${nome} atualizado para ${cargo}.`, 'Master'); } catch {}
        alert('Usuário atualizado com sucesso!');
        setShowForm(false); await loadData();
      } else {
        let secondaryApp;
        try { secondaryApp = getApp('SecondaryAuth'); } catch { secondaryApp = initializeApp(firebaseConfig, 'SecondaryAuth'); }
        const secondaryAuth = getAuth(secondaryApp);
        const senha = `Equipe@${Math.floor(1000 + Math.random() * 9000)}`;

        setStatusMsg('Criando acesso não Firebase...');
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), senha);
        const newUid = cred.user.uid;
        await signOut(secondaryAuth);

        setStatusMsg('Salvando dados não banco...');
        await setDoc(doc(getDb(), 'users', newUid), {
          uid: newUid, nome: nome.trim(), email: email.trim().toLowerCase(),
          status: 'aprovado' as const, role: cargo, tenantId: myTenantId,
          permissoes: userPermissoes,
          createdAt: new Date().toISOString()
        });
        try { await registrarLogAuditoria('EQUIPE_CRIAR', 'equipe', newUid, `Novo usuário: ${nome} (cargo: ${cargo})`, 'Master'); } catch {}

        if (opcaoSenha === 'email') {
          try { await resetarSenha(email.trim()); alert('Usuário criado! E-mail de redefinição enviado.'); } catch { alert('Criado, mas e-mail falhou. Senha: ' + senha); }
          setShowForm(false);
        } else {
          setSenhaGeradaTela(senha);
          alert('Usuário criado! Anote a senha provisória.');
        }
        await loadData();
      }
    } catch (err: any) {
      let msg = 'Erro desconhecido.';
      if (err.code === 'auth/email-already-in-use') msg = 'Este e-mail já está cadastrado.';
      else if (err.code === 'auth/invalid-email') msg = 'E-mail inválido.';
      else if (err.message) msg = err.message;
      alert('ERRO: ' + msg);
    } finally { setIsSubmitting(false); setStatusMsg(''); }
  };

  const handleStatus = async (user: AppUser, novoStatus: string) => {
    if (!confirm(`Mudar status para ${novoStatus}?`)) return;
    try { await updateDoc(doc(getDb(), 'users', user.uid), { status: novoStatus }); loadData(); } catch { alert('Erro.'); }
  };

  const handleExcluir = async (user: AppUser) => {
    if (!confirm('CUIDADO: Excluir apagará o acesso. Continuar?')) return;
    try { await deleteDoc(doc(getDb(), 'users', user.uid)); loadData(); } catch { alert('Erro.'); }
  };

  const handleRedefinirSenha = async (emailToReset: string) => {
    if (!confirm(`Enviar link de redefinição para ${emailToReset}?`)) return;
    try { await resetarSenha(emailToReset); alert('E-mail enviado!'); } catch (e: any) { alert('Erro: ' + e.message); }
  };

  const gruposPermissoes = Array.from(new Set(PERMISSOES_SISTEMA.map(p => p.grupo)));
  const myUid = resolvedUid;

  // Get cargo name from id
  const getCargoNome = (cargoId: string): string => {
    const custom = cargosCustom.find(c => c.id === cargoId);
    if (custom) return custom.nome;
    const padrao = CARGOS_PADRAO.find(c => c.id === cargoId);
    if (padrao) return padrao.nome;
    return cargoId;
  };

  // ─── RENDER ─────────────────────────────────────────────
  return (
    <div className="fade-in p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={24} color="#8b5cf6" /> Minha Equipe
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Gerencie cargos, acessos e permissões.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {abaAtiva === 'membros' && (
            <button onClick={openNewForm} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40 }}>
              <UserPlus size={16} /> Novo Membro
            </button>
          )}
          {abaAtiva === 'cargos' && (
            <button onClick={openNewCargoForm} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40 }}>
              <Plus size={16} /> Novo Cargo
            </button>
          )}
        </div>
      </div>

      {/* ─── ABAS ─── */}
      {!showForm && !showCargoForm && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
          <button
            onClick={() => setAbaAtiva('membros')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: '10px 20px', color: abaAtiva === 'membros' ? '#8b5cf6' : 'var(--text-muted)', borderBottom: abaAtiva === 'membros' ? '3px solid #8b5cf6' : '3px solid transparent', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Users size={16} /> Membros ({users.filter(u => u.uid !== myUid).length})
          </button>
          <button
            onClick={() => setAbaAtiva('cargos')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: '10px 20px', color: abaAtiva === 'cargos' ? '#8b5cf6' : 'var(--text-muted)', borderBottom: abaAtiva === 'cargos' ? '3px solid #8b5cf6' : '3px solid transparent', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Briefcase size={16} /> Cargos ({CARGOS_PADRAO.length + cargosCustom.length})
          </button>
        </div>
      )}

      {/* ══════════════ ABA MEMBROS ══════════════ */}
      {abaAtiva === 'membros' && !showForm && (
        <div className="glass table-responsive">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Carregando equipe...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>E-mail</th>
                  <th>Cargo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.uid !== myUid).map(u => (
                  <tr key={u.uid}>
                    <td style={{ fontWeight: 600 }}>{u.nome}</td>
                    <td>{u.email}</td>
                    <td><span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }}>{getCargoNome(u.role || 'user')}</span></td>
                    <td>
                      {u.status === 'aprovado' || !u.status ? <span className="badge badge-green">Ativo</span> :
                       u.status === 'desativado' ? <span className="badge badge-red">Desativado</span> :
                       <span className="badge badge-yellow">Pendente</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleRedefinirSenha(u.email)} className="btn-secondary" style={{ padding: '6px 8px' }} title="Redefinir Senha"><Mail size={14} /></button>
                        <button onClick={() => openEditForm(u)} className="btn-secondary" style={{ padding: '6px 8px' }} title="Editar"><Edit2 size={14} /></button>
                        {u.status !== 'desativado' ? (
                          <button onClick={() => handleStatus(u, 'desativado')} className="btn-secondary" style={{ padding: '6px 8px', color: '#ef4444' }} title="Desativar"><Ban size={14} /></button>
                        ) : (
                          <button onClick={() => handleStatus(u, 'aprovado')} className="btn-secondary" style={{ padding: '6px 8px', color: '#10b981' }} title="Reativar"><CheckCircle2 size={14} /></button>
                        )}
                        <button onClick={() => handleExcluir(u)} className="btn-danger" style={{ padding: '6px 8px', background: '#ef4444' }} title="Excluir"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.filter(u => u.uid !== myUid).length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>Nenhum membro encontrado. Clique em "Novo Membro" para adicionar.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══════════════ ABA CARGOS ══════════════ */}
      {abaAtiva === 'cargos' && !showCargoForm && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {todosCargos.map(c => {
            const permCount = Object.values(c.permissoes).filter(Boolean).length;
            const totalPerms = PERMISSOES_SISTEMA.length;
            const menuCount = Object.entries(c.permissoes).filter(([k, v]) => k.startsWith('menu_') && v).length;
            return (
              <div key={c.id} className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Briefcase size={18} color="#8b5cf6" />
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{c.nome}</h3>
                    </div>
                    {c.fixo && <span className="badge" style={{ background: 'rgba(100,116,139,0.15)', color: 'var(--text-muted)', fontSize: 10 }}>Padrão do Sistema</span>}
                    {c.custom && <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontSize: 10 }}>Personalizado</span>}
                    {c.fixo && cargosCustom.some(cc => cc.id === c.id) && <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706', fontSize: 10, marginLeft: 6 }}>Modificado</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEditCargoForm(c as CargoCustom)} className="btn-secondary" style={{ padding: '6px 8px' }} title="Editar"><Edit2 size={14} /></button>
                    {c.custom && <button onClick={() => excluirCargo(c.id, false)} className="btn-danger" style={{ padding: '6px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none' }} title="Excluir"><Trash2 size={14} /></button>}
                    {c.fixo && cargosCustom.some(cc => cc.id === c.id) && <button onClick={() => excluirCargo(c.id, true)} className="btn-danger" style={{ padding: '6px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none' }} title="Reverter ao Padrão"><Trash2 size={14} /></button>}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6' }}>{menuCount}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Menus</p>
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{permCount}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Permissões</p>
                  </div>
                  <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{users.filter(u => u.uid !== myUid && u.role === c.id).length}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Usuários</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>Nível de acesso</span>
                    <span>{Math.round((permCount / totalPerms) * 100)}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(permCount / totalPerms) * 100}%`, background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════ FORM NOVO MEMBRO ══════════════ */}
      {showForm && (
        <div className="glass fade-in" style={{ padding: '30px', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 24 }}>
            {editUser ? <Edit2 size={24} color="var(--blue)" /> : <UserPlus size={24} color="var(--blue)" />}
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{editUser ? 'Editar Funcionário' : 'Cadastrar Membro da Equipe'}</h3>
          </div>

          {senhaGeradaTela && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: 20, borderRadius: 8, marginBottom: 20, textAlign: 'center' }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}><Key size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} /> Acesso criado com sucesso!</p>
              <p>Informe esta senha para o funcionário acessar:</p>
              <div style={{ fontSize: 32, fontWeight: 800, margin: '16px 0', letterSpacing: 2 }}>{senhaGeradaTela}</div>
              <p style={{ fontSize: 14 }}>Ele poderá trocá-la clicando em &quot;Esqueci minha senha&quot; não login.</p>
              <button onClick={() => { setShowForm(false); loadData(); }} className="btn-primary" style={{ padding: '12px 32px', marginTop: 20 }}>Concluir e Voltar</button>
            </div>
          )}

          {!senhaGeradaTela && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Nome do Funcionário</label>
                  <input type="text" className="input-field" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João da Silva" />
                </div>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>E-mail de Acesso</label>
                  <input type="text" className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@empresa.com" disabled={!!editUser} style={{ opacity: editUser ? 0.6 : 1 }} />
                </div>
              </div>

              {!editUser && (
                <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 8 }}>
                  <label style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'block' }}>Senha do Novo Usuário</label>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 15 }}>
                      <input type="radio" checked={opcaoSenha === 'gerar'} onChange={() => setOpcaoSenha('gerar')} style={{ width: 18, height: 18 }} /> Gerar senha provisória na tela
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 15 }}>
                      <input type="radio" checked={opcaoSenha === 'email'} onChange={() => setOpcaoSenha('email')} style={{ width: 18, height: 18 }} /> Enviar e-mail para criar senha
                    </label>
                  </div>
                </div>
              )}

              {/* ─── CARGO SELECTOR ─── */}
              <div>
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Cargo Base (Molde)</label>
                <select className="input-field" value={cargo} onChange={e => {
                  const novoCargo = e.target.value;
                  setCargo(novoCargo);
                  setUserPermissoes(getPermissoesCargo(novoCargo));
                }}>
                  {CARGOS_PADRAO.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  {cargosCustom.length > 0 && <option disabled>─── Personalizados ───</option>}
                  {cargosCustom.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                  As permissões abaixo serão preenchidas com o padrão deste cargo, mas você pode ajustá-las livremente para este usuário.
                </p>
              </div>

              {/* ─── PERMISSÕES INDIVIDUAIS ─── */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={16} color="#8b5cf6" /> Ajustar Permissões deste Usuário
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {gruposPermissoes.map(grupo => {
                    const grupoPerms = PERMISSOES_SISTEMA.filter(p => p.grupo === grupo);
                    const menuToggle = grupoPerms.find((p: any) => p.isMenuToggle);
                    const subPerms = grupoPerms.filter((p: any) => !p.isMenuToggle);
                    const menuAtivo = menuToggle ? !!userPermissoes[menuToggle.id] : true;

                    const handleMenuToggle = () => {
                      if (!menuToggle) return;
                      const novoValor = !userPermissoes[menuToggle.id];
                      const novos = { ...userPermissoes, [menuToggle.id]: novoValor };
                      if (!novoValor) subPerms.forEach(sp => novos[sp.id] = false);
                      setUserPermissoes(novos);
                    };

                    const toggleSub = (id: string) => {
                      setUserPermissoes(prev => ({ ...prev, [id]: !prev[id] }));
                    };

                    return (
                      <div key={grupo} style={{ background: 'var(--bg-secondary)', borderRadius: 10, border: `1px solid ${menuAtivo ? 'rgba(139,92,246,0.3)' : 'var(--border)'}`, overflow: 'hidden', opacity: menuAtivo ? 1 : 0.65, transition: 'all 0.2s ease' }}>
                        {menuToggle && (
                          <div onClick={handleMenuToggle} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', background: menuAtivo ? 'rgba(139,92,246,0.08)' : 'transparent', borderBottom: menuAtivo && subPerms.length > 0 ? '1px solid var(--border)' : 'none' }}>
                            <input type="checkbox" checked={menuAtivo} readOnly style={{ width: 18, height: 18, accentColor: '#8b5cf6' }} />
                            <span style={{ fontSize: 15, fontWeight: 700, color: menuAtivo ? 'var(--text-primary)' : 'var(--text-muted)' }}>{menuToggle.label}</span>
                          </div>
                        )}
                        {menuAtivo && subPerms.length > 0 && (
                          <div style={{ padding: '12px 16px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                            {subPerms.map(p => (
                              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <input type="checkbox" checked={!!userPermissoes[p.id]} onChange={() => toggleSub(p.id)} style={{ width: 15, height: 15 }} />
                                {p.label}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {statusMsg && (
                <div style={{ padding: 12, background: 'rgba(139, 92, 246, 0.1)', borderRadius: 8, color: '#8b5cf6', fontWeight: 600 }}>⏳ {statusMsg}</div>
              )}

              <div style={{ display: 'flex', gap: 16, marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                <button type="button" onClick={handleClickSubmit} className="btn-primary" disabled={isSubmitting} style={{ padding: '14px 32px', fontSize: 16, opacity: isSubmitting ? 0.6 : 1 }}>
                  {isSubmitting ? '⏳ Salvando...' : (editUser ? 'Salvar Alterações' : 'Cadastrar Membro')}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} disabled={isSubmitting} style={{ padding: '14px 32px', fontSize: 16 }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ FORM NOVO CARGO ══════════════ */}
      {showCargoForm && (
        <div className="glass fade-in" style={{ padding: '30px', marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 24 }}>
            <Briefcase size={24} color="#8b5cf6" />
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{editCargo ? 'Editar Cargo' : 'Criar Novo Cargo'}</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Nome do Cargo</label>
              <input type="text" className="input-field" value={cargoNome} onChange={e => setCargoNome(e.target.value)} placeholder="Ex: Assistente Administrativo" />
            </div>

            {/* ─── PERMISSÕES POR MENU ─── */}
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={18} color="#8b5cf6" /> Permissões por Menu
              </h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Marque os menus que este cargo terá acesso. Desmarque para ocultar completamente.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {gruposPermissoes.map(grupo => {
                  const grupoPerms = PERMISSOES_SISTEMA.filter(p => p.grupo === grupo);
                  const menuToggle = grupoPerms.find((p: any) => p.isMenuToggle);
                  const subPerms = grupoPerms.filter((p: any) => !p.isMenuToggle);
                  const menuAtivo = menuToggle ? !!cargoPermissoes[menuToggle.id] : true;

                  const handleMenuToggle = () => {
                    if (!menuToggle) return;
                    const novoValor = !cargoPermissoes[menuToggle.id];
                    const novos = { ...cargoPermissoes, [menuToggle.id]: novoValor };
                    if (!novoValor) subPerms.forEach(sp => novos[sp.id] = false);
                    setCargoPermissoes(novos);
                  };

                  return (
                    <div key={grupo} style={{ background: 'var(--bg-secondary)', borderRadius: 10, border: `1px solid ${menuAtivo ? 'rgba(139,92,246,0.3)' : 'var(--border)'}`, overflow: 'hidden', opacity: menuAtivo ? 1 : 0.65, transition: 'all 0.2s ease' }}>
                      {menuToggle && (
                        <div onClick={handleMenuToggle} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', background: menuAtivo ? 'rgba(139,92,246,0.08)' : 'transparent', borderBottom: menuAtivo && subPerms.length > 0 ? '1px solid var(--border)' : 'none' }}>
                          <input type="checkbox" checked={menuAtivo} readOnly style={{ width: 18, height: 18, accentColor: '#8b5cf6' }} />
                          <span style={{ fontSize: 15, fontWeight: 700, color: menuAtivo ? 'var(--text-primary)' : 'var(--text-muted)' }}>{menuToggle.label}</span>
                          {!menuAtivo && <span style={{ fontSize: 11, color: '#ef4444', marginLeft: 'auto', fontWeight: 600 }}>OCULTO</span>}
                          {menuAtivo && <span style={{ fontSize: 11, color: '#10b981', marginLeft: 'auto', fontWeight: 600 }}>VISÍVEL</span>}
                        </div>
                      )}
                      {menuAtivo && subPerms.length > 0 && (
                        <div style={{ padding: '12px 16px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                          {subPerms.map(p => (
                            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                              <input type="checkbox" checked={!!cargoPermissoes[p.id]} onChange={() => toggleCargoPermissao(p.id)} style={{ width: 15, height: 15 }} />
                              {p.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
              <button type="button" onClick={salvarCargo} className="btn-primary" style={{ padding: '14px 32px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Save size={16} /> {editCargo ? 'Salvar Cargo' : 'Criar Cargo'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowCargoForm(false)} style={{ padding: '14px 32px', fontSize: 16 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

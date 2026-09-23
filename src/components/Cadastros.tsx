import { getFormasPagamentoCustom, addFormaPagamentoCustom, updateFormaPagamentoCustom, deleteFormaPagamentoCustom } from '@/lib/firebase';
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCategorias, salvarCategoria, deletarCategoria, getCentrosCusto, salvarCentroCusto, deletarCentroCusto, getFornecedores, salvarFornecedor, deletarFornecedor, getClientes, salvarCliente, deletarCliente, formatarMoeda, gerarIdPublico } from '@/lib/storage';
import { Categoria, CentroCusto, Fornecedor, Cliente } from '@/lib/types';
import { PlusCircle, Trash2, X, Check, Search } from 'lucide-react';
import { DynamicIcon } from '@/components/DynamicIcon';

type Aba = 'categorias' | 'centros-custo' | 'fornecedores' | 'clientes' | 'formas-pagamento';

export default function Cadastros() {
  const [aba, setAba] = useState<Aba>('categorias');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [formasPgto, setFormasPgto] = useState<any[]>([]);
  const [modalFormaPgto, setModalFormaPgto] = useState(false);
  const [busca, setBusca] = useState('');
  const [modalCat, setModalCat] = useState(false);
  const [modalCC, setModalCC] = useState(false);
  const [modalForn, setModalForn] = useState(false);
  const [modalCli, setModalCli] = useState(false);

  const carregar = useCallback(async () => {
    const [cats, ccs, forns, clis, fpgtos] = await Promise.all([getCategorias(), getCentrosCusto(), getFornecedores(), getClientes(), getFormasPagamentoCustom()]);
    setCategorias(cats);
    setCentrosCusto(ccs);
    setFornecedores(forns);
    setClientes(clis);
    setFormasPgto(fpgtos);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const catsFiltradas = categorias.filter(c => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()));
  const ccsFiltrados = centrosCusto.filter(c => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()));
  const fornFiltrados = fornecedores.filter(f => !busca || f.nome.toLowerCase().includes(busca.toLowerCase()));
  const clientesFiltrados = clientes.filter(c => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()));

  const ABAS = [
    { id: 'categorias' as Aba, label: '🏷️ Categorias', count: categorias.length },
    { id: 'centros-custo' as Aba, label: '🎯 Centro de Custo', count: centrosCusto.length },
    { id: 'fornecedores' as Aba, label: '🏪 Fornecedores', count: fornecedores.length },
    { id: 'clientes' as Aba, label: '🤝 Clientes', count: clientes.length },
    { id: 'formas-pagamento' as Aba, label: '💳 Formas de Pagto', count: formasPgto.length },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Cadastros</h1>
        <button
          className="btn-primary"
          onClick={() => { if (aba === 'categorias') setModalCat(true); else if (aba === 'centros-custo') setModalCC(true); else if (aba === 'fornecedores') setModalForn(true); else if (aba === 'formas-pagamento') setModalFormaPgto(true); else setModalCli(true); }}>
          <PlusCircle size={16} />
          Novo
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => { setAba(a.id); setBusca(''); }}
            style={{
              padding: '8px 20px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: `1px solid ${aba === a.id ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
              background: aba === a.id ? 'rgba(16,185,129,0.1)' : 'var(--bg-glass)',
              color: aba === a.id ? '#10b981' : 'var(--text-muted)', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {a.label}
            <span style={{ background: aba === a.id ? 'rgba(16,185,129,0.2)' : 'var(--border)', padding: '1px 7px', borderRadius: 99, fontSize: 11 }}>
              {a.count}
            </span>
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input-field" style={{ paddingLeft: 36 }} placeholder={`Buscar ${aba}...`} value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {aba === 'categorias' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {catsFiltradas.map(cat => (
            <div key={cat.id} style={{
              background: 'var(--bg-glass)', border: `1px solid ${cat.cor}30`, borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.cor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: cat.cor }}>
                  <DynamicIcon name={cat.icone} size={18} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{cat.nome}</p>
                  <span className={`badge ${cat.tipo === 'receita' ? 'badge-green' : cat.tipo === 'despesa' ? 'badge-red' : 'badge-gray'}`} style={{ fontSize: 9 }}>
                    {cat.tipo}
                  </span>
                </div>
              </div>
              <button onClick={async () => { await deletarCategoria(cat.id); carregar(); }}
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 7, padding: '4px', cursor: 'pointer', color: '#f87171' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {aba === 'centros-custo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {ccsFiltrados.map(cc => (
            <div key={cc.id} style={{
              background: 'var(--bg-glass)', border: `1px solid ${cc.cor}30`, borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: cc.cor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: cc.cor }}>
                  <DynamicIcon name={cc.icone} size={18} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{cc.nome}</p>
                  {cc.descricao && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cc.descricao}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FORNECEDORES */}
      {aba === 'fornecedores' && (
        <>
          {fornFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Nenhum fornecedor cadastrado</p>
              <p style={{ fontSize: 13, marginBottom: 20 }}>A IA aprende os fornecedores automaticamente quando você lança despesas.</p>
              <button onClick={() => setModalForn(true)} className="btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }}>
                <PlusCircle size={16} /> Adicionar Fornecedor
              </button>
            </div>
          ) : (
            <div className="glass" style={{ overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Total Gasto</th>
                    <th>Última Compra</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fornFiltrados.map(f => (
                    <tr key={f.id}>
                      <td style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{f.nome}</td>
                      <td style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>
                        {f.totalGasto ? formatarMoeda(f.totalGasto) : '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {f.ultimaCompra ? f.ultimaCompra.split('-').reverse().join('/') : '—'}
                      </td>
                      <td>
                        <button onClick={async () => { await deletarFornecedor(f.id); carregar(); }}
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#f87171' }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* CLIENTES */}
      {aba === 'clientes' && (
        <>
          {clientesFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Nenhum cliente cadastrado</p>
              <button onClick={() => setModalCli(true)} className="btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }}>
                <PlusCircle size={16} /> Adicionar Cliente
              </button>
            </div>
          ) : (
            <div className="glass" style={{ overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Total Recebido</th>
                    <th>Última Venda</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.nome}</td>
                      <td style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                        {c.totalRecebido ? formatarMoeda(c.totalRecebido) : '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {c.ultimaVenda ? c.ultimaVenda.split('-').reverse().join('/') : '—'}
                      </td>
                      <td>
                        <button onClick={async () => { await deletarCliente(c.id); carregar(); }}
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', color: '#f87171' }}>
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modais */}
      {modalCat && <ModalNovaCategoria onClose={() => setModalCat(false)} onSalvo={() => { setModalCat(false); carregar(); }} />}
      {modalCC && <ModalNovoCentroCusto onClose={() => setModalCC(false)} onSalvo={() => { setModalCC(false); carregar(); }} />}
      {modalForn && <ModalNovoFornecedor onClose={() => setModalForn(false)} onSalvo={() => { setModalForn(false); carregar(); }} />}
      {modalCli && <ModalNovoCliente onClose={() => setModalCli(false)} onSalvo={() => { setModalCli(false); carregar(); }} />}
    </div>
  );
}

function ModalNovaCategoria({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState({ nome: '', icone: 'Package', cor: 'var(--text-muted)', tipo: 'despesa' as 'despesa' | 'receita' | 'ambos' });
  const ICONES = ['Package', 'Utensils', 'ShoppingCart', 'Fuel', 'Home', 'Pill', 'Book', 'Gamepad2', 'Shirt', 'Scissors', 'Dog', 'Smartphone', 'CreditCard', 'Shield', 'Plane', 'Gift', 'Wrench', 'Briefcase', 'Laptop', 'LineChart', 'Coins', 'Trophy'];
  const CORES = ['var(--text-muted)', '#f97316', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#84cc16', '#fb923c'];

  const salvar = async () => {
    if (!form.nome.trim()) return;
    await salvarCategoria({ id: gerarIdPublico(), ...form });
    onSalvo();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Nova Categoria</h2>
          <button onClick={onClose} style={{ background: 'var(--border)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Nome *</label>
            <input className="input-field" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Combustível" /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Tipo</label>
            <select className="input-field" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as typeof form.tipo }))}>
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
              <option value="ambos">Ambos</option>
            </select></div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Ícone</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ICONES.map(ic => (
                <button key={ic} onClick={() => setForm(f => ({ ...f, icone: ic }))}
                  style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer', border: `2px solid ${form.icone === ic ? '#10b981' : 'transparent'}`, background: form.icone === ic ? 'rgba(16,185,129,0.1)' : 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                  <DynamicIcon name={ic} size={18} /></button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Cor</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CORES.map(cor => (
                <button key={cor} onClick={() => setForm(f => ({ ...f, cor }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: cor, cursor: 'pointer', border: `3px solid ${form.cor === cor ? 'white' : 'transparent'}` }} />
              ))}
            </div>
          </div>
          <button onClick={salvar} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            <Check size={16} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalNovoCentroCusto({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState({ nome: '', icone: 'Target', cor: '#6366f1', descricao: '' });
  const ICONES = ['Target', 'User', 'Car', 'Home', 'Briefcase', 'Baby', 'Pill', 'Book', 'Drama', 'LineChart', 'Dog', 'Building2'];
  const CORES = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

  const salvar = async () => {
    if (!form.nome.trim()) return;
    await salvarCentroCusto({ id: gerarIdPublico(), ...form });
    onSalvo();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Novo Centro de Custo</h2>
          <button onClick={onClose} style={{ background: 'var(--border)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Nome *</label>
            <input className="input-field" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Veículo, Filhos..." /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Descrição</label>
            <input className="input-field" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição opcional" /></div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Ícone</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ICONES.map(ic => (
                <button key={ic} onClick={() => setForm(f => ({ ...f, icone: ic }))}
                  style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer', border: `2px solid ${form.icone === ic ? '#10b981' : 'transparent'}`, background: form.icone === ic ? 'rgba(16,185,129,0.1)' : 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                  <DynamicIcon name={ic} size={18} /></button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Cor</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {CORES.map(cor => (
                <button key={cor} onClick={() => setForm(f => ({ ...f, cor }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: cor, cursor: 'pointer', border: `3px solid ${form.cor === cor ? 'white' : 'transparent'}` }} />
              ))}
            </div>
          </div>
          <button onClick={salvar} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            <Check size={16} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalNovoFornecedor({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState({ nome: '', telefone: '', email: '' });

  const salvar = async () => {
    if (!form.nome.trim()) return;
    await salvarFornecedor({ id: gerarIdPublico(), ...form });
    onSalvo();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Novo Fornecedor</h2>
          <button onClick={onClose} style={{ background: 'var(--border)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Nome *</label>
            <input className="input-field" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Posto Shell" /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Telefone</label>
            <input className="input-field" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>E-mail</label>
            <input className="input-field" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@empresa.com" /></div>
          <button onClick={salvar} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            <Check size={16} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalNovoCliente({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState({ nome: '', telefone: '', email: '' });

  const salvar = async () => {
    if (!form.nome.trim()) return;
    await salvarCliente({ id: gerarIdPublico(), ...form });
    onSalvo();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Novo Cliente</h2>
          <button onClick={onClose} style={{ background: 'var(--border)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Nome *</label>
            <input className="input-field" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: João da Silva" /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Telefone</label>
            <input className="input-field" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>E-mail</label>
            <input className="input-field" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@cliente.com" /></div>
          <button onClick={salvar} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            <Check size={16} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

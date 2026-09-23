import { useState, useEffect } from 'react';
import { getDb } from '@/lib/firebase';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { AppUser } from '@/lib/auth';
import { Shield, CheckCircle, XCircle, Clock, Search, RefreshCw } from 'lucide-react';
import { getConfiguracoes } from '@/lib/storage';
import { ConfiguracaoApp } from '@/lib/types';

export default function AdminPanel() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [cfg, setCfg] = useState<ConfiguracaoApp | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(getDb(), 'users'));
      const snapshot = await getDocs(q);
      const data: AppUser[] = [];
      snapshot.forEach(doc => {
        data.push({ ...doc.data(), uid: doc.id } as AppUser);
      });
      // Order by createdAt descending
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUsers(data);
    } catch (error) {
      console.error("Erro ao carregar usuários", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    getConfiguracoes().then(c => setCfg(c));
  }, []);

  const handleUpdateStatus = async (uid: string, novoStatus: AppUser['status']) => {
    if (!confirm(`Tem certeza que deseja mudar o status para ${novoStatus}?`)) return;
    try {
      await updateDoc(doc(getDb(), 'users', uid), { status: novoStatus });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: novoStatus } : u));
    } catch (error) {
      console.error("Erro ao atualizar status", error);
      alert("Erro ao atualizar o status do usuário.");
    }
  };

  const handleUpdateRole = async (uid: string, novaRole: AppUser['role']) => {
    if (!confirm(`Tem certeza que deseja mudar a permissão para ${novaRole}?`)) return;
    try {
      await updateDoc(doc(getDb(), 'users', uid), { role: novaRole });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: novaRole } : u));
    } catch (error) {
      console.error("Erro ao atualizar permissão", error);
      alert("Erro ao atualizar a permissão do usuário.");
    }
  };

  const filtrados = users.filter(u => 
    u.nome.toLowerCase().includes(busca.toLowerCase()) || 
    u.email.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={28} color="#3b82f6" />
          Painel Administrativo
        </h1>
        <button onClick={loadUsers} className="btn-secondary" title="Atualizar">
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: 36 }}
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div className="glass table-responsive">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Carregando usuários...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Role</th>
                <th>Data Cadastro</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(user => (
                <tr key={user.uid}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.nome}</span>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <select 
                       value={user.role} 
                       onChange={(e) => handleUpdateRole(user.uid, e.target.value as AppUser['role'])}
                       className="input-field"
                       style={{ padding: '4px 8px', fontSize: 12, height: 'auto', minWidth: 100 }}
                    >
                       <option value="user">Usuário</option>
                       <option value="financeiro">Financeiro</option>
                       <option value="manager">Gerente</option>
                       <option value="admin">Admin</option>
                       {cfg?.cargosPersonalizados?.map(c => (
                         <option key={c.id} value={c.id}>{c.nome}</option>
                       ))}
                    </select>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    {user.status === 'aprovado' && <span className="badge badge-green"><CheckCircle size={12} style={{ marginRight: 4 }}/> Aprovado</span>}
                    {user.status === 'pendente' && <span className="badge badge-yellow"><Clock size={12} style={{ marginRight: 4 }}/> Pendente</span>}
                    {user.status === 'recusado' && <span className="badge badge-red"><XCircle size={12} style={{ marginRight: 4 }}/> Recusado</span>}
                    {user.status === 'desativado' && <span className="badge badge-gray"><XCircle size={12} style={{ marginRight: 4 }}/> Desativado</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {user.status !== 'aprovado' && (
                        <button onClick={() => handleUpdateStatus(user.uid, 'aprovado')} className="btn-primary" style={{ padding: '4px 8px', fontSize: 11 }}>
                          Aprovar
                        </button>
                      )}
                      {user.status === 'aprovado' && (
                        <button onClick={() => handleUpdateStatus(user.uid, 'desativado')} className="btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}>
                          Desativar
                        </button>
                      )}
                      {user.status === 'pendente' && (
                        <button onClick={() => handleUpdateStatus(user.uid, 'recusado')} className="btn-danger" style={{ padding: '4px 8px', fontSize: 11 }}>
                          Recusar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

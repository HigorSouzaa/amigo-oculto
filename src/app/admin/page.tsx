"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, CheckIcon, GiftIcon, Header, LinkIcon, PersonIcon, PlusIcon, RefreshIcon, SparkleIcon, TrashIcon } from "@/components/ui";

type Group = {
  id: string;
  name: string;
  status: "open" | "drawn";
  participants: Array<{ name: string; joinedAt: string }>;
  joinUrl: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [drawGroupId, setDrawGroupId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/groups");
      if (response.status === 401) { router.replace("/admin/login"); return; }
      if (!response.ok) { setError(await ApiError(response)); return; }
      const data = await response.json() as { groups: Array<{ id: string }> };
      const details = await Promise.all(data.groups.map(async item => {
        const detailResponse = await fetch(`/api/admin/groups/${item.id}`);
        if (!detailResponse.ok) throw new Error("Não foi possível carregar um dos grupos.");
        return (await detailResponse.json()).group as Group;
      }));
      setGroups(details);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o painel.");
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (!response.ok) { setError(await ApiError(response)); return; }
      setCreated(true); setShowCreate(false); setName(""); await load();
    } catch { setError("Não foi possível criar o grupo."); }
    finally { setBusy(false); }
  }

  async function draw(group: Group) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/groups/${group.id}/draw`, { method: "POST" });
      if (!response.ok) { setError(await ApiError(response)); return; }
      setDrawGroupId(null); await load();
    } catch { setError("Não foi possível realizar o sorteio."); }
    finally { setBusy(false); }
  }

  async function removeGroup(group: Group) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/groups/${group.id}`, { method: "DELETE" });
      if (!response.ok) { setError(await ApiError(response)); return; }
      setDeleteGroupId(null); await load();
    } catch { setError("Não foi possível excluir o grupo."); }
    finally { setBusy(false); }
  }

  async function copy(group: Group) {
    try {
      await navigator.clipboard.writeText(group.joinUrl);
      setCopiedGroupId(group.id); setTimeout(() => setCopiedGroupId(current => current === group.id ? null : current), 2200);
    } catch { setError("Não foi possível copiar. Selecione e copie o link manualmente."); }
  }

  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); router.replace("/admin/login"); }

  const drawTarget = groups.find(group => group.id === drawGroupId);
  const deleteTarget = groups.find(group => group.id === deleteGroupId);

  return <>
    <Header caption={<button className="secondary" onClick={logout} style={{ height: 37, padding: "0 12px" }}>Sair</button>} />
    <main className="page"><section className="panel wide">
      <div className="dashboard-topbar"><div className="top-actions">
        <div className="group-heading"><div className="heading-mark"><GiftIcon className="gift-icon" /></div><div>
          <div className="eyebrow">Painel do organizador</div><h1 className="page-title" style={{ margin: "5px 0 0" }}>Seus grupos</h1>
        </div></div>
        <div className="dashboard-actions">
          <button className="secondary action-button new-group-button" onClick={() => { setShowCreate(value => !value); setName(""); }}><PlusIcon/><span>Novo grupo</span></button>
          <button className="secondary action-button refresh-button" onClick={() => void load()} disabled={loading}><RefreshIcon/><span>Atualizar</span></button>
        </div>
      </div></div>

      {error && <p className="message" role="alert" style={{ marginTop: 18 }}>{error}</p>}
      {showCreate && <div className="subpanel create-group-panel" style={{ marginTop: 24 }}>
        <h2>{created ? "Criar outro grupo" : "Criar um grupo"}</h2><p className="subtle">Defina um nome e compartilhe o convite com quem vai participar.</p>
        <form className="form" onSubmit={create}><div className="field"><label htmlFor="group">Nome do grupo</label><input id="group" required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Amigos do bairro" /></div><button className="primary" disabled={busy}>{busy ? "Criando…" : "Criar grupo"}</button></form>
      </div>}
      {loading ? <p className="quiet" role="status" style={{ marginTop: 24 }}>Carregando painel…</p> : groups.length ? <div className="group-list">
        {groups.map(group => <article className="group-card" key={group.id}>
          <div className="group-card-heading"><div className="group-heading"><div className="heading-mark"><GiftIcon className="gift-icon" /></div><div><div className="eyebrow">Grupo</div><h2 className="group-card-title">{group.name}</h2></div></div>
            <span className={`status-pill ${group.status === "drawn" ? "status-pill-drawn" : ""}`}><span className="status-dot" aria-hidden="true" />{group.status === "drawn" ? "Sorteio concluído" : "Aguardando sorteio"}</span>
          </div>
          <div className="statbar"><div><div className="stat-label">Participantes</div><div className="stat-value">{group.participants.length} {group.participants.length === 1 ? "pessoa" : "pessoas"}</div></div><button className="secondary copy-link-button" onClick={() => void copy(group)}>{copiedGroupId === group.id ? <CheckIcon/> : <LinkIcon/>}<span>{copiedGroupId === group.id ? "Link copiado" : "Copiar link do grupo"}</span></button></div>
          <div className="dashboard-grid">
            <section className="subpanel"><h3>Participantes do grupo</h3><p className="quiet">Pessoas que entraram usando o link do grupo.</p><div className="list">{group.participants.length ? group.participants.map((participant, index) => <div className="person" key={`${participant.name}-${index}`}><span className="person-icon"><PersonIcon /></span>{participant.name}</div>) : <p className="quiet" style={{ padding: "17px 0" }}>Ainda não há participantes. Compartilhe o link para começar.</p>}</div></section>
            <section className="subpanel draw-panel"><GiftIcon className="gift-icon"/><h3>{group.status === "drawn" ? "Sorteio realizado" : "Tudo pronto para sortear?"}</h3><p className="subtle">{group.status === "drawn" ? "Compartilhe o link para cada pessoa consultar seu próprio resultado." : "Confira quem entrou e faça o sorteio quando todos estiverem aqui."}</p>{group.status === "open" && <><button className="primary full draw-button" style={{ marginTop: 17 }} disabled={group.participants.length < 2} onClick={() => setDrawGroupId(group.id)}><SparkleIcon/>Realizar sorteio</button>{group.participants.length < 2 && <p className="quiet">São necessárias pelo menos duas pessoas.</p>}<div className="hint" style={{ textAlign: "left", marginTop: 14 }}>O sorteio é definitivo. Depois, não será possível alterar o grupo ou sortear novamente.</div></>}</section>
          </div>
          <div className="group-card-footer"><span className="quiet">Grupo criado para este sorteio</span><button className="delete-group-button" onClick={() => setDeleteGroupId(group.id)}><TrashIcon/>Excluir grupo</button></div>
        </article>)}
      </div> : <div className="empty-groups"><div className="heading-mark"><GiftIcon className="gift-icon"/></div><h2>{created ? "Seu grupo está pronto" : "Ainda não há grupos"}</h2><p className="subtle">Crie um grupo para organizar seu próximo amigo secreto.</p><button className="primary" onClick={() => setShowCreate(true)}><PlusIcon/>Criar primeiro grupo</button></div>}
    </section></main>
    {drawTarget && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">Confirmar sorteio?</h2><p className="subtle">O sorteio de “{drawTarget.name}” será definitivo para {drawTarget.participants.length} participantes. Depois dele, as inscrições serão encerradas.</p><div className="modal-actions"><button className="secondary" onClick={() => setDrawGroupId(null)} disabled={busy}>Voltar</button><button className="primary" onClick={() => void draw(drawTarget)} disabled={busy}>{busy ? "Sorteando…" : "Confirmar sorteio"}</button></div></section></div>}
    {deleteTarget && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Excluir “{deleteTarget.name}”?</h2><p className="subtle">O grupo e os dados dos participantes serão removidos permanentemente. Os links desse grupo deixarão de funcionar.</p><div className="modal-actions"><button className="secondary" onClick={() => setDeleteGroupId(null)} disabled={busy}>Cancelar</button><button className="danger-button" onClick={() => void removeGroup(deleteTarget)} disabled={busy}>{busy ? "Excluindo…" : "Excluir grupo"}</button></div></section></div>}
  </>;
}

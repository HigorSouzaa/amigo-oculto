"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, CheckIcon, GiftIcon, Header, LinkIcon, PersonIcon, PlusIcon, RefreshIcon, SparkleIcon } from "@/components/ui";

type Group = {
  id: string;
  name: string;
  status: "open" | "drawn";
  participants: Array<{ name: string; joinedAt: string }>;
  joinUrl: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/groups");
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok) {
        setError(await ApiError(response));
        return;
      }
      const data = await response.json();
      if (data.groups.length) {
        const detailResponse = await fetch(`/api/admin/groups/${data.groups[0].id}`);
        const detail = await detailResponse.json();
        setGroup(detail.group);
      } else {
        setGroup(null);
      }
    } catch {
      setError("Não foi possível carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        setError(await ApiError(response));
        return;
      }
      const data = await response.json();
      setCreated(true);
      setShowCreate(false);
      await load();
      if (data.group?.id) {
        const detailResponse = await fetch(`/api/admin/groups/${data.group.id}`);
        setGroup((await detailResponse.json()).group);
      }
    } catch {
      setError("Não foi possível criar o grupo.");
    } finally {
      setBusy(false);
    }
  }

  async function draw() {
    if (!group) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/groups/${group.id}/draw`, { method: "POST" });
      if (!response.ok) {
        setError(await ApiError(response));
        return;
      }
      setConfirm(false);
      await load();
    } catch {
      setError("Não foi possível realizar o sorteio.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Não foi possível copiar. Selecione e copie o link manualmente.");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <>
      <Header caption={<button className="secondary" onClick={logout} style={{ height: 37, padding: "0 12px" }}>Sair</button>} />
      <main className="page">
        <section className="panel wide">
          <div className="dashboard-topbar">
            <div className="top-actions">
              <div className="group-heading">
              <div className="heading-mark"><GiftIcon className="gift-icon" /></div>
              <div>
                <div className="eyebrow">Painel do organizador</div>
                <h1 className="page-title" style={{ margin: "5px 0 8px" }}>{group?.name || "Seus grupos"}</h1>
                {group && <span className="status-pill"><span className="status-dot" aria-hidden="true" />{group.status === "drawn" ? "Sorteio concluído" : "Aguardando sorteio"}</span>}
              </div>
            </div>
              <div className="dashboard-actions">
                {group && <button className="secondary action-button new-group-button" onClick={() => { setShowCreate(!showCreate); setName(""); }}><PlusIcon/><span>Novo grupo</span></button>}
                <button className="secondary action-button refresh-button" onClick={() => void load()} disabled={loading}><RefreshIcon/><span>Atualizar</span></button>
              </div>
            </div>
          </div>

          {error && <p className="message" role="alert" style={{ marginTop: 18 }}>{error}</p>}
          {loading ? (
            <p className="quiet" role="status" style={{ marginTop: 24 }}>Carregando painel…</p>
          ) : showCreate || !group ? (
            <div className="subpanel" style={{ marginTop: 24 }}>
              <h2>{created ? "Seu grupo está pronto" : "Criar um grupo"}</h2>
              <p className="subtle">Defina um nome e compartilhe o convite com quem vai participar.</p>
              <form className="form" onSubmit={create}>
                <div className="field">
                  <label htmlFor="group">Nome do grupo</label>
                  <input id="group" required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Amigos do bairro" />
                </div>
                <button className="primary" disabled={busy}>{busy ? "Criando…" : "Criar grupo"}</button>
              </form>
            </div>
          ) : (
            <>
              <div className="statbar">
                <div>
                  <div className="stat-label">Participantes</div>
                  <div className="stat-value">{group.participants.length} {group.participants.length === 1 ? "pessoa" : "pessoas"}</div>
                </div>
                <button className="secondary copy-link-button" onClick={() => void copy()}>{copied ? <CheckIcon/> : <LinkIcon/>}<span>{copied ? "Link copiado" : "Copiar link do grupo"}</span></button>
              </div>
              <div className="dashboard-grid">
                <section className="subpanel">
                  <h2>Participantes do grupo</h2>
                  <p className="quiet">Pessoas que entraram usando o link do grupo.</p>
                  <div className="list">
                    {group.participants.length ? group.participants.map((participant, index) => (
                      <div className="person" key={`${participant.name}-${index}`}>
                        <span className="person-icon"><PersonIcon /></span>{participant.name}
                      </div>
                    )) : <p className="quiet" style={{ padding: "17px 0" }}>Ainda não há participantes. Compartilhe o link para começar.</p>}
                  </div>
                </section>
                <section className="subpanel draw-panel">
                  <GiftIcon className="gift-icon" />
                  <h2>{group.status === "drawn" ? "Sorteio realizado" : "Tudo pronto para sortear?"}</h2>
                  <p className="subtle">{group.status === "drawn" ? "Compartilhe o link para cada pessoa consultar seu próprio resultado." : "Confira a lista de participantes e faça o sorteio quando todos estiverem aqui."}</p>
                  {group.status === "open" && <>
                    <button className="primary full draw-button" style={{ marginTop: 17 }} disabled={group.participants.length < 2} onClick={() => setConfirm(true)}><SparkleIcon/>Realizar sorteio</button>
                    {group.participants.length < 2 && <p className="quiet">São necessárias pelo menos duas pessoas.</p>}
                    <div className="hint" style={{ textAlign: "left", marginTop: 14 }}>O sorteio é definitivo. Depois, não será possível alterar o grupo ou sortear novamente.</div>
                  </>}
                </section>
              </div>
            </>
          )}
        </section>
      </main>
      {confirm && <div className="modal-backdrop" role="presentation">
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <h2 id="confirm-title">Confirmar sorteio?</h2>
          <p className="subtle">O sorteio será definitivo para {group?.participants.length} participantes. Depois dele, as inscrições serão encerradas.</p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setConfirm(false)} disabled={busy}>Voltar</button>
            <button className="primary" onClick={() => void draw()} disabled={busy}>{busy ? "Sorteando…" : "Confirmar sorteio"}</button>
          </div>
        </section>
      </div>}
    </>
  );
}

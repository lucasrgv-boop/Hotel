import React, { useState } from "react";
import { Sun, Moon, Monitor, Cloud, HardDrive, Sparkles, Trash2, Info } from "lucide-react";
import { useApp } from "../state.jsx";
import { Button, PageHead, Segmented, Badge } from "../components/ui.jsx";

export default function Settings() {
  const { settings, updateSettings, cloud, ai, resetProgress, content, progress } = useApp();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="page narrow">
      <PageHead eyebrow="Preferências" title="Ajustes" />
      <div className="form-card">
        <div className="field">
          <span className="label-strong">Tema</span>
          <Segmented
            label="Tema"
            value={settings.theme}
            onChange={(v) => updateSettings({ theme: v })}
            options={[
              { value: "system", label: "Automático", icon: Monitor },
              { value: "light", label: "Claro", icon: Sun },
              { value: "dark", label: "Escuro", icon: Moon },
            ]}
          />
        </div>
        <div className="field">
          <label htmlFor="set-goal">Meta diária</label>
          <select id="set-goal" value={settings.goal} onChange={(e) => updateSettings({ goal: Number(e.target.value) })}>
            {[50, 100, 150, 200, 300, 500].map((g) => (
              <option key={g} value={g}>
                {g} pontos por dia
              </option>
            ))}
          </select>
          <span className="muted small">Acerto na primeira tentativa: 10 pontos · flashcard: 2 a 3 · simulado: 3 por acerto + 20.</span>
        </div>
        <div className="field">
          <label htmlFor="set-demo">Material de demonstração</label>
          <select id="set-demo" value={settings.demo} onChange={(e) => updateSettings({ demo: e.target.value })}>
            <option value="auto">Mostrar só enquanto não houver materiais</option>
            <option value="on">Sempre mostrar</option>
            <option value="off">Nunca mostrar</option>
          </select>
        </div>
      </div>

      <div className="form-card">
        <div className="status-row">
          {cloud === "cloud" ? <Cloud size={18} aria-hidden="true" /> : <HardDrive size={18} aria-hidden="true" />}
          <div>
            <strong>{cloud === "cloud" ? "Progresso salvo na sua conta" : cloud === "connecting" ? "Conectando…" : cloud === "quota" ? "Espaço da conta cheio" : "Progresso salvo neste navegador"}</strong>
            <span className="muted small">
              {cloud === "cloud"
                ? "Você continua de onde parou em qualquer aparelho em que abrir esta página no Claude."
                : cloud === "quota"
                ? "Remova materiais importados que não usa mais para liberar espaço."
                : "Nesta visualização o salvamento na conta não está disponível. O progresso fica guardado neste navegador."}
            </span>
          </div>
        </div>
        <div className="status-row">
          <Sparkles size={18} aria-hidden="true" />
          <div>
            <strong>
              Professor com IA: <Badge tone={ai === "ready" ? "good" : "neutral"}>{ai === "ready" ? "disponível" : ai === "checking" ? "verificando" : ai === "denied" ? "não permitido" : "indisponível"}</Badge>
            </strong>
            <span className="muted small">
              O professor usa o Claude da sua conta, que pede permissão na primeira pergunta. Sem ele, o app continua funcionando: o professor mostra os trechos dos materiais e a importação usa a geração automática.
            </span>
          </div>
        </div>
      </div>

      <div className="form-card">
        <div className="status-row">
          <Info size={18} aria-hidden="true" />
          <div>
            <strong>Seu conteúdo</strong>
            <span className="muted small">
              {content.materials.filter((m) => !m.demo).length} materiais · {content.topics.length} assuntos · {content.questions.length} questões · {content.flashcards.length} cartões · {progress.totals.answered} respostas registradas
            </span>
          </div>
        </div>
        {!confirm ? (
          <Button variant="bad" icon={Trash2} onClick={() => setConfirm(true)}>
            Zerar meu progresso
          </Button>
        ) : (
          <div className="confirm small">
            <span>Isso apaga pontos, sequência, conquistas, histórico de respostas e simulados. Os materiais continuam.</span>
            <div className="row-wrap tight">
              <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="bad"
                onClick={() => {
                  resetProgress();
                  setConfirm(false);
                }}
              >
                Zerar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import netlifyIdentity, { type User } from "netlify-identity-widget";
import { checklist } from "./data/checklist";
import {
  duplicateInspection,
  generateReportNumber,
  isValidVin,
  missingCritical,
  normalizeVin,
} from "./lib/inspection";
import { exportInspectionPdf } from "./lib/pdf";
import { api } from "./lib/api";
import type {
  Inspection,
  ItemResult,
  MechanicProfile,
  ResultState,
} from "./types";
const blankProfile: MechanicProfile = {
  firstName: "",
  lastName: "",
  company: "",
  email: "",
};
const blankInspection = (): Inspection => {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    reportNumber: generateReportNumber(now),
    status: "draft",
    date: now.toISOString().slice(0, 16),
    reason: "Inspection générale",
    client: { firstName: "", lastName: "" },
    vehicle: {
      make: "",
      model: "",
      year: now.getFullYear(),
      plate: "",
      province: "Québec",
      vin: "",
      mileage: 0,
      type: "Automobile",
    },
    results: {},
    recommendations: "",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
};
const stateLabels: Record<ResultState, string> = {
  ok: "Conforme",
  watch: "À surveiller",
  repair: "Réparation requise",
  unchecked: "Non vérifié",
  na: "Sans objet",
};
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span>
        {label}
        {required && <b aria-label="obligatoire"> *</b>}
      </span>
      {children}
    </label>
  );
}
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState(blankProfile);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [current, setCurrent] = useState<Inspection | null>(null);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  useEffect(() => {
    netlifyIdentity.init();
    const sync = (u: User | null) => {
      setUser(u);
      if (u?.token?.access_token)
        localStorage.setItem("nf_jwt", u.token.access_token);
      else localStorage.removeItem("nf_jwt");
    };
    netlifyIdentity.on("login", (u) => {
      sync(u);
      netlifyIdentity.close();
    });
    netlifyIdentity.on("logout", () => sync(null));
    sync(netlifyIdentity.currentUser());
    setLoading(false);
    return () => {
      netlifyIdentity.off("login");
      netlifyIdentity.off("logout");
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    Promise.all([api.profile(), api.inspections()])
      .then(([p, list]) => {
        setProfile({ ...p, email: p.email || user.email || "" });
        setInspections(list);
      })
      .catch(() => setProfile((v) => ({ ...v, email: user.email || "" })));
  }, [user]);
  const saveProfile = async () => {
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setMessage("Le prénom et le nom sont obligatoires.");
      return;
    }
    try {
      setProfile(await api.saveProfile(profile));
      setMessage("Profil enregistré.");
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const save = async (i = current) => {
    if (!i) return;
    try {
      const saved = await api.saveInspection({
        ...i,
        updatedAt: new Date().toISOString(),
      });
      setInspections((v) => [saved, ...v.filter((x) => x.id !== saved.id)]);
      setCurrent(saved);
      setMessage("Brouillon sauvegardé.");
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const finalize = async () => {
    if (!current) return;
    const required =
      !current.client.firstName ||
      !current.client.lastName ||
      !current.vehicle.make ||
      !current.vehicle.model ||
      !current.vehicle.plate ||
      !isValidVin(current.vehicle.vin) ||
      !current.vehicle.mileage ||
      !current.reason;
    if (required) {
      setMessage(
        "Complétez les informations obligatoires du client et du véhicule.",
      );
      setStep(0);
      return;
    }
    const missing = missingCritical(current.results);
    if (missing.length) {
      setMessage(
        `Éléments critiques à remplir : ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "…" : ""}`,
      );
      return;
    }
    const done = { ...current, status: "completed" as const };
    setCurrent(done);
    await save(done);
    setMessage("Inspection terminée et prête à exporter.");
  };
  const filtered = useMemo(
    () =>
      inspections.filter((i) =>
        `${i.client.firstName} ${i.client.lastName} ${i.vehicle.plate} ${i.vehicle.vin} ${i.reportNumber}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [inspections, query],
  );
  if (loading)
    return (
      <main className="center">
        <p>Chargement…</p>
      </main>
    );
  if (!user)
    return (
      <main className="landing">
        <div>
          <p className="eyebrow">INSPECTION D’ATELIER</p>
          <h1>Atelier Clair</h1>
          <p>
            Des inspections structurées, un historique fiable et des rapports
            professionnels.
          </p>
          <button onClick={() => netlifyIdentity.open("signup")}>
            Créer mon compte
          </button>
          <button
            className="secondary"
            onClick={() => netlifyIdentity.open("login")}
          >
            Me connecter
          </button>
          <p className="legal">
            Ce service produit des rapports de garage et non des certificats
            officiels de la SAAQ.
          </p>
        </div>
      </main>
    );
  if (current)
    return (
      <InspectionEditor
        inspection={current}
        setInspection={setCurrent}
        step={step}
        setStep={setStep}
        profile={profile}
        message={message}
        onBack={() => {
          setCurrent(null);
          setMessage("");
        }}
        onSave={() => save()}
        onFinalize={finalize}
      />
    );
  return (
    <main>
      <header>
        <div>
          <p className="eyebrow">TABLEAU DE BORD</p>
          <h1>Atelier Clair</h1>
        </div>
        <button className="secondary" onClick={() => netlifyIdentity.logout()}>
          Déconnexion
        </button>
      </header>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <section className="profile card">
        <h2>Mon atelier</h2>
        <div className="grid">
          <Field label="Prénom" required>
            <input
              value={profile.firstName}
              onChange={(e) =>
                setProfile({ ...profile, firstName: e.target.value })
              }
            />
          </Field>
          <Field label="Nom" required>
            <input
              value={profile.lastName}
              onChange={(e) =>
                setProfile({ ...profile, lastName: e.target.value })
              }
            />
          </Field>
          <Field label="Entreprise">
            <input
              value={profile.company || ""}
              onChange={(e) =>
                setProfile({ ...profile, company: e.target.value })
              }
            />
          </Field>
          <Field label="Email">
            <input disabled value={profile.email} />
          </Field>
        </div>
        <button onClick={saveProfile}>Enregistrer mon profil</button>
      </section>
      <section className="toolbar">
        <button
          onClick={() => {
            setCurrent(blankInspection());
            setStep(0);
          }}
        >
          + Nouvelle inspection
        </button>
        <input
          aria-label="Rechercher"
          placeholder="Client, plaque, NIV ou rapport…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>
      <section>
        <h2>Mes inspections</h2>
        <div className="cards">
          {filtered.length ? (
            filtered.map((i) => (
              <article className="card inspection-card" key={i.id}>
                <div>
                  <span className={`badge ${i.status}`}>
                    {i.status === "completed"
                      ? "Terminée"
                      : i.status === "cancelled"
                        ? "Annulée"
                        : "Brouillon"}
                  </span>
                  <h3>
                    {i.vehicle.year} {i.vehicle.make} {i.vehicle.model}
                  </h3>
                  <p>
                    {i.client.firstName} {i.client.lastName} • {i.vehicle.plate}
                  </p>
                  <small>
                    {i.reportNumber} •{" "}
                    {new Date(i.date).toLocaleDateString("fr-CA")}
                  </small>
                </div>
                <div className="actions">
                  <button
                    onClick={() => {
                      setCurrent(i);
                      setStep(0);
                    }}
                  >
                    Ouvrir
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setCurrent(duplicateInspection(i))}
                  >
                    Dupliquer
                  </button>
                  {i.status === "completed" && (
                    <button
                      className="secondary"
                      onClick={() => exportInspectionPdf(i, profile)}
                    >
                      PDF
                    </button>
                  )}
                  <button
                    className="danger"
                    onClick={async () => {
                      if (
                        confirm("Supprimer définitivement cette inspection?")
                      ) {
                        await api.deleteInspection(i.id);
                        setInspections((v) => v.filter((x) => x.id !== i.id));
                      }
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty">Aucune inspection trouvée.</div>
          )}
        </div>
      </section>
    </main>
  );
}
function InspectionEditor({
  inspection,
  setInspection,
  step,
  setStep,
  profile,
  message,
  onBack,
  onSave,
  onFinalize,
}: {
  inspection: Inspection;
  setInspection: (i: Inspection) => void;
  step: number;
  setStep: (n: number) => void;
  profile: MechanicProfile;
  message: string;
  onBack: () => void;
  onSave: () => void;
  onFinalize: () => void;
}) {
  const total = checklist.length + 2;
  const patch = (p: Partial<Inspection>) =>
    setInspection({ ...inspection, ...p });
  const updateResult = (id: string, p: Partial<ItemResult>) => {
    const existing = inspection.results[id] ?? {
      itemId: id,
      state: "unchecked" as const,
    };
    setInspection({
      ...inspection,
      results: { ...inspection.results, [id]: { ...existing, ...p } },
    });
  };
  return (
    <main>
      <header className="sticky">
        <button className="secondary" onClick={onBack}>
          ← Tableau de bord
        </button>
        <div>
          <small>{inspection.reportNumber}</small>
          <h1>Inspection</h1>
        </div>
        <button onClick={onSave}>Sauvegarder</button>
      </header>
      <div className="progress">
        <span style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <nav className="steps" aria-label="Sections">
        <button
          className={step === 0 ? "active" : ""}
          onClick={() => setStep(0)}
        >
          Client et véhicule
        </button>
        {checklist.map((s, i) => (
          <button
            key={s.id}
            className={step === i + 1 ? "active" : ""}
            onClick={() => setStep(i + 1)}
          >
            {s.title}
          </button>
        ))}
        <button
          className={step === total - 1 ? "active" : ""}
          onClick={() => setStep(total - 1)}
        >
          Résumé
        </button>
      </nav>
      {step === 0 ? (
        <section className="card form-section">
          <h2>Client et véhicule</h2>
          <div className="grid">
            <Field label="Prénom du client" required>
              <input
                value={inspection.client.firstName}
                onChange={(e) =>
                  patch({
                    client: { ...inspection.client, firstName: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Nom du client" required>
              <input
                value={inspection.client.lastName}
                onChange={(e) =>
                  patch({
                    client: { ...inspection.client, lastName: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Téléphone">
              <input
                type="tel"
                value={inspection.client.phone || ""}
                onChange={(e) =>
                  patch({
                    client: { ...inspection.client, phone: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={inspection.client.email || ""}
                onChange={(e) =>
                  patch({
                    client: { ...inspection.client, email: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Marque" required>
              <input
                value={inspection.vehicle.make}
                onChange={(e) =>
                  patch({
                    vehicle: { ...inspection.vehicle, make: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Modèle" required>
              <input
                value={inspection.vehicle.model}
                onChange={(e) =>
                  patch({
                    vehicle: { ...inspection.vehicle, model: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Année" required>
              <input
                type="number"
                min="1900"
                max="2100"
                value={inspection.vehicle.year}
                onChange={(e) =>
                  patch({
                    vehicle: { ...inspection.vehicle, year: +e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Plaque" required>
              <input
                value={inspection.vehicle.plate}
                onChange={(e) =>
                  patch({
                    vehicle: {
                      ...inspection.vehicle,
                      plate: e.target.value.toUpperCase(),
                    },
                  })
                }
              />
            </Field>
            <Field label="NIV / VIN (17 caractères)" required>
              <input
                maxLength={17}
                className={
                  inspection.vehicle.vin && !isValidVin(inspection.vehicle.vin)
                    ? "invalid"
                    : ""
                }
                value={inspection.vehicle.vin}
                onChange={(e) =>
                  patch({
                    vehicle: {
                      ...inspection.vehicle,
                      vin: normalizeVin(e.target.value),
                    },
                  })
                }
              />
            </Field>
            <Field label="Kilométrage" required>
              <input
                type="number"
                min="0"
                value={inspection.vehicle.mileage || ""}
                onChange={(e) =>
                  patch({
                    vehicle: {
                      ...inspection.vehicle,
                      mileage: +e.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="Type">
              <select
                value={inspection.vehicle.type}
                onChange={(e) =>
                  patch({
                    vehicle: { ...inspection.vehicle, type: e.target.value },
                  })
                }
              >
                <option>Automobile</option>
                <option>Camion léger</option>
                <option>VUS</option>
                <option>Fourgonnette</option>
              </select>
            </Field>
            <Field label="Date et heure" required>
              <input
                type="datetime-local"
                value={inspection.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Motif de l’inspection" required>
            <textarea
              value={inspection.reason}
              onChange={(e) => patch({ reason: e.target.value })}
            />
          </Field>
        </section>
      ) : step <= checklist.length ? (
        <section className="form-section">
          <h2>{checklist[step - 1].title}</h2>
          {checklist[step - 1].items.map((item) => {
            const r = inspection.results[item.id];
            return (
              <article className="check-row" key={item.id}>
                <div>
                  <h3>
                    {item.label}
                    {item.critical && <b title="Obligatoire"> *</b>}
                  </h3>
                  <div className="status-group">
                    {(Object.keys(stateLabels) as ResultState[]).map((s) => (
                      <button
                        key={s}
                        className={r?.state === s ? `selected ${s}` : ""}
                        onClick={() => updateResult(item.id, { state: s })}
                      >
                        {stateLabels[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid compact">
                  {item.measurement && (
                    <Field label={`Mesure (${item.measurement})`}>
                      <input
                        inputMode="decimal"
                        value={r?.measurement || ""}
                        onChange={(e) =>
                          updateResult(item.id, { measurement: e.target.value })
                        }
                      />
                    </Field>
                  )}
                  <Field label="Remarque">
                    <input
                      value={r?.note || ""}
                      onChange={(e) =>
                        updateResult(item.id, { note: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="card form-section">
          <h2>Résumé et recommandations</h2>
          <p>
            <strong>
              {
                Object.values(inspection.results).filter(
                  (r) => r.state === "repair",
                ).length
              }
            </strong>{" "}
            réparation(s) requise(s) •{" "}
            <strong>
              {
                Object.values(inspection.results).filter(
                  (r) => r.state === "watch",
                ).length
              }
            </strong>{" "}
            élément(s) à surveiller
          </p>
          <Field label="Recommandations">
            <textarea
              rows={8}
              value={inspection.recommendations}
              onChange={(e) => patch({ recommendations: e.target.value })}
            />
          </Field>
          <div className="grid">
            <Field label="Prochaine visite">
              <input
                type="date"
                value={inspection.nextVisitDate || ""}
                onChange={(e) => patch({ nextVisitDate: e.target.value })}
              />
            </Field>
            <Field label="Prochain kilométrage">
              <input
                type="number"
                value={inspection.nextVisitMileage || ""}
                onChange={(e) => patch({ nextVisitMileage: +e.target.value })}
              />
            </Field>
          </div>
          <button onClick={onFinalize}>Terminer l’inspection</button>
          {inspection.status === "completed" && (
            <button
              className="secondary"
              onClick={() => exportInspectionPdf(inspection, profile)}
            >
              Télécharger le PDF
            </button>
          )}
          <p className="legal">
            Ce rapport d’inspection ne constitue pas un certificat officiel de
            vérification mécanique de la SAAQ.
          </p>
        </section>
      )}
      <footer className="wizard-actions">
        <button
          className="secondary"
          disabled={step === 0}
          onClick={() => setStep(Math.max(0, step - 1))}
        >
          Précédent
        </button>
        <span>
          Étape {step + 1} sur {total}
        </span>
        <button
          disabled={step === total - 1}
          onClick={() => setStep(Math.min(total - 1, step + 1))}
        >
          Suivant
        </button>
      </footer>
    </main>
  );
}
export default App;

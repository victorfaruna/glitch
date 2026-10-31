"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bug,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  FileText,
  FlaskConical,
  Play,
  ShieldCheck,
} from "lucide-react";
import { findingReport } from "@/lib/glitch/workspace-state";
import { money } from "@/lib/glitch/demo-store";
import type { Session } from "@/lib/glitch/types";
import { elapsedTime } from "@/lib/utils/format-time";
import "@/components/shared/shared.css";
import "./findings.css";

export function FindingsPanel({
  session,
  selectedId,
  onSelect,
  openReplay,
  startDemo,
}: {
  session: Session;
  selectedId: string | null;
  onSelect(id: string): void;
  openReplay(stepId: string): void;
  startDemo(): void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "fallback">(
    "idle",
  );
  const reportRef = useRef<HTMLTextAreaElement>(null);
  const finding =
    session.findings.find((f) => f.id === selectedId) ?? session.findings[0];
  useEffect(() => {
    if (copyState === "copied") {
      const timer = setTimeout(() => setCopyState("idle"), 2200);
      return () => clearTimeout(timer);
    }
    if (copyState === "fallback") {
      reportRef.current?.focus();
      reportRef.current?.select();
    }
  }, [copyState]);

  async function copyReport() {
    if (!finding) return;
    try {
      await navigator.clipboard.writeText(findingReport(session, finding.id));
      setCopyState("copied");
    } catch {
      setCopyState("fallback");
    }
  }

  if (!finding)
    return (
      <section
        className="workspace-empty-state"
        role="tabpanel"
        id="panel-findings"
        aria-label="Findings"
      >
        <div className="empty-state-symbol">
          <ShieldCheck size={28} />
          <span>0</span>
        </div>
        <span className="eyebrow">EVIDENCE OVER GUESSWORK</span>
        <h2>Nothing to report. Yet.</h2>
        <p>
          Run the checkout demo to watch Glitch reproduce an issue and turn it
          into a finding you can inspect.
        </p>
        <button
          className="btn btn-sm"
          disabled={
            session.status === "running" ||
            session.status === "paused" ||
            session.status === "manual"
          }
          onClick={startDemo}
        >
          <Play size={13} />
          Run checkout demo
          <ArrowRight size={13} />
        </button>
        {["running", "paused", "manual"].includes(session.status) && (
          <span className="empty-state-note">
            Your test is in progress. Use the Browser tab to continue.
          </span>
        )}
        <div className="empty-state-note">
          <FlaskConical size={13} />
          Findings in this workspace use synthetic demo evidence.
        </div>
      </section>
    );

  return (
    <section
      className="findings-panel"
      role="tabpanel"
      id="panel-findings"
      aria-label="Findings"
    >
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">TEST RESULTS</span>
          <h2>
            Findings <span>{session.findings.length}</span>
          </h2>
          <p>Reproduced issues. Context you can act on.</p>
        </div>
        <span className="badge badge-sm badge-ghost">
          <FlaskConical size={11} />
          Demo data
        </span>
      </div>
      <div className="findings-layout">
        <div className="findings-list">
          {session.findings.map((item) => (
            <button
              type="button"
              className={`finding-list-card ${item.id === finding.id ? "finding-selected" : ""}`}
              key={item.id}
              onClick={() => {
                onSelect(item.id);
                setCopyState("idle");
              }}
              aria-pressed={item.id === finding.id}
            >
              <div>
                <span className="severity-badge">{item.severity}</span>
                <span className="finding-identifier">
                  GL-
                  {String(session.findings.indexOf(item) + 1).padStart(3, "0")}
                </span>
              </div>
              <h3>{item.title}</h3>
              <span className="finding-confirmed">
                <CheckCircle2 size={12} />
                Confirmed in demo
                <ChevronRight size={13} />
              </span>
            </button>
          ))}
          <p className="findings-list-note">
            <Bug size={13} />
            One reproducible bug is more useful than a dozen guesses.
          </p>
        </div>
        <article className="finding-detail">
          <div className="finding-detail-meta">
            <span className="severity-badge">{finding.severity} severity</span>
            <span className="finding-confirmed">
              <CheckCircle2 size={12} />
              Confirmed
            </span>
          </div>
          <h2>{finding.title}</h2>
          <p className="finding-explanation">{finding.explanation}</p>
          <div className="finding-detail-actions">
            <button className="btn btn-sm" onClick={copyReport}>
              {copyState === "copied" ? (
                <Check size={13} />
              ) : (
                <Copy size={13} />
              )}
              {copyState === "copied" ? "Copied report" : "Copy report"}
            </button>
            <button
              className="btn btn-sm"
              onClick={() => openReplay(finding.replayStepId)}
            >
              <Play size={12} />
              Open replay
              <ArrowRight size={13} />
            </button>
            <span className="copy-announcement" role="status">
              {copyState === "copied" ? "Report copied to clipboard." : ""}
            </span>
          </div>
          {copyState === "fallback" && (
            <div className="copy-fallback">
              <label htmlFor="finding-report">
                Clipboard access is unavailable. Select and copy this report:
              </label>
              <textarea
                ref={reportRef}
                id="finding-report"
                className="textarea"
                readOnly
                value={findingReport(session, finding.id)}
                rows={6}
              />
            </div>
          )}
          <div className="expected-actual">
            <div>
              <h3>
                <CheckCircle2 size={13} />
                Expected
              </h3>
              <p>{finding.expected}</p>
            </div>
            <div>
              <h3>
                <Bug size={13} />
                Observed
              </h3>
              <p>{finding.actual}</p>
            </div>
          </div>
          <section className="finding-section">
            <h3>
              <FileText size={14} />
              Steps to reproduce
            </h3>
            <ol className="reproduction-steps">
              {finding.steps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </section>
          <section className="finding-section">
            <div className="evidence-title">
              <h3>
                <FlaskConical size={14} />
                Supporting evidence
              </h3>
              <span>SYNTHETIC DATA</span>
            </div>
            <div className="evidence-table-wrap">
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Attempt</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {finding.evidence.map((order) => (
                    <tr key={`${order.attempt}-${order.id}`}>
                      <td>{order.id}</td>
                      <td>
                        <span>0{order.attempt}</span>
                      </td>
                      <td>{money(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="evidence-customer">
                Customer: <code>{finding.evidence[0]?.email}</code>
              </div>
            </div>
            <p className="evidence-disclaimer">
              Sample order records generated inside Demo Store. No payments or
              external requests were made.
            </p>
          </section>
          <section className="finding-section related-actions">
            <h3>
              <Clock3 size={14} />
              Related actions
            </h3>
            {session.actions
              .filter((action) => finding.relatedActionIds.includes(action.id))
              .map((action) => (
                <button key={action.id} onClick={() => openReplay(action.id)}>
                  <time>
                    {elapsedTime(
                      action.timestamp,
                      session.actions[0].timestamp,
                    )}
                  </time>
                  <span>{action.label}</span>
                  <Play size={12} />
                </button>
              ))}
          </section>
        </article>
      </div>
    </section>
  );
}

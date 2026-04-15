"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function readStoredList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredList(key: string, list: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(list));
}

function mergeOrderedOptions(preset: string[], extras: string[], current?: string | null) {
  const set = new Set<string>([...preset, ...extras, ...(current ? [current] : [])].filter(Boolean));
  const out: string[] = [];
  for (const p of preset) {
    if (set.has(p)) {
      out.push(p);
      set.delete(p);
    }
  }
  const tail = Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return [...out, ...tail];
}

export function CreatableSelect({
  label,
  value,
  onChange,
  presetOptions,
  storageKey,
  allowEmpty,
  emptyLabel,
  addPlaceholder = "Ketik opsi baru…",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  presetOptions: string[];
  storageKey: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  addPlaceholder?: string;
}) {
  const [extras, setExtras] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [addHint, setAddHint] = useState("");

  useEffect(() => {
    setExtras(readStoredList(storageKey));
  }, [storageKey]);

  const options = useMemo(
    () => mergeOrderedOptions(presetOptions, extras, value || undefined),
    [presetOptions, extras, value]
  );

  const addOption = useCallback(() => {
    const t = newOption.trim();
    if (!t) {
      setAddHint("Isi nama opsi terlebih dahulu.");
      return;
    }
    const presetMatch = presetOptions.find((x) => x.toLowerCase() === t.toLowerCase());
    if (presetMatch) {
      onChange(presetMatch);
      setNewOption("");
      setAddHint("");
      return;
    }
    const existing = [...presetOptions, ...extras].find((x) => x.toLowerCase() === t.toLowerCase());
    if (existing) {
      setAddHint("Opsi ini sudah ada di daftar.");
      onChange(existing);
      setNewOption("");
      return;
    }
    const next = [...extras, t];
    setExtras(next);
    writeStoredList(storageKey, next);
    onChange(t);
    setNewOption("");
    setAddHint("");
  }, [newOption, presetOptions, extras, storageKey, onChange]);

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">{label}</label>
      <select
        className="form-select"
        value={value}
        onChange={(e) => {
          setAddHint("");
          onChange(e.target.value);
        }}
      >
        {allowEmpty && <option value="">{emptyLabel ?? "—"}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "stretch" }}>
        <input
          className="form-input"
          style={{ flex: 1, marginBottom: 0 }}
          value={newOption}
          onChange={(e) => {
            setNewOption(e.target.value);
            setAddHint("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addOption();
            }
          }}
          placeholder={addPlaceholder}
        />
        <button type="button" className="btn" style={{ flexShrink: 0 }} onClick={addOption}>
          Tambah opsi
        </button>
      </div>
      {addHint ? (
        <div style={{ fontSize: 11, color: "var(--yellow)", marginTop: 6 }}>{addHint}</div>
      ) : null}
    </div>
  );
}

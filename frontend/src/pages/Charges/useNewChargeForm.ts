import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '@/lib/api';
import type { BuildingOpt, ViewMonth } from './types';

type Options = {
  y: number;
  viewMonth: ViewMonth;
  buildings: BuildingOpt[];
  onCreated: () => void;
};

/** État et soumission du formulaire « Nouvelle charge ». */
export function useNewChargeForm({ y, viewMonth, buildings, onCreated }: Options) {
  const [buildingId, setBuildingId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [category, setCategory] = useState<string>('FEES');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [periodMonth, setPeriodMonth] = useState('');
  const [notes, setNotes] = useState('');
  const [paidOnCreate, setPaidOnCreate] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (viewMonth !== 'all') setPeriodMonth(String(viewMonth));
    else setPeriodMonth('');
  }, [viewMonth]);

  const units = buildings.find((b) => b.id === buildingId)?.units ?? [];

  function selectBuilding(id: string) {
    setBuildingId(id);
    setUnitId('');
  }

  function reset() {
    setBuildingId('');
    setUnitId('');
    setCategory('FEES');
    setLabel('');
    setAmount('');
    setNotes('');
    setPaidOnCreate(false);
    setErr(null);
    setPeriodMonth(viewMonth === 'all' ? '' : String(viewMonth));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api('/charges', {
        method: 'POST',
        json: {
          buildingId,
          unitId: unitId || undefined,
          category,
          label,
          amount: Number(amount),
          periodYear: y,
          periodMonth: periodMonth ? Number(periodMonth) : undefined,
          notes: notes.trim() || undefined,
          paid: paidOnCreate,
        },
      });
      setLabel('');
      setAmount('');
      setNotes('');
      setPaidOnCreate(false);
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  return {
    units,
    buildingId,
    selectBuilding,
    unitId,
    setUnitId,
    category,
    setCategory,
    label,
    setLabel,
    amount,
    setAmount,
    periodMonth,
    setPeriodMonth,
    notes,
    setNotes,
    paidOnCreate,
    setPaidOnCreate,
    err,
    reset,
    submit,
  };
}

export type NewChargeForm = ReturnType<typeof useNewChargeForm>;

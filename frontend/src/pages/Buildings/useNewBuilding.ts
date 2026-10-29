import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { COMMUNE_SUGGESTIONS, IVORY_COAST_CITIES } from '@/lib/ciLocation';
import type { BuildingStructureValue } from '@/lib/buildingStructure';
import { isSafeInternalReturnPath, navigateAfterCreate } from '@/lib/navigation';

export type StructureAnswers = {
  structureKind: BuildingStructureValue;
  floorCountImmeuble?: string;
  apartmentsPerFloorImmeuble?: string;
  includeRezDeChaussee?: boolean;
  rezApartmentImmeuble?: string;
  terrainLotCountNew?: string;
};

/** Formulaire « Nouveau bien » : champs, validation, création (`POST /buildings`) et retour éventuel vers une location. */
export function useNewBuilding({ load }: { load: () => void }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnLocationParam = searchParams.get('returnLocation')?.trim() ?? '';
  const returnAfterBuildingCreateRef = useRef<string | null>(null);

  const [name, setName] = useState('');
  const [cityChoice, setCityChoice] = useState<string>(IVORY_COAST_CITIES[0]);
  const [cityOther, setCityOther] = useState('');
  const [communeChoice, setCommuneChoice] = useState<string>(COMMUNE_SUGGESTIONS[0]);
  const [communeOther, setCommuneOther] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [structureKind, setStructureKind] = useState<BuildingStructureValue>('MONO_LOT');
  const [floorCountImmeuble, setFloorCountImmeuble] = useState('');
  const [includeRezDeChaussee, setIncludeRezDeChaussee] = useState(true);
  const [apartmentsPerFloorImmeuble, setApartmentsPerFloorImmeuble] = useState('');
  const [rezApartmentImmeuble, setRezApartmentImmeuble] = useState('');
  const [terrainLotCountNew, setTerrainLotCountNew] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [structureSettingsOpen, setStructureSettingsOpen] = useState(false);
  const addFormRef = useRef<HTMLDivElement | null>(null);

  function openAddForm() {
    setAddFormOpen(true);
    window.requestAnimationFrame(() => {
      addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function resetNewBuildingForm() {
    setName('');
    setCityChoice(IVORY_COAST_CITIES[0]);
    setCityOther('');
    setCommuneChoice(COMMUNE_SUGGESTIONS[0]);
    setCommuneOther('');
    setAddress('');
    setPostalCode('');
    setStructureKind('MONO_LOT');
    setFloorCountImmeuble('');
    setIncludeRezDeChaussee(true);
    setApartmentsPerFloorImmeuble('');
    setRezApartmentImmeuble('');
    setTerrainLotCountNew('');
    setStructureSettingsOpen(false);
    setErr(null);
  }

  /** Préremplit genre + champs structure depuis le guide (mêmes valeurs qu’une saisie manuelle). */
  function applyStructureAnswers(answers: StructureAnswers) {
    setStructureKind(answers.structureKind);
    setStructureSettingsOpen(true);
    setFloorCountImmeuble(answers.floorCountImmeuble ?? '');
    setApartmentsPerFloorImmeuble(answers.apartmentsPerFloorImmeuble ?? '');
    setIncludeRezDeChaussee(answers.includeRezDeChaussee ?? true);
    setRezApartmentImmeuble(answers.rezApartmentImmeuble ?? '');
    setTerrainLotCountNew(answers.terrainLotCountNew ?? '');
    setErr(null);
  }

  function cancelNewBuilding() {
    resetNewBuildingForm();
    setAddFormOpen(false);
    returnAfterBuildingCreateRef.current = null;
    if (searchParams.get('returnLocation')) {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete('returnLocation');
          return p;
        },
        { replace: true },
      );
    }
    if (window.location.hash === '#nouveau-bien') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  useEffect(() => {
    if (returnLocationParam && isSafeInternalReturnPath(returnLocationParam)) {
      returnAfterBuildingCreateRef.current = returnLocationParam;
    } else {
      returnAfterBuildingCreateRef.current = null;
    }
  }, [returnLocationParam]);

  useEffect(() => {
    if (window.location.hash === '#nouveau-bien') {
      setAddFormOpen(true);
    }
  }, []);

  function resolvedCity() {
    return cityChoice === 'Autre' ? cityOther.trim() : cityChoice;
  }

  function resolvedCommune() {
    return communeChoice === 'Autre' ? communeOther.trim() : communeChoice;
  }

  async function createBuilding() {
    setErr(null);
    if (!name.trim()) {
      setErr('Indiquez le nom du bien.');
      return;
    }
    const city = resolvedCity();
    const commune = resolvedCommune();
    if (!city || !commune) {
      setErr('Indiquez une ville et une commune / zone.');
      return;
    }
    if (structureKind === 'IMMEUBLE') {
      const fc = floorCountImmeuble.trim() === '' ? NaN : Number(floorCountImmeuble);
      const pf = apartmentsPerFloorImmeuble.trim() === '' ? NaN : Number(apartmentsPerFloorImmeuble);
      if (!Number.isInteger(fc) || fc < 1 || !Number.isInteger(pf) || pf < 1) {
        setErr(
          'Pour un immeuble, indiquez au moins un étage au-dessus du RDC et au moins un logement par étage (nombres entiers).',
        );
        return;
      }
      if (includeRezDeChaussee && rezApartmentImmeuble.trim() !== '') {
        const rz = Number(rezApartmentImmeuble);
        if (!Number.isInteger(rz) || rz < 0) {
          setErr('Le nombre d’unités au rez-de-chaussée doit être un entier positif ou zéro.');
          return;
        }
      }
    }
    try {
      await api('/buildings', {
        method: 'POST',
        json: {
          name: name.trim(),
          city,
          commune,
          address: address.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          structureKind,
          ...(structureKind === 'IMMEUBLE'
            ? {
                floorCount: Number(floorCountImmeuble),
                hasRezDeChaussee: includeRezDeChaussee,
                apartmentsPerFloor: Number(apartmentsPerFloorImmeuble),
                rezApartmentCount: includeRezDeChaussee
                  ? rezApartmentImmeuble.trim() === ''
                    ? undefined
                    : Number(rezApartmentImmeuble)
                  : undefined,
              }
            : {}),
          ...(structureKind === 'TERRAIN_LOTS'
            ? {
                terrainLotCount: terrainLotCountNew.trim() === '' ? undefined : Number(terrainLotCountNew),
              }
            : {}),
        },
      });
      const back = returnAfterBuildingCreateRef.current;
      returnAfterBuildingCreateRef.current = null;
      resetNewBuildingForm();
      setAddFormOpen(false);
      if (back) {
        navigateAfterCreate(navigate, back);
      } else {
        load();
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await createBuilding();
  }

  const immeubleCreateTotalPreview = useMemo(() => {
    const fc = floorCountImmeuble.trim() === '' ? NaN : Number(floorCountImmeuble);
    const pf = apartmentsPerFloorImmeuble.trim() === '' ? NaN : Number(apartmentsPerFloorImmeuble);
    if (!Number.isInteger(fc) || fc < 1 || !Number.isInteger(pf) || pf < 1) return null;
    const rz =
      includeRezDeChaussee && rezApartmentImmeuble.trim() !== ''
        ? Math.max(0, Math.floor(Number(rezApartmentImmeuble)))
        : 0;
    return fc * pf + (includeRezDeChaussee ? rz : 0);
  }, [floorCountImmeuble, apartmentsPerFloorImmeuble, includeRezDeChaussee, rezApartmentImmeuble]);

  return {
    name,
    setName,
    cityChoice,
    setCityChoice,
    cityOther,
    setCityOther,
    communeChoice,
    setCommuneChoice,
    communeOther,
    setCommuneOther,
    address,
    setAddress,
    postalCode,
    setPostalCode,
    structureKind,
    setStructureKind,
    floorCountImmeuble,
    setFloorCountImmeuble,
    includeRezDeChaussee,
    setIncludeRezDeChaussee,
    apartmentsPerFloorImmeuble,
    setApartmentsPerFloorImmeuble,
    rezApartmentImmeuble,
    setRezApartmentImmeuble,
    terrainLotCountNew,
    setTerrainLotCountNew,
    err,
    addFormOpen,
    setAddFormOpen,
    structureSettingsOpen,
    setStructureSettingsOpen,
    applyStructureAnswers,
    addFormRef,
    openAddForm,
    cancelNewBuilding,
    create,
    createBuilding,
    immeubleCreateTotalPreview,
  };
}

export type NewBuilding = ReturnType<typeof useNewBuilding>;

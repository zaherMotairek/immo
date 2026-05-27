/** Repère visuel ImmoPilot (liseré + nom) — pages d’authentification. */
export function AuthBrandMark() {
  return (
    <div className="mb-5 text-center sm:mb-6">
      <div className="mx-auto mb-3 flex justify-center">
        <span className="h-1 w-14 rounded-full bg-gradient-to-r from-zinc-500 to-black" aria-hidden />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">ImmoPilot</p>
    </div>
  );
}

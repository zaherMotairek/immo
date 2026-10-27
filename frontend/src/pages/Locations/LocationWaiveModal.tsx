import { Button, Callout, Field, Modal, Textarea } from '@/components/ui/index';
import type { LocationFicheModel } from './useLocationFiche';

type LocationWaiveModalProps = {
  waive: LocationFicheModel['waive'];
};

/** Modale « Gratuité de loyer » (motif obligatoire). */
export function LocationWaiveModal({ waive }: LocationWaiveModalProps) {
  return (
    <Modal
      open={Boolean(waive.waiveTargetId)}
      onClose={waive.closeWaive}
      title="Gratuité de loyer"
      closeOnBackdrop={false}
      footer={
        <>
          <Button type="button" variant="secondary" disabled={waive.waiveBusy} onClick={waive.closeWaive}>
            Annuler
          </Button>
          <Button type="button" disabled={waive.waiveBusy} onClick={() => void waive.submitWaiveRent()}>
            {waive.waiveBusy ? 'Enregistrement…' : 'Confirmer la gratuité'}
          </Button>
        </>
      }
    >
      <p className="text-sm font-medium text-[var(--color-muted)]">
        Le montant théorique du mois est conservé pour l’audit. Aucun encaissement n’est enregistré. Cette action est
        traçable via le motif ci-dessous.
      </p>
      <Field label="Motif (obligatoire)" htmlFor="waive-reason" className="mt-4" required>
        <Textarea
          id="waive-reason"
          rows={4}
          value={waive.waiveReason}
          onChange={(e) => waive.setWaiveReason(e.target.value)}
          placeholder="Ex. : arrangement travaux, geste commercial convenu avec le locataire…"
          data-autofocus
        />
      </Field>
      {waive.waiveErr ? (
        <Callout variant="danger" className="mt-2">
          {waive.waiveErr}
        </Callout>
      ) : null}
    </Modal>
  );
}

/** Fait défiler uniquement le conteneur — sans scrollIntoView (évite le défilement de la page). */
export function scrollIntoContainedView(container: HTMLElement, el: HTMLElement, pad = 6) {
  const ulRect = container.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  if (elRect.top < ulRect.top + pad) {
    container.scrollTop += elRect.top - ulRect.top - pad;
  } else if (elRect.bottom > ulRect.bottom - pad) {
    container.scrollTop += elRect.bottom - ulRect.bottom + pad;
  }
}

const TOAST_MS = 1_500
const toasts = new WeakMap<HTMLElement, (text: string) => void>()

/** A brief note in the corner of the wall, e.g. after pressing a preview key. One per element, shared. */
export function createToast(element: HTMLElement): (text: string) => void {
  const existing = toasts.get(element)
  if (existing) {
    return existing
  }
  let timer: number | undefined
  const show = (text: string): void => {
    element.textContent = text
    element.style.opacity = '1'
    window.clearTimeout(timer)
    timer = window.setTimeout(() => (element.style.opacity = '0'), TOAST_MS)
  }
  toasts.set(element, show)
  return show
}

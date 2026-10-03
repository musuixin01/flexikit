declare module 'sortablejs' {
  export interface SortableEvent {
    item: HTMLElement
    target: HTMLElement
    oldIndex?: number
    newIndex?: number
  }

  export interface SortableOptions {
    animation?: number
    handle?: string
    draggable?: string
    ghostClass?: string
    chosenClass?: string
    dragClass?: string
    filter?: string | ((event: Event) => boolean)
    forceFallback?: boolean
    fallbackOnBody?: boolean
    fallbackTolerance?: number
    swapThreshold?: number
    onStart?: (event: SortableEvent) => void
    onEnd?: (event: SortableEvent) => void
  }

  export default class Sortable {
    constructor(element: HTMLElement, options?: SortableOptions)
    static create(element: HTMLElement, options?: SortableOptions): Sortable
    destroy(): void
  }
}

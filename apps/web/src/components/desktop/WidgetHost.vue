<template>
  <article
    class="widget-host"
    :class="{
      'is-editing': editing,
      'is-locked': widget.locked,
      'is-selected': selected,
      'is-grouped': Boolean(widget.groupId),
      'is-moving': interactionMode === 'move',
      'is-resizing': interactionMode === 'resize',
      'tone-dark': widget.appearance.tone === 'dark',
      'tone-light': widget.appearance.tone === 'light',
    }"
    :style="hostStyle"
    @pointerdown="activate"
  >
    <header v-if="editing" class="widget-edit-bar" @pointerdown.stop="startMove">
      <span class="drag-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span v-if="widget.groupId" class="group-badge">组</span>
      <strong>{{ widget.title }}</strong>
      <span class="edit-actions">
        <button type="button" title="组件设置" @pointerdown.stop @click.stop="emit('open-settings', widget.id)">⚙</button>
        <button type="button" :title="widget.locked ? '解锁' : '锁定'" @pointerdown.stop @click.stop="canvas.toggleLock(widget.id)">{{ widget.locked ? '◉' : '○' }}</button>
        <button v-if="widget.type !== 'desktop-organizer'" type="button" title="删除组件" @pointerdown.stop @click.stop="canvas.removeWidget(widget.id)">×</button>
      </span>
    </header>

    <div class="widget-body">
      <component :is="definition?.component" v-if="definition" :widget="widget" />
      <div v-else class="unknown-widget">
        <strong>{{ widget.title }}</strong>
        <span>未注册组件 · {{ widget.type }}</span>
      </div>
    </div>

    <template v-if="editing && !widget.locked">
      <span class="resize-zone resize-n" @pointerdown.stop="startResize($event, 'n')"></span>
      <span class="resize-zone resize-e" @pointerdown.stop="startResize($event, 'e')"></span>
      <span class="resize-zone resize-s" @pointerdown.stop="startResize($event, 's')"></span>
      <span class="resize-zone resize-w" @pointerdown.stop="startResize($event, 'w')"></span>
      <span class="resize-zone resize-ne" @pointerdown.stop="startResize($event, 'ne')"></span>
      <span class="resize-zone resize-se" @pointerdown.stop="startResize($event, 'se')"></span>
      <span class="resize-zone resize-sw" @pointerdown.stop="startResize($event, 'sw')"></span>
      <span class="resize-zone resize-nw" @pointerdown.stop="startResize($event, 'nw')"></span>
    </template>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { CSSProperties } from 'vue'
import type { DesktopWidget } from '@/types/desktopWidget'
import { getWidgetDefinition } from '@/desktop/widgetRegistry'
import { CANVAS_GRID_SIZE, useDesktopCanvasStore } from '@/stores/desktopCanvas'

const props = defineProps<{
  widget: DesktopWidget
  editing: boolean
}>()

const emit = defineEmits<{
  'open-settings': [widgetId: string]
}>()

const canvas = useDesktopCanvasStore()
const definition = computed(() => getWidgetDefinition(props.widget.type))
const selected = computed(() => canvas.isSelected(props.widget.id))

const hostStyle = computed<CSSProperties>(() => ({
  left: `${props.widget.frame.x}px`,
  top: `${props.widget.frame.y}px`,
  width: `${props.widget.frame.width}px`,
  height: `${props.widget.frame.height}px`,
  zIndex: props.widget.frame.zIndex,
  opacity: props.widget.appearance.opacity,
  borderRadius: `${props.widget.appearance.borderRadius}px`,
  '--widget-blur': `${props.widget.appearance.blur}px`,
  '--widget-surface-opacity': `${Math.round(props.widget.appearance.surfaceOpacity * 100)}%`,
  '--widget-border-strength': `${Math.round(props.widget.appearance.borderStrength * 100)}%`,
  '--widget-shadow-alpha': props.widget.appearance.shadowStrength,
} as CSSProperties))

interface MoveTarget {
  id: string
  x: number
  y: number
}

type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

interface ResizeFrame {
  x: number
  y: number
  width: number
  height: number
}

interface InteractionState {
  mode: 'move' | 'resize'
  startX: number
  startY: number
  targets: MoveTarget[]
  frame: ResizeFrame
  direction: ResizeDirection | null
  pointerId: number
  captureElement: HTMLElement
}

let interaction: InteractionState | null = null
const interactionMode = ref<InteractionState['mode'] | null>(null)

function setPointerInteractionActive(active: boolean): void {
  document.documentElement.classList.toggle('canvas-pointer-active', active)
}

function activate(event: PointerEvent): void {
  canvas.bringToFront(props.widget.id)
  if (!props.editing) return
  if (props.widget.locked || event.button !== 0) {
    canvas.selectWidget(props.widget.id, event.shiftKey)
    return
  }
  startMove(event)
}

function startMove(event: PointerEvent): void {
  if (!props.editing || props.widget.locked) return
  beginInteraction('move', event)
}

function startResize(event: PointerEvent, direction: ResizeDirection): void {
  if (!props.editing || props.widget.locked) return
  beginInteraction('resize', event, direction)
}

function beginInteraction(
  mode: InteractionState['mode'],
  event: PointerEvent,
  direction: ResizeDirection | null = null,
): void {
  if (event.button !== 0) return
  canvas.bringToFront(props.widget.id)
  if (!canvas.isSelected(props.widget.id)) canvas.selectWidget(props.widget.id, event.shiftKey)

  const captureElement = event.currentTarget as HTMLElement
  captureElement.setPointerCapture?.(event.pointerId)

  const targetIds = mode === 'move' ? canvas.getMoveTargetIds(props.widget.id) : [props.widget.id]
  const targets: MoveTarget[] = targetIds.flatMap(id => {
    const target = canvas.widgets.find(widget => widget.id === id)
    return target ? [{ id: target.id, x: target.frame.x, y: target.frame.y }] : []
  })

  interaction = {
    mode,
    startX: event.clientX,
    startY: event.clientY,
    targets,
    frame: {
      x: props.widget.frame.x,
      y: props.widget.frame.y,
      width: props.widget.frame.width,
      height: props.widget.frame.height,
    },
    direction,
    pointerId: event.pointerId,
    captureElement,
  }
  interactionMode.value = mode
  setPointerInteractionActive(true)
  event.preventDefault()
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', endInteraction, { once: true })
  window.addEventListener('pointercancel', endInteraction, { once: true })
  window.addEventListener('blur', endInteraction, { once: true })
}

function onPointerMove(event: PointerEvent): void {
  if (!interaction) return
  const dx = event.clientX - interaction.startX
  const dy = event.clientY - interaction.startY

  if (interaction.mode === 'move') {
    for (const target of interaction.targets) {
      canvas.updateFrame(target.id, {
        x: Math.round((target.x + dx) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
        y: Math.round((target.y + dy) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE,
      })
    }
    return
  }

  const direction = interaction.direction
  if (!direction) return

  const minimum = CANVAS_GRID_SIZE * 4
  const original = interaction.frame
  const right = original.x + original.width
  const bottom = original.y + original.height
  let x = original.x
  let y = original.y
  let width = original.width
  let height = original.height

  if (direction.includes('e')) {
    width = Math.max(minimum, Math.round((original.width + dx) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE)
  }
  if (direction.includes('s')) {
    height = Math.max(minimum, Math.round((original.height + dy) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE)
  }
  if (direction.includes('w')) {
    const nextX = Math.round((original.x + dx) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE
    x = Math.min(nextX, right - minimum)
    width = right - x
  }
  if (direction.includes('n')) {
    const nextY = Math.round((original.y + dy) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE
    y = Math.min(nextY, bottom - minimum)
    height = bottom - y
  }

  canvas.updateFrame(props.widget.id, { x, y, width, height })
}

function endInteraction(): void {
  if (!interaction) return
  const current = interaction
  for (const target of current.targets) canvas.snapWidgetFrame(target.id)
  if (current.mode === 'resize') canvas.snapWidgetFrame(props.widget.id)
  if (current.captureElement.hasPointerCapture?.(current.pointerId)) {
    current.captureElement.releasePointerCapture(current.pointerId)
  }
  interaction = null
  interactionMode.value = null
  setPointerInteractionActive(false)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointercancel', endInteraction)
  window.removeEventListener('blur', endInteraction)
}

onBeforeUnmount(() => {
  if (interaction) setPointerInteractionActive(false)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', endInteraction)
  window.removeEventListener('pointercancel', endInteraction)
  window.removeEventListener('blur', endInteraction)
})
</script>

<style scoped>
.widget-host{--widget-base:var(--glass-bg);--widget-edge:var(--text-primary);position:absolute;overflow:hidden;background:linear-gradient(145deg,rgb(255 255 255 / 16%),transparent 48%),color-mix(in srgb,var(--widget-base) var(--widget-surface-opacity),transparent);backdrop-filter:blur(var(--widget-blur)) saturate(150%);-webkit-backdrop-filter:blur(var(--widget-blur)) saturate(150%);border:1px solid color-mix(in srgb,var(--widget-edge) var(--widget-border-strength),transparent);box-shadow:0 12px 38px rgb(0 0 0 / var(--widget-shadow-alpha)),inset 0 1px 0 rgb(255 255 255 / 22%),inset 0 0 0 1px rgb(255 255 255 / 4%);transition:left .3s cubic-bezier(.25,.1,.25,1),top .3s cubic-bezier(.25,.1,.25,1),width .3s cubic-bezier(.25,.1,.25,1),height .3s cubic-bezier(.25,.1,.25,1),border-color .3s cubic-bezier(.25,.1,.25,1),box-shadow .3s cubic-bezier(.25,.1,.25,1),background .3s cubic-bezier(.25,.1,.25,1),backdrop-filter .3s cubic-bezier(.25,.1,.25,1),transform .3s cubic-bezier(.25,.1,.25,1)}
:global(html.canvas-pointer-active) .widget-host{transition:none!important}
.widget-host:not(.is-editing):hover{box-shadow:0 16px 44px rgb(0 0 0 / 10%),inset 0 1px 0 rgb(255 255 255 / 26%),inset 0 0 0 1px rgb(255 255 255 / 5%)}
.widget-host.is-editing{border-color:color-mix(in srgb,var(--primary) 25%,var(--glass-border));box-shadow:0 10px 34px rgb(0 0 0 / 8%),0 0 0 1px color-mix(in srgb,var(--primary) 9%,transparent),inset 0 1px 0 rgb(255 255 255 / 30%);cursor:move;touch-action:none}
.widget-host.is-selected{border-color:color-mix(in srgb,var(--primary) 72%,var(--glass-border));box-shadow:0 12px 36px rgb(0 0 0 / 10%),0 0 0 2px color-mix(in srgb,var(--primary) 34%,transparent),inset 0 1px 0 rgb(255 255 255 / 30%)}
.widget-host.is-moving,.widget-host.is-resizing{will-change:left,top,width,height;box-shadow:0 18px 46px rgb(0 0 0 / 14%),0 0 0 2px color-mix(in srgb,var(--primary) 30%,transparent),inset 0 1px 0 rgb(255 255 255 / 32%)}
.widget-host.is-moving{transform:scale(1.008)}
.widget-host.is-grouped.is-editing:not(.is-selected){box-shadow:0 10px 34px rgb(0 0 0 / 8%),0 0 0 1px color-mix(in srgb,var(--primary) 22%,transparent),inset 0 1px 0 rgb(255 255 255 / 30%)}
.widget-host.is-locked{border-style:dashed}
.widget-host.tone-dark{--widget-base:rgb(12 17 25);--widget-edge:white;--glass-bg:rgba(12,17,25,.86);--glass-border:rgba(255,255,255,.1);--text-primary:#f4f6f8;--text-secondary:rgba(238,242,246,.76);--text-tertiary:rgba(224,230,236,.5);--btn-bg:rgba(255,255,255,.055);--btn-bg-hover:rgba(255,255,255,.1);--input-bg:rgba(255,255,255,.055);--icon-surface:rgba(255,255,255,.07)}
.widget-host.tone-light{--widget-base:rgb(248 249 251);--widget-edge:black;--glass-bg:rgba(248,249,251,.9);--glass-border:rgba(0,0,0,.08);--text-primary:#171a1f;--text-secondary:rgba(23,26,31,.72);--text-tertiary:rgba(23,26,31,.48);--btn-bg:rgba(0,0,0,.045);--btn-bg-hover:rgba(0,0,0,.08);--input-bg:rgba(255,255,255,.72);--icon-surface:rgba(0,0,0,.05)}
.widget-edit-bar{position:absolute;z-index:5;top:0;left:0;right:0;height:32px;display:flex;align-items:center;gap:8px;padding:0 7px 0 10px;background:color-mix(in srgb,var(--glass-bg) 86%,transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--glass-border);cursor:grab;user-select:none;animation:widget-edit-bar-in .3s cubic-bezier(.25,.1,.25,1) both}
.widget-edit-bar:active{cursor:grabbing}
.widget-edit-bar strong{min-width:0;flex:1;font-size:.65rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.drag-dots{display:flex;gap:2px}
.drag-dots i{width:3px;height:3px;border-radius:50%;background:var(--text-tertiary)}
.group-badge{height:18px;display:grid;place-items:center;padding:0 5px;border-radius:6px;background:color-mix(in srgb,var(--primary) 10%,var(--btn-bg));color:var(--primary);font-size:.52rem;font-weight:700}
.edit-actions{display:flex;gap:3px}
.edit-actions button{width:23px;height:23px;border:0;border-radius:7px;background:transparent;color:var(--text-tertiary);cursor:pointer;transition:all .3s cubic-bezier(.25,.1,.25,1)}
.edit-actions button:hover{background:var(--btn-bg-hover);color:var(--text-primary);transform:scale(1.02)}
.edit-actions button:active{transform:scale(.98)}
.widget-body{width:100%;height:100%}
.is-editing .widget-body{padding-top:32px;pointer-events:none}
.resize-zone{position:absolute;z-index:7;display:block;background:transparent;touch-action:none;user-select:none}
.resize-n,.resize-s{left:10px;right:10px;height:8px}
.resize-n{top:0;cursor:ns-resize}
.resize-s{bottom:0;cursor:ns-resize}
.resize-e,.resize-w{top:10px;bottom:10px;width:8px}
.resize-e{right:0;cursor:ew-resize}
.resize-w{left:0;cursor:ew-resize}
.resize-ne,.resize-se,.resize-sw,.resize-nw{width:14px;height:14px}
.resize-ne{top:0;right:0;cursor:nesw-resize}
.resize-se{right:0;bottom:0;cursor:nwse-resize}
.resize-sw{left:0;bottom:0;cursor:nesw-resize}
.resize-nw{top:0;left:0;cursor:nwse-resize}
.unknown-widget{height:100%;display:grid;place-content:center;gap:5px;text-align:center;color:var(--text-secondary)}
.unknown-widget span{font-size:.68rem;color:var(--text-tertiary)}
@keyframes widget-edit-bar-in{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.widget-host,.widget-edit-bar,.edit-actions button{animation:none!important;transition:none!important}.widget-host:not(.is-editing):hover,.widget-host.is-moving{transform:none}}
[data-theme="dark"] .widget-host:not(.tone-light):not(.tone-dark){--widget-base:rgb(12 17 25);--widget-edge:white}
</style>

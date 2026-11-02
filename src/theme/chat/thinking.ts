/**
 * Bars fill with the level and deepen in the agent's violet as the model thinks harder, ending in
 * the theme's pink, so both themes keep the order whatever the accent.
 */
export default {
  slots: {
    meter:
      'inline-flex h-3 shrink-0 items-end gap-px text-muted data-[level=high]:text-agent data-[level=low]:text-agent/70 data-[level=medium]:text-agent/85 data-[level=minimal]:text-agent/55 data-[level=xhigh]:text-slot',
    bar: 'w-[3px] rounded-[1px] bg-current data-[filled=false]:bg-muted/30',
    trigger: 'flex shrink-0 items-center',
    /** Narrow composers show only the meter, leaving the width to the model name. */
    label: 'hidden truncate @[16rem]:inline',
    option: 'ml-auto pl-3'
  }
} as const

<script setup lang="ts">
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from 'reka-ui'
import { tv } from 'tailwind-variants'
import IconChevronRight from '~icons/lucide/chevron-right'

import type { MenuEntry } from '@pairdraw/vue/editor/menu-model'
import { vTestId } from '@pairdraw/vue/testing'

import { useAppMenu } from '@/app/shell/menu/app-menu'
import {
  hasMenuSubItems,
  isMenuCheckbox,
  isMenuSeparator,
  menuChecked,
  menuDisabled,
  menuLabel,
  menuShortcut,
  menuSubItems,
  runMenuAction,
  updateMenuChecked
} from '@/app/shell/menu/entry'
import { resolvedAppTheme } from '@/app/shell/theme'
import BrandMark from '@/components/brand/BrandMark.vue'
import AppShortcutText from '@/components/ui/menu/AppShortcutText.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'
import { APP_NAME } from '@/constants'
import topBarTheme from '@/theme/top-bar'

/**
 * The brand at the start of the top bar, which opens the app menus: File, Edit, View, Object,
 * Text, and Arrange, each a submenu. The browser's only menus; the desktop app has native ones.
 */
const { topMenus } = useAppMenu()
const ui = tv(topBarTheme)({ interactive: true })
const menuCls = useMenuUI()
const mainMenuCls = useMenuUI({ content: 'min-w-44' })
const subMenuCls = useMenuUI({ content: 'min-w-52' })
const nestedMenuCls = useMenuUI({ content: 'min-w-44' })

/**
 * Set by an action item. Focus then stays where the action put it, such as on the icon picker it
 * opened, instead of returning to the brand, which would dismiss a popover it opened.
 */
let ranAction = false

function run(item: MenuEntry) {
  ranAction = true
  runMenuAction(item)
}

function onCloseAutoFocus(event: Event) {
  if (ranAction) event.preventDefault()
  ranAction = false
}
</script>

<template>
  <DropdownMenuRoot :modal="false">
    <DropdownMenuTrigger data-test-id="app-main-menu" :class="ui.brand()">
      <BrandMark
        data-test-id="app-logo"
        variant="app-icon"
        :appearance="resolvedAppTheme"
        :class="ui.brandMark()"
      />
      <span aria-hidden="true" :class="ui.brandName()">{{ APP_NAME }}</span>
      <icon-lucide-chevron-down :class="ui.brandChevron()" />
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        :side-offset="4"
        align="start"
        :class="mainMenuCls.content"
        @close-auto-focus="onCloseAutoFocus"
      >
        <DropdownMenuSub v-for="menu in topMenus" :key="menu.label">
          <DropdownMenuSubTrigger
            v-test-id="`menubar-${menu.label.toLowerCase()}`"
            :class="menuCls.subTrigger"
          >
            <span class="flex-1">{{ menu.label }}</span>
            <IconChevronRight :class="menuCls.icon" />
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent :side-offset="4" :class="subMenuCls.content">
              <MenuScrollArea>
                <template v-for="(item, i) in menu.items" :key="i">
                  <DropdownMenuSeparator v-if="isMenuSeparator(item)" :class="menuCls.separator" />
                  <DropdownMenuSub v-else-if="hasMenuSubItems(item)">
                    <DropdownMenuSubTrigger :class="menuCls.item" :disabled="menuDisabled(item)">
                      <span class="flex-1">{{ menuLabel(item) }}</span>
                      <IconChevronRight :class="menuCls.icon" />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent :side-offset="4" :class="nestedMenuCls.content">
                        <MenuScrollArea>
                          <template v-for="(sub, j) in menuSubItems(item)" :key="j">
                            <DropdownMenuSeparator
                              v-if="isMenuSeparator(sub)"
                              :class="menuCls.separator"
                            />
                            <DropdownMenuCheckboxItem
                              v-else-if="isMenuCheckbox(sub)"
                              :model-value="menuChecked(sub)"
                              :class="menuCls.item"
                              @update:model-value="updateMenuChecked(sub, $event as boolean)"
                            >
                              <span class="flex-1">{{ menuLabel(sub) }}</span>
                              <DropdownMenuItemIndicator class="text-surface">
                                <icon-lucide-check class="size-3.5" />
                              </DropdownMenuItemIndicator>
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuItem
                              v-else
                              :class="menuCls.item"
                              :disabled="menuDisabled(sub)"
                              @select="run(sub)"
                            >
                              <span class="flex-1">{{ menuLabel(sub) }}</span>
                              <AppShortcutText v-if="menuShortcut(sub)">{{
                                menuShortcut(sub)
                              }}</AppShortcutText>
                            </DropdownMenuItem>
                          </template>
                        </MenuScrollArea>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuCheckboxItem
                    v-else-if="isMenuCheckbox(item)"
                    :model-value="menuChecked(item)"
                    :class="menuCls.item"
                    @update:model-value="updateMenuChecked(item, $event as boolean)"
                  >
                    <span class="flex-1">{{ menuLabel(item) }}</span>
                    <DropdownMenuItemIndicator class="text-surface">
                      <icon-lucide-check class="size-3.5" />
                    </DropdownMenuItemIndicator>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuItem
                    v-else
                    :class="menuCls.item"
                    :disabled="menuDisabled(item)"
                    @select="run(item)"
                  >
                    <span class="flex-1">{{ menuLabel(item) }}</span>
                    <AppShortcutText v-if="menuShortcut(item)">{{
                      menuShortcut(item)
                    }}</AppShortcutText>
                  </DropdownMenuItem>
                </template>
              </MenuScrollArea>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

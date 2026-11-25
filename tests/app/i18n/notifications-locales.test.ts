import { expect, test } from 'bun:test'

import { notificationMessageDefaults } from '@/app/i18n/notifications'
import de from '@/app/i18n/notifications/locales/de.json'
import es from '@/app/i18n/notifications/locales/es.json'
import fr from '@/app/i18n/notifications/locales/fr.json'
import id from '@/app/i18n/notifications/locales/id.json'
import it from '@/app/i18n/notifications/locales/it.json'
import ja from '@/app/i18n/notifications/locales/ja.json'
import pl from '@/app/i18n/notifications/locales/pl.json'
import ru from '@/app/i18n/notifications/locales/ru.json'
import zhCn from '@/app/i18n/notifications/locales/zh-cn.json'

const locales = { de, es, fr, id, it, ja, pl, ru, 'zh-cn': zhCn }
const keys = Object.keys(notificationMessageDefaults).sort()

test('every notification locale has exactly the keys the defaults have', () => {
  for (const [locale, messages] of Object.entries(locales)) {
    expect({ locale, keys: Object.keys(messages).sort() }).toEqual({ locale, keys })
  }
})

test('every translated notification says something', () => {
  for (const [locale, messages] of Object.entries(locales)) {
    const empty = Object.entries(messages)
      .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
      .map(([key]) => key)
    expect({ locale, empty }).toEqual({ locale, empty: [] })
  }
})

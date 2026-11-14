import { defineComponent, type PropType } from 'vue'

import { transactionalEmailLayout } from './layout'

export type EnrollmentEmailProps = {
  heading: string
  preview: string
  message: string
  actionLabel: string
  actionURL: string
  /** Small print under the button. */
  footer?: string
  /** The sending server's public address, for the logo and footer link. */
  site?: string
}

export const EnrollmentEmail = defineComponent({
  props: {
    heading: { type: String, required: true },
    preview: { type: String, required: true },
    message: { type: String, required: true },
    actionLabel: { type: String, required: true },
    actionURL: { type: String, required: true },
    footer: { type: String, required: false },
    site: { type: String, required: false }
  } satisfies Record<keyof EnrollmentEmailProps, { type: PropType<string>; required: boolean }>,
  setup(props) {
    return () => transactionalEmailLayout(props)
  }
})

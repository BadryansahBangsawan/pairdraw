import { render } from '@vue-email/render'
import { compact } from 'es-toolkit'

import type {
  AdminEnrollmentNotificationPayload,
  AuthenticationEmailPayload,
  DocumentInvitationEmailPayload,
  EmailChangeRequestedPayload,
  EnrollmentEmailPayload,
  NewSignInPayload,
  RenderedTransactionalEmail,
  TransactionalEmailContent,
  TransactionalEmailKind,
  TwoStepChange,
  TwoStepChangedPayload,
  WorkspaceInvitationEmailPayload
} from './schema'
import { DocumentInvitationEmail } from './templates/document-invitation'
import { EnrollmentEmail } from './templates/enrollment'

/** An email's template, its props, and its subject, before rendering. */
type EmailDraft = {
  component: Parameters<typeof render>[0]
  props: Record<string, string | undefined>
  subject: string
}

function toDraft(
  component: EmailDraft['component'],
  props: EmailDraft['props'],
  subject: string
): EmailDraft {
  return { component, props, subject }
}

const DOCUMENT_PERMISSION_LABELS = {
  edit: 'edit',
  comment: 'view and comment on',
  view: 'view'
} as const

function draftDocumentInvitation(payload: DocumentInvitationEmailPayload) {
  const permissionLabel = DOCUMENT_PERMISSION_LABELS[payload.permission]
  return toDraft(
    DocumentInvitationEmail,
    {
      inviterName: payload.inviterName,
      documentName: payload.documentName,
      permissionLabel,
      expiresAt: new Date(payload.expiresAt).toUTCString(),
      acceptanceURL: payload.acceptanceURL
    },
    `${payload.inviterName} invited you to ${permissionLabel} ${payload.documentName}`
  )
}

const WORKSPACE_ROLE_LABELS = { admin: 'manage', editor: 'edit in', viewer: 'view' } as const

function draftWorkspaceInvitation(payload: WorkspaceInvitationEmailPayload) {
  const action = WORKSPACE_ROLE_LABELS[payload.role]
  return toDraft(
    EnrollmentEmail,
    {
      heading: `Join ${payload.workspaceName}`,
      preview: `${payload.inviterName} invited you to ${payload.workspaceName}`,
      message: `${payload.inviterName} invited you to ${action} the workspace “${payload.workspaceName}” on Pairdraw Cloud. You will see its documents on Home once you join.`,
      actionLabel: 'Join workspace',
      actionURL: payload.acceptanceURL,
      footer: `This invitation expires ${new Date(payload.expiresAt).toUTCString()}.`
    },
    `${payload.inviterName} invited you to ${payload.workspaceName}`
  )
}

type EnrollmentMessageKind = Exclude<
  TransactionalEmailKind,
  | 'document-invitation'
  | 'workspace-invitation'
  | 'admin-enrollment-notification'
  | 'email-verification'
  | 'password-reset'
  | 'password-changed'
  | 'email-change-requested'
  | 'new-sign-in'
  | 'two-step-changed'
>

type EnrollmentCopy = {
  subject: string
  heading: string
  preview: string
  message: string
  actionLabel: string
}

const ENROLLMENT_COPY: Record<EnrollmentMessageKind, Omit<EnrollmentCopy, 'message'>> = {
  'enrollment-requested': {
    subject: 'We received your Pairdraw Cloud request',
    heading: 'Request received',
    preview: 'Your Pairdraw Cloud access request is awaiting review.',
    actionLabel: 'Open Pairdraw Cloud'
  },
  'enrollment-approved': {
    subject: 'Your Pairdraw Cloud access is ready',
    heading: 'Access approved',
    preview: 'You can now sign in to Pairdraw Cloud.',
    actionLabel: 'Sign in'
  },
  'enrollment-rejected': {
    subject: 'Your Pairdraw Cloud request was reviewed',
    heading: 'Request reviewed',
    preview: 'Your current access request was not approved.',
    actionLabel: 'Request access again'
  },
  'enrollment-revoked': {
    subject: 'Your Pairdraw Cloud access has changed',
    heading: 'Access changed',
    preview: 'Your Pairdraw Cloud access is no longer active.',
    actionLabel: 'Open Pairdraw'
  }
}

function enrollmentCopy(kind: EnrollmentMessageKind, name: string): EnrollmentCopy {
  const copy = ENROLLMENT_COPY[kind]
  const messages: Record<EnrollmentMessageKind, string> = {
    'enrollment-requested': `Hi ${name}, your request is awaiting manual review.`,
    'enrollment-approved': `Hi ${name}, your access request was approved.`,
    'enrollment-rejected': `Hi ${name}, your current access request was not approved.`,
    'enrollment-revoked': `Hi ${name}, your Cloud access is no longer active.`
  }
  return { ...copy, message: messages[kind] }
}

function draftEnrollment(kind: EnrollmentMessageKind, payload: EnrollmentEmailPayload) {
  const copy = enrollmentCopy(kind, payload.name)
  return toDraft(EnrollmentEmail, { ...copy, actionURL: payload.actionURL }, copy.subject)
}

function draftAdminNotification(payload: AdminEnrollmentNotificationPayload) {
  return toDraft(
    EnrollmentEmail,
    {
      heading: 'New Cloud access request',
      preview: `${payload.requesterEmail} requested Pairdraw Cloud access.`,
      message: `${payload.requesterName} (${payload.requesterEmail}) requested access. ${payload.reason}`,
      actionLabel: 'Review request',
      actionURL: payload.actionURL
    },
    'New Pairdraw Cloud access request'
  )
}

function draftAuthentication(
  kind: 'email-verification' | 'password-reset' | 'password-changed',
  payload: AuthenticationEmailPayload
) {
  const copy = {
    'email-verification':
      payload.purpose === 'change'
        ? {
            subject: 'Confirm your new Pairdraw Cloud email',
            heading: 'Confirm your new email',
            preview: 'One click to move your Pairdraw Cloud account to this address.',
            message: `Hi ${payload.name}, confirm this address to make it your Pairdraw Cloud account’s email. Your old address stays until you do.`,
            actionLabel: 'Confirm email',
            footer: 'Didn’t ask for this? Ignore this email and nothing changes.'
          }
        : {
            subject: 'Confirm your Pairdraw Cloud email',
            heading: 'Confirm your email',
            preview: 'One click to finish creating your Pairdraw Cloud account.',
            message: `Hi ${payload.name}, confirm this address to finish creating your Pairdraw Cloud account. Then go back to Pairdraw; it signs you in by itself.`,
            actionLabel: 'Confirm email',
            footer: 'Didn’t create an account? Ignore this email and nothing happens.'
          },
    'password-reset': {
      subject: 'Reset your Pairdraw Cloud password',
      heading: 'Reset your password',
      preview: 'Use this secure link to choose a new password.',
      message: `Hi ${payload.name}, use the link below to choose a new password.`,
      actionLabel: 'Reset password',
      footer: 'Didn’t ask for this? Ignore this email and your password stays the same.'
    },
    'password-changed': {
      subject: 'Your Pairdraw Cloud password changed',
      heading: 'Password changed',
      preview: 'Your Pairdraw Cloud password was changed.',
      message: `Hi ${payload.name}, your password was changed. If this was not you, contact your administrator.`,
      actionLabel: 'Open Pairdraw Cloud'
    }
  }[kind]
  return toDraft(EnrollmentEmail, { ...copy, actionURL: payload.actionURL ?? '#' }, copy.subject)
}

function draftEmailChangeRequested(payload: EmailChangeRequestedPayload) {
  return toDraft(
    EnrollmentEmail,
    {
      heading: 'Your email is changing',
      preview: `Your Pairdraw Cloud email is changing to ${payload.newEmail}.`,
      message: `Hi ${payload.name}, someone signed in to your account asked to change its email to ${payload.newEmail}. It changes once that address confirms it. If this wasn’t you, change your password and sign out of your other sessions.`,
      actionLabel: 'Review your account',
      actionURL: payload.actionURL
    },
    'Your Pairdraw Cloud email is changing'
  )
}

function draftNewSignIn(payload: NewSignInPayload) {
  const device = payload.desktop
    ? 'the Pairdraw app'
    : compact([payload.browser, payload.system]).join(' on ') || 'an unknown browser'
  const place = payload.ipAddress ? ` from ${payload.ipAddress}` : ''
  return toDraft(
    EnrollmentEmail,
    {
      heading: 'New sign-in to your account',
      preview: `Your Pairdraw Cloud account was signed in to with ${device}.`,
      message: `Hi ${payload.name}, your account was signed in to with ${device}${place} on ${new Date(payload.signedInAt).toUTCString()}. If this was you, there’s nothing to do. If it wasn’t, sign that session out and change your password.`,
      actionLabel: 'Review sessions',
      actionURL: payload.actionURL
    },
    'New sign-in to your Pairdraw Cloud account'
  )
}

const TWO_STEP_COPY: Record<TwoStepChange, { heading: string; message: string }> = {
  'authenticator-on': {
    heading: 'Authenticator app turned on',
    message: 'an authenticator app now confirms your sign-ins.'
  },
  'authenticator-off': {
    heading: 'Authenticator app turned off',
    message: 'your sign-ins no longer ask for a code from an authenticator app.'
  },
  'passkey-added': {
    heading: 'Passkey added',
    message: 'a passkey was added to your account.'
  },
  'passkey-removed': {
    heading: 'Passkey removed',
    message: 'a passkey was removed from your account.'
  },
  'reset-by-administrator': {
    heading: 'Two-step sign-in was reset',
    message:
      'an administrator removed your authenticator app, recovery codes, and passkeys, so you can set them up again.'
  }
}

function draftTwoStepChanged(payload: TwoStepChangedPayload) {
  const copy = TWO_STEP_COPY[payload.change]
  return toDraft(
    EnrollmentEmail,
    {
      heading: copy.heading,
      preview: `${copy.heading} on your Pairdraw Cloud account.`,
      message: `Hi ${payload.name}, ${copy.message} If this wasn’t you, change your password and contact your administrator.`,
      actionLabel: 'Review security',
      actionURL: payload.actionURL
    },
    `${copy.heading} on your Pairdraw Cloud account`
  )
}

function draft(content: TransactionalEmailContent): EmailDraft {
  if (content.kind === 'document-invitation') return draftDocumentInvitation(content.payload)
  if (content.kind === 'workspace-invitation') return draftWorkspaceInvitation(content.payload)
  if (content.kind === 'admin-enrollment-notification') {
    return draftAdminNotification(content.payload)
  }
  if (
    content.kind === 'email-verification' ||
    content.kind === 'password-reset' ||
    content.kind === 'password-changed'
  ) {
    return draftAuthentication(content.kind, content.payload)
  }
  if (content.kind === 'email-change-requested') return draftEmailChangeRequested(content.payload)
  if (content.kind === 'new-sign-in') return draftNewSignIn(content.payload)
  if (content.kind === 'two-step-changed') return draftTwoStepChanged(content.payload)
  return draftEnrollment(content.kind, content.payload)
}

export type TransactionalEmailOptions = {
  /**
   * The sending server's public address: its site serves the logo, and the footer links to it.
   * Without it the email carries neither.
   */
  site?: string
}

export async function renderTransactionalEmail(
  content: TransactionalEmailContent,
  options: TransactionalEmailOptions = {}
): Promise<RenderedTransactionalEmail> {
  const { component, props, subject } = draft(content)
  const withSite = { ...props, site: options.site }
  const [html, text] = await Promise.all([
    render(component, withSite),
    render(component, withSite, { plainText: true })
  ])
  return { subject, html, text }
}

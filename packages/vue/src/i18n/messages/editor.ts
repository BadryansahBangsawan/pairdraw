import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const editorMessageDefaults = {
  toolOptions: params('{tool} options'),
  removeGradientStop: 'Remove gradient stop',
  /** The word before a corner's radius in the label beside a dragged radius handle. */
  cornerRadius: 'Radius',
  /** The word before a polygon's or star's point count beside its dragged handle. */
  pointCount: 'Count',
  /** The word before a star's inner ratio beside its dragged handle. */
  starRatio: 'Ratio',
  /** The word before an ellipse arc's start angle beside its dragged handle. */
  arcStart: 'Start',
  /** The word before an ellipse arc's sweep, in percent of a turn, beside its dragged end handle. */
  arcSweep: 'Sweep',
  /** The word before an ellipse arc's inner ratio beside its dragged handle. */
  arcRatio: 'Ratio',
  /** What an empty sticky note shows in its body on the canvas. */
  stickyPlaceholder: 'Type anything, @mention anyone',
  /** What an empty connector label shows on the canvas while it is typed into. */
  connectorLabelPlaceholder: 'Add text',
  showUI: params('Show UI ({shortcut})'),
  previewing: 'Previewing',
  startPreview: params('Preview ({shortcut})'),
  /** Opens and closes the AI chat's column beside the properties panel. */
  toggleAIChat: params('AI chat ({shortcut})'),
  toggleLayersPanel: 'Layers panel',
  togglePropertiesPanel: 'Properties panel',
  /** Goodies: styles, design systems, scripts and shaders to start from. */
  goodies: 'Goodies',
  goodiesDescription: 'Styles, design systems, scripts and shaders to start from.',
  goodiesFeatured: 'Featured',
  goodiesStyles: 'Styles',
  goodiesDesignSystems: 'Design systems',
  goodiesScripts: 'Scripts',
  goodiesShaders: 'Shaders',
  goodiesUseStyle: 'Use in chat',
  goodiesStylesHint: 'A style is pinned to the AI chat, which follows it in that conversation.',
  goodiesInsertScript: 'Insert',
  goodiesScriptsHint: 'A script is placed on the canvas as a code layer you can edit.',
  goodiesShadersHint:
    'A shader fills the selected layers, or a new rectangle when nothing is selected.',
  goodiesDesignSystemsHint: 'An enabled design system offers its components in the Assets panel.',
  goodiesScriptStatCard: 'Stat card',
  goodiesScriptStatCardHint: 'A label, a figure, and a trend bar.',
  goodiesScriptBarChart: 'Bar chart',
  goodiesScriptBarChartHint: 'Bars sized from a list of numbers.',
  goodiesScriptSwatches: 'Swatches',
  goodiesScriptSwatchesHint: 'A row of tints from one hue.',
  goodiesScriptCalendar: 'Calendar',
  goodiesScriptCalendarHint: 'A month as a grid of days.',
  goodiesScriptDots: 'Dots',
  goodiesScriptDotsHint: 'Scattered dots, the same on every run.',
  resetPreview: 'Reset',
  leavePreview: params('Leave preview ({shortcut})'),
  /** The text panel's button and the canvas menu's entry for a text's link. */
  textLink: 'Link',
  addTextLink: 'Add link',
  editTextLink: 'Edit link',
  removeTextLink: 'Remove link',
  openTextLink: 'Open link',
  /** The field a text's link address is typed into. */
  textLinkAddress: 'Link address',
  textLinkPlaceholder: 'Paste a link or email address',
  textLinkInvalid: 'Use a web address or an email address.',
  /** Shown in the link field when the selected characters link to different places. */
  textLinkMixed: 'Several links',
  /** Shown in the link field for a link to a layer or page of the document. */
  textLinkToLayer: params('Links to {name}'),
  /** Shown over an embedded editor until the page it is embedded in connects. */
  embedWaiting: 'Waiting for the host page',
  embedWaitingDescription: 'The design opens once the page it is embedded in connects.',
  /** Shown when an embed link names no valid host origin, so no page can connect. */
  embedInvalidOrigin: 'This embed cannot connect',
  embedInvalidOriginDescription:
    'Its link must name the embedding page’s origin, such as https://example.com.'
} as const

export const editorMessages = i18n('editor', editorMessageDefaults)

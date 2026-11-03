import * as v from 'valibot'

import { IMAGE_ATTACHMENT_MEDIA_TYPES } from '@/app/ai/attachment/image/types'

import {
  MAX_PINNED_REFERENCES,
  MAX_STYLE_KIT_COLORS,
  MAX_STYLE_KIT_FONTS,
  MAX_STYLE_KIT_NAME,
  MAX_STYLE_KIT_NOTES
} from './limits'

const hexColorSchema = v.pipe(v.string(), v.regex(/^#(?:[0-9A-F]{6}|[0-9A-F]{8})$/))

/** One colour of a style kit: an optional role name, such as “Accent”, and its hex value. */
export const styleKitColorSchema = v.object({
  name: v.pipe(v.string(), v.maxLength(MAX_STYLE_KIT_NAME)),
  hex: hexColorSchema
})

/** The look the user pinned to a conversation, which the model follows in it. */
export const styleKitSchema = v.object({
  name: v.pipe(v.string(), v.maxLength(MAX_STYLE_KIT_NAME)),
  colors: v.pipe(v.array(styleKitColorSchema), v.maxLength(MAX_STYLE_KIT_COLORS)),
  fonts: v.pipe(
    v.array(v.pipe(v.string(), v.maxLength(MAX_STYLE_KIT_NAME))),
    v.maxLength(MAX_STYLE_KIT_FONTS)
  ),
  notes: v.pipe(v.string(), v.maxLength(MAX_STYLE_KIT_NOTES))
})

/**
 * An image pinned to a conversation as a reference. The isolated Vision model describes it once,
 * as it is pinned; the conversation's model reads only that description.
 */
export const pinnedReferenceSchema = v.object({
  id: v.string(),
  name: v.string(),
  mediaType: v.picklist(IMAGE_ATTACHMENT_MEDIA_TYPES),
  image: v.instance(Blob),
  width: v.number(),
  height: v.number(),
  findings: v.string()
})

/** What a conversation keeps pinned, as the chat database stores it. */
export const conversationPinsSchema = v.object({
  styleKit: v.nullable(styleKitSchema),
  references: v.pipe(v.array(pinnedReferenceSchema), v.maxLength(MAX_PINNED_REFERENCES))
})

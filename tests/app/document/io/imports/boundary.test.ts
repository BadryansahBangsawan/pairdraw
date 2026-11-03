import { describe, expect, test } from 'bun:test'

import { importBoundary, isWithinFolder } from '@/app/document/io/imports/boundary'

describe('the folder a document’s imports are read from', () => {
  test('reaches two folders above the document, for libraries in sibling projects', () => {
    expect(importBoundary('/Users/me/Work/app/screens', '/Users/me', '/')).toBe('/Users/me/Work')
    expect(importBoundary('/Volumes/SSD/design/app/screens', '/Users/me', '/')).toBe(
      '/Volumes/SSD/design'
    )
    expect(importBoundary('C:\\Users\\me\\Work\\app\\screens', 'C:\\Users\\me', '\\')).toBe(
      'C:\\Users\\me\\Work'
    )
  })

  test('stops below the home folder, so another project’s files stay out of reach', () => {
    expect(importBoundary('/Users/me/Downloads', '/Users/me', '/')).toBe('/Users/me/Downloads')
    expect(importBoundary('/Users/me/Downloads/sent', '/Users/me', '/')).toBe('/Users/me/Downloads')
    expect(importBoundary('/Users/me', '/Users/me', '/')).toBe('/Users/me')
    expect(importBoundary('C:\\Users\\me\\Downloads', 'C:\\Users\\me', '\\')).toBe(
      'C:\\Users\\me\\Downloads'
    )
  })

  test('never reaches a drive or file system root', () => {
    expect(importBoundary('/design/app', '/home/me', '/')).toBe('/design')
    expect(importBoundary('/design', '/home/me', '/')).toBe('/design')
    expect(importBoundary('D:\\design\\app', 'C:\\Users\\me', '\\')).toBe('D:\\design')
  })

  test('stays in the document’s folder when the home folder is unknown', () => {
    expect(importBoundary('/Volumes/SSD/design/app', '', '/')).toBe('/Volumes/SSD/design/app')
  })

  test('tells a path inside a folder from one that only shares its name’s start', () => {
    expect(isWithinFolder('/Users/me/Work', '/Users/me/Work/lib.pen', '/')).toBe(true)
    expect(isWithinFolder('/Users/me/Work', '/Users/me/Workshop/lib.pen', '/')).toBe(false)
  })
})

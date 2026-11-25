import agent from './agent'
import analyze from './analyze'
import check from './check'
import convert from './convert'
import designMemory from './design-memory'
import diff from './diff'
import documents from './documents'
import evalCmd from './eval'
import exportCmd from './export'
import find from './find'
import fonts from './fonts'
import formats from './formats'
import { redo, undo } from './history'
import importCmd from './import'
import info from './info'
import libraries from './libraries'
import lint from './lint'
import models from './models'
import node from './node'
import pages from './pages'
import query from './query'
import selection from './selection'
import settings from './settings'
import shell from './shell'
import tokens from './tokens'
import tool from './tool'
import tree from './tree'
import variables from './variables'

/**
 * The top-level `pairdraw` commands by name, as `--help` lists them. The docs site counts them
 * from here, so its numbers follow the CLI.
 */
export const COMMANDS = {
  agent,
  analyze,
  check,
  convert,
  'design-memory': designMemory,
  diff,
  documents,
  eval: evalCmd,
  export: exportCmd,
  import: importCmd,
  find,
  formats,
  fonts,
  info,
  lint,
  libraries,
  models,
  query,
  node,
  pages,
  redo,
  selection,
  settings,
  shell,
  tool,
  tokens,
  tree,
  undo,
  variables
}

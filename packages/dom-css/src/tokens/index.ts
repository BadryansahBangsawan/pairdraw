// Design tokens as CSS custom properties: names, namespaces, units, and the stylesheet.
export { featureConditionCSS, parseFeatureCondition, type FeatureCondition } from './conditions'
export {
  modeConditionKey,
  modeConditionName,
  readCustomProperties,
  type CustomPropertyDeclaration,
  type CustomPropertyScope,
  type CustomPropertySheet
} from './custom-properties'
export {
  cssExpressionProblem,
  cssTokenProperty,
  cssValueTokens,
  type CSSExpressionProblem,
  type CSSValueToken,
  type CSSValueTokenKind
} from './expression'
export {
  collectionVariables,
  cssNameCodeSyntax,
  cssNameVariableName,
  deriveCSSName,
  explicitCSSName,
  parseCSSName,
  tokenSlug,
  variableCSSNames,
  variableNamespace
} from './names'
export {
  buildTokenStylesheet,
  defaultModeAttributeName,
  defaultModeCondition,
  loadTokenValidator,
  modeAttribute,
  tokenStylesheet,
  type TokenStylesheet,
  type TokenStylesheetFormat,
  type TokenStylesheetIssue,
  type TokenStylesheetOptions
} from './stylesheet'
export { createTokenValidator, type TokenValidator } from './validate'
export { TOKEN_UNIT_PROPERTY, tokenNumberToCSS, variableUnit } from './values'

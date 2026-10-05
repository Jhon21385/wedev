import type { ToolkitId } from './types'
import { fieldsFor } from './registry'

/* ============================================================================
   DRAFT VALIDATION
   Shared by every transport, so a bad draft fails the same way locally as it
   would against the provider. Rules come from the registry — a platform limit
   is declared once, in the toolkit definition, and enforced everywhere.
   ========================================================================== */

export interface Problem {
  fieldId: string
  label: string
  message: string
  /** 'error' blocks publishing; 'warn' is advisement only. */
  severity: 'error' | 'warn'
}

export type DraftValues = Record<string, string | string[] | boolean>

export function textLength(value: string | string[] | boolean | undefined): number {
  if (Array.isArray(value)) return value.join(',').length
  if (typeof value === 'string') return value.length
  return 0
}

export function validateDraft(toolkit: ToolkitId, values: DraftValues, mediaType: string): Problem[] {
  const problems: Problem[] = []

  for (const field of fieldsFor(toolkit, mediaType)) {
    const raw = values[field.id]
    const len = textLength(raw)
    const isEmpty = len === 0 && !Array.isArray(raw)

    if (field.required && isEmpty) {
      problems.push({ fieldId: field.id, label: field.label, message: 'is required', severity: 'error' })
      continue
    }
    if (field.limit && len > field.limit) {
      problems.push({
        fieldId: field.id,
        label: field.label,
        message: `is ${len - field.limit} characters over the platform limit`,
        severity: 'error',
      })
      continue
    }
    if (field.maxItems && Array.isArray(raw) && raw.length > field.maxItems) {
      problems.push({
        fieldId: field.id,
        label: field.label,
        message: `allows ${field.maxItems} items — ${raw.length} entered`,
        severity: 'error',
      })
      continue
    }
    if (field.kind === 'media' && field.required && !raw) {
      problems.push({ fieldId: field.id, label: field.label, message: 'needs a file or URL', severity: 'error' })
      continue
    }
    if (field.recommended && len > field.recommended) {
      problems.push({
        fieldId: field.id,
        label: field.label,
        message: `will truncate around ${field.recommended} characters`,
        severity: 'warn',
      })
    }
  }

  return problems
}

/** Errors only — the set that blocks publishing. */
export function blockingProblems(toolkit: ToolkitId, values: DraftValues, mediaType: string): Problem[] {
  return validateDraft(toolkit, values, mediaType).filter((p) => p.severity === 'error')
}

/** Parse a comma/newline separated tag string into a clean list. */
export function parseTags(value: string | string[]): string[] {
  const list = Array.isArray(value) ? value : value.split(/[,\n]/)
  return list
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`))
}

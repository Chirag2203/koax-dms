/**
 * PII redaction utilities — SPEC-NOTIFICATIONS-001 L3
 *
 * L3: phone masked as +91 XX XXX XX{last4}, name as first-name-only,
 *     email as {first}@***.***
 *
 * R23 (DPO) role is exempt from masking in the audit view only.
 * The central log at /notifications ALWAYS shows masked phone/name.
 */

/**
 * Mask a phone number: +91XXXXXXXXXX → +91 XX XXX XX{last4}
 * Handles both +91XXXXXXXXXX and 91XXXXXXXXXX formats.
 * L3: PII redaction per DPDP Act 2023 §12
 */
export function maskPhone(phone: string): string {
  if (!phone) return '—';
  // Strip all non-digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '+91 XX XXX XXXX';
  const last4 = digits.slice(-4);
  return `+91 XX XXX XX${last4}`;
}

/**
 * Return first name only from a full name.
 * L3: name truncation for non-DPO roles
 */
export function maskName(fullName: string): string {
  if (!fullName) return '—';
  return fullName.split(' ')[0] ?? fullName;
}

/**
 * Mask an email: john.doe@example.com → j***@***.com
 * L3: email redaction for audit view
 */
export function maskEmail(email: string): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***.***';
  const first = local[0] ?? '*';
  const tld = domain.split('.').slice(-1)[0] ?? '***';
  return `${first}***@***.${tld}`;
}

/**
 * Redact variable values that contain PII (phone-type variables).
 * Used in DSR export and audit view for non-DPO roles.
 * L3 + L7: variable PII handling
 */
export function redactVariables(
  variables: Record<string, string>,
  variableDefs: Array<{ name: string; type: string }>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    const def = variableDefs.find((v) => v.name === key);
    if (def && (def.type === 'phone' || key.toLowerCase().includes('phone'))) {
      result[key] = '[redacted]';
    } else if (key.toLowerCase().includes('name') || key.toLowerCase().includes('email')) {
      result[key] = '[redacted]';
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Contact masking helper — PLAN-VEHICLES-002 §A (L11).
 *
 * Staff below R19 (GM) see masked PII when a customer has
 * contactConfidential: true. R19+ always see raw data.
 *
 * Mask formats:
 *   Phone:   "+91 *** *** **42"  — last 2 digits visible, rest replaced with *
 *   Email:   "a***@***.com"      — first letter + *** @ *** + last domain segment
 *   Address: "Hidden — confidential" when present; undefined when absent
 *
 * Spec reference: PLAN-VEHICLES-002 §A, Doc 14 (ROLE_RANK R19 = rank 4)
 * LoC budget: ≤80
 */

/** Viewer rank at which masking is bypassed (GM and above). */
export const R19_RANK = 4;

export interface ContactView {
  phone: string;
  email: string;
  address?: string;
  isMasked: boolean;
}

/** Mask a phone string — preserve last 2 digits, country-code prefix, replace rest with *. */
function maskPhone(phone: string): string {
  // Strip non-digit chars except leading +
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length < 2) return phone; // too short to mask meaningfully

  const last2 = digits.slice(-2);
  const innerDigits = digits.slice(0, -2);
  const masked = innerDigits.replace(/\d/g, '*');

  // Reconstruct: if original starts with +91 keep that prefix readable
  if (phone.startsWith('+91')) {
    // +91 XXXXXXXXXX — group as "+91 *** *** **XX"
    const maskedInner = masked.slice(2); // drop country code digits (91 = 2 digits)
    // Format inner as groups of 3 / 3 / **XX
    const g1 = maskedInner.slice(0, 3);
    const g2 = maskedInner.slice(3, 6);
    const g3 = `**${last2}`;
    return `+91 ${g1} ${g2} ${g3}`;
  }

  return `${masked}${last2}`;
}

/** Mask an email — first letter of local part + *** @ *** + last domain segment. */
function maskEmail(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx < 1) return email;

  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1); // e.g. "gmail.com"
  const dotIdx = domain.lastIndexOf('.');
  const tld = dotIdx >= 0 ? domain.slice(dotIdx) : ''; // ".com", ".in", etc.

  return `${local[0]}***@***${tld}`;
}

/**
 * Returns a ContactView for a customer, applying masking rules per PLAN-VEHICLES-002 §A (L11).
 *
 * @param customer  - customer object (subset of Customer type)
 * @param viewerRank - ROLE_RANK value for the viewing staff member (0 = lowest)
 */
export function maskedContactFor(
  customer: {
    phone?: string;
    email?: string;
    addressLine?: string;
    contactConfidential?: boolean;
  },
  viewerRank: number,
): ContactView {
  const shouldMask =
    customer.contactConfidential === true && viewerRank < R19_RANK;

  const phone = customer.phone ?? '';
  const email = customer.email ?? '';

  if (!shouldMask) {
    return {
      phone,
      email,
      address: customer.addressLine,
      isMasked: false,
    };
  }

  return {
    phone: phone ? maskPhone(phone) : phone,
    email: email ? maskEmail(email) : email,
    address: customer.addressLine ? 'Hidden — confidential' : undefined,
    isMasked: true,
  };
}

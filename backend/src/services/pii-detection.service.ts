import * as crypto from 'crypto';

/**
 * PII Detection and Scrubbing Service
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 * 
 * Detects and anonymizes personally identifiable information using regex patterns
 */

export interface PIIMatch {
  type: 'email' | 'phone' | 'ssn' | 'credit_card';
  value: string;
  start: number;
  end: number;
  token: string;
}

export interface PIIDetectionResult {
  scrubbedText: string;
  matches: PIIMatch[];
  hasPII: boolean;
}

export class PIIDetectionService {
  // Email detection pattern (RFC 5322 simplified)
  // Requirements: 14.1, 14.3
  private static readonly EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

  // Phone number patterns (international formats)
  // Requirements: 14.2, 14.4
  // Matches: +1-234-567-8900, (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890
  // Also matches international: +44 20 7123 4567, +61 2 1234 5678
  private static readonly PHONE_PATTERNS = [
    // US/Canada formats
    /\b\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    // International format with country code
    /\b\+([0-9]{1,3})[-.\s]?([0-9]{1,4})[-.\s]?([0-9]{1,4})[-.\s]?([0-9]{1,9})\b/g,
    // Simple 10-digit format
    /\b([0-9]{10})\b/g
  ];

  // SSN pattern (US Social Security Number)
  // Requirements: 14.3
  // Matches: 123-45-6789, 123 45 6789, 123456789
  private static readonly SSN_PATTERN = /\b([0-9]{3})[-\s]?([0-9]{2})[-\s]?([0-9]{4})\b/g;

  // Credit card patterns (major card types)
  // Requirements: 14.3
  // Matches: Visa, MasterCard, Amex, Discover (with or without spaces/dashes)
  private static readonly CREDIT_CARD_PATTERNS = [
    // Visa (13-16 digits starting with 4)
    /\b4[0-9]{3}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{0,4}\b/g,
    // MasterCard (16 digits starting with 51-55 or 2221-2720)
    /\b5[1-5][0-9]{2}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b/g,
    /\b2[2-7][0-9]{2}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b/g,
    // Amex (15 digits starting with 34 or 37)
    /\b3[47][0-9]{2}[-\s]?[0-9]{6}[-\s]?[0-9]{5}\b/g,
    // Discover (16 digits starting with 6011, 622126-622925, 644-649, 65)
    /\b6(?:011|5[0-9]{2}|4[4-9][0-9]|22[1-9][0-9]{2})[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b/g
  ];

  private emailCounter: Map<string, number>;
  private phoneCounter: Map<string, number>;
  private ssnCounter: Map<string, number>;
  private creditCardCounter: Map<string, number>;

  constructor() {
    this.emailCounter = new Map();
    this.phoneCounter = new Map();
    this.ssnCounter = new Map();
    this.creditCardCounter = new Map();
  }

  /**
   * Detect and scrub PII from text
   * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
   */
  detectAndScrub(text: string, sessionId?: string): PIIDetectionResult {
    const matches: PIIMatch[] = [];
    let scrubbedText = text;

    // Reset counters for this detection session
    this.resetCounters();

    // Detect emails
    const emailMatches = this.detectEmails(text);
    matches.push(...emailMatches);

    // Detect phone numbers
    const phoneMatches = this.detectPhones(text);
    matches.push(...phoneMatches);

    // Detect SSNs
    const ssnMatches = this.detectSSNs(text);
    matches.push(...ssnMatches);

    // Detect credit cards
    const creditCardMatches = this.detectCreditCards(text);
    matches.push(...creditCardMatches);

    // Sort matches by position (descending) to replace from end to start
    // This prevents position shifts during replacement
    matches.sort((a, b) => b.start - a.start);

    // Replace all matches with tokens
    for (const match of matches) {
      scrubbedText = 
        scrubbedText.substring(0, match.start) +
        match.token +
        scrubbedText.substring(match.end);
    }

    return {
      scrubbedText,
      matches: matches.reverse(), // Return in original order
      hasPII: matches.length > 0
    };
  }

  /**
   * Detect email addresses
   * Requirements: 14.1, 14.3
   */
  private detectEmails(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const regex = new RegExp(PIIDetectionService.EMAIL_PATTERN);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const email = match[0];
      const token = this.getEmailToken(email);
      
      matches.push({
        type: 'email',
        value: email,
        start: match.index,
        end: match.index + email.length,
        token
      });
    }

    return matches;
  }

  /**
   * Detect phone numbers (international formats)
   * Requirements: 14.2, 14.4
   */
  private detectPhones(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const seenPositions = new Set<number>();

    for (const pattern of PIIDetectionService.PHONE_PATTERNS) {
      const regex = new RegExp(pattern);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const phone = match[0];
        const start = match.index;
        
        // Skip if we already detected a phone at this position
        if (seenPositions.has(start)) {
          continue;
        }

        // Validate phone number (basic check for reasonable length)
        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
          seenPositions.add(start);
          const token = this.getPhoneToken(phone);
          
          matches.push({
            type: 'phone',
            value: phone,
            start,
            end: start + phone.length,
            token
          });
        }
      }
    }

    return matches;
  }

  /**
   * Detect Social Security Numbers
   * Requirements: 14.3
   */
  private detectSSNs(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const regex = new RegExp(PIIDetectionService.SSN_PATTERN);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const ssn = match[0];
      const token = this.getSSNToken(ssn);
      
      matches.push({
        type: 'ssn',
        value: ssn,
        start: match.index,
        end: match.index + ssn.length,
        token
      });
    }

    return matches;
  }

  /**
   * Detect credit card numbers
   * Requirements: 14.3
   */
  private detectCreditCards(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const seenPositions = new Set<number>();

    for (const pattern of PIIDetectionService.CREDIT_CARD_PATTERNS) {
      const regex = new RegExp(pattern);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const cardNumber = match[0];
        const start = match.index;
        
        // Skip if we already detected a card at this position
        if (seenPositions.has(start)) {
          continue;
        }

        // Validate using Luhn algorithm
        if (this.validateLuhn(cardNumber)) {
          seenPositions.add(start);
          const token = this.getCreditCardToken(cardNumber);
          
          matches.push({
            type: 'credit_card',
            value: cardNumber,
            start,
            end: start + cardNumber.length,
            token
          });
        }
      }
    }

    return matches;
  }

  /**
   * Validate credit card number using Luhn algorithm
   */
  private validateLuhn(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Generate token for email
   * Requirements: 14.5
   */
  private getEmailToken(email: string): string {
    if (!this.emailCounter.has(email)) {
      this.emailCounter.set(email, this.emailCounter.size + 1);
    }
    return `[EMAIL_${this.emailCounter.get(email)}]`;
  }

  /**
   * Generate token for phone number
   * Requirements: 14.5
   */
  private getPhoneToken(phone: string): string {
    if (!this.phoneCounter.has(phone)) {
      this.phoneCounter.set(phone, this.phoneCounter.size + 1);
    }
    return `[PHONE_${this.phoneCounter.get(phone)}]`;
  }

  /**
   * Generate token for SSN
   * Requirements: 14.5
   */
  private getSSNToken(ssn: string): string {
    if (!this.ssnCounter.has(ssn)) {
      this.ssnCounter.set(ssn, this.ssnCounter.size + 1);
    }
    return `[SSN_${this.ssnCounter.get(ssn)}]`;
  }

  /**
   * Generate token for credit card
   * Requirements: 14.5
   */
  private getCreditCardToken(cardNumber: string): string {
    if (!this.creditCardCounter.has(cardNumber)) {
      this.creditCardCounter.set(cardNumber, this.creditCardCounter.size + 1);
    }
    return `[CARD_${this.creditCardCounter.get(cardNumber)}]`;
  }

  /**
   * Reset counters for new detection session
   */
  private resetCounters(): void {
    this.emailCounter.clear();
    this.phoneCounter.clear();
    this.ssnCounter.clear();
    this.creditCardCounter.clear();
  }

  /**
   * Hash PII value for storage (one-way hash)
   */
  static hashPII(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}

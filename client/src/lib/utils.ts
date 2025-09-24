import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format FCFA amounts without thousands separators
export function formatFCFA(amount: number | string): string {
  let numAmount: number;
  
  if (typeof amount === 'string') {
    // For FCFA context, treat all punctuation as thousands separators
    // Remove spaces, commas, and dots (no decimal places in FCFA)
    const cleanedAmount = amount.replace(/[\s,\.]/g, '');
    // Keep only digits and minus sign
    const finalAmount = cleanedAmount.replace(/[^\d\-]/g, '');
    numAmount = parseFloat(finalAmount) || 0;
  } else {
    numAmount = amount || 0;
  }
  
  // Use Math.abs to always return positive amount (sign is handled by caller)
  return `${Math.abs(Math.trunc(numAmount))} FCFA`;
}

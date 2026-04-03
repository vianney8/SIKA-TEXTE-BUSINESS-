import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format FCFA amounts without thousands separators
export function formatFCFA(amount: number | string): string {
  let numAmount: number;
  
  if (typeof amount === 'string') {
    numAmount = parseFloat(amount) || 0;
  } else {
    numAmount = amount || 0;
  }
  
  return `${Math.abs(Math.trunc(numAmount))} FCFA`;
}

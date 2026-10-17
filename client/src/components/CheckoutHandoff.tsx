import { createContext, useContext } from "react";
import type { CountryPaymentMode } from "@shared/checkout-settings";
export type CheckoutDetails = {
  country: string; operator: string; phone: string; payerName: string;
  mode: CountryPaymentMode;
  customerEmail?: string;
};
export const CheckoutHandoff = createContext<CheckoutDetails | null>(null);
export const useCheckoutHandoff = () => useContext(CheckoutHandoff);

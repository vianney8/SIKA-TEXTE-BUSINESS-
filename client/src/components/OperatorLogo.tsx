import React from "react";
import "./payment-motion.css";

type OperatorKey =
  | "mtn"
  | "moov"
  | "orange"
  | "wave"
  | "celtis"
  | "expresso"
  | "tmoney"
  | "flooz"
  | "airtel"
  | "free"
  | "mixx";

type OperatorLogoProps = {
  code: string;
  size?: number;
  className?: string;
};

const aliases: Record<string, OperatorKey> = {
  mtn: "mtn",
  mtnmomo: "mtn",
  mtnmobilemoney: "mtn",
  moov: "moov",
  moovmoney: "moov",
  orange: "orange",
  orangemoney: "orange",
  wave: "wave",
  wavesenegal: "wave",
  celtis: "celtis",
  celtiscash: "celtis",
  expresso: "expresso",
  expressomoney: "expresso",
  tmoney: "tmoney",
  tmoneytogo: "tmoney",
  flooz: "flooz",
  floozmoney: "flooz",
  airtel: "airtel",
  airtelmoney: "airtel",
  free: "free",
  freemoney: "free",
  mixx: "mixx",
  mixxbyyas: "mixx",
};

const operatorNames: Record<OperatorKey, string> = {
  mtn: "MTN",
  moov: "Moov",
  orange: "Orange",
  wave: "Wave",
  celtis: "Celtis",
  expresso: "Expresso",
  tmoney: "T-Money",
  flooz: "Flooz",
  airtel: "Airtel",
  free: "Free Money",
  mixx: "Mixx by Yas",
};

function OperatorMark({ operator }: { operator: OperatorKey | undefined }) {
  switch (operator) {
    case "mtn":
      return (
        <>
          <rect x="3" y="3" width="42" height="42" rx="13" fill="#ffcc00" />
          <path d="M9 17h7l5 7 5-7h7v15h-6v-7l-6 7-6-7v7H9z" fill="#20202a" />
          <path d="M35 17h5v15h-5z" fill="#20202a" />
        </>
      );
    case "moov":
      return (
        <>
          <rect x="3" y="3" width="42" height="42" rx="15" fill="#075ca8" />
          <path d="M10 29c4.5 0 4.5-10 9-10s4.5 10 9 10 4.5-10 10-10" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="11" cy="18" r="2.2" fill="#86d6ff" />
        </>
      );
    case "orange":
      return (
        <>
          <circle cx="24" cy="24" r="21" fill="#f36b21" />
          <path d="M24 11a13 13 0 1 0 13 13" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M24 11v8h8" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "wave":
      return (
        <>
          <circle cx="24" cy="24" r="21" fill="#176bea" />
          <path d="M9 20c3.6 0 3.6 8 7.2 8s3.6-8 7.2-8 3.6 8 7.2 8 3.6-8 8.4-8" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
          <path d="M14 14h20" stroke="#a8d9ff" strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case "celtis":
      return (
        <>
          <rect x="3" y="3" width="42" height="42" rx="13" fill="#08765c" />
          <path d="M24 9 38 24 24 39 10 24z" fill="#c5f1d9" />
          <path d="M24 15 32 24 24 33 16 24z" fill="#08765c" />
          <path d="M24 18v12" stroke="#c5f1d9" strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case "expresso":
      return (
        <>
          <rect x="3" y="3" width="42" height="42" rx="13" fill="#075c96" />
          <path d="M12 32V16h5l7 9 7-9h5v16h-5v-8l-7 8-7-8v8z" fill="#fff" />
          <path d="M12 11h24" stroke="#73d6f2" strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case "tmoney":
      return (
        <>
          <rect x="3" y="3" width="42" height="42" rx="13" fill="#c9273d" />
          <path d="M12 14h24v5h-9v16h-6V19h-9z" fill="#fff" />
          <circle cx="35" cy="34" r="3.5" fill="#ffc4c8" />
        </>
      );
    case "flooz":
      return (
        <>
          <rect x="3" y="3" width="42" height="42" rx="15" fill="#6439a6" />
          <path d="M24 9c7 7 11 11 11 17a11 11 0 0 1-22 0c0-6 4-10 11-17z" fill="#e9ddff" />
          <path d="M19 27c0 3 2.2 5 5 5" fill="none" stroke="#6439a6" strokeWidth="2.6" strokeLinecap="round" />
        </>
      );
    case "airtel":
      return (
        <>
          <rect x="3" y="3" width="42" height="42" rx="13" fill="#df1f32" />
          <path d="M24 10 37 35h-7l-6-12-6 12h-7z" fill="#fff" />
          <path d="M20.5 28h7" stroke="#df1f32" strokeWidth="2.6" strokeLinecap="round" />
        </>
      );
    case "free":
      return (
        <>
          <circle cx="24" cy="24" r="21" fill="#079447" />
          <path d="M15 35V13h19v5H21v4h11v5H21v8z" fill="#fff" />
          <path d="M13 11h22" stroke="#a9edc2" strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case "mixx":
      return (
        <>
          <rect x="3" y="3" width="42" height="42" rx="13" fill="#f4c51b" />
          <path d="M10 33V15h5l9 10 9-10h5v18h-6V24l-8 9-8-9v9z" fill="#28324a" />
          <circle cx="36" cy="12" r="3" fill="#df4c42" />
        </>
      );
    default:
      return (
        <>
          <rect x="3" y="3" width="42" height="42" rx="14" fill="#f1edf9" />
          <rect x="14" y="9" width="20" height="30" rx="5" fill="none" stroke="#6545a8" strokeWidth="2.8" />
          <path d="M19 14h10M19 19h10" stroke="#9d88c7" strokeWidth="2" strokeLinecap="round" />
          <circle cx="24" cy="33" r="1.8" fill="#6545a8" />
        </>
      );
  }
}

export default function OperatorLogo({ code, size = 40, className }: OperatorLogoProps) {
  const normalized = code.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const operator = aliases[normalized];
  const accessibleName = operator ? `${operatorNames[operator]} payment mark` : "Mobile payment method";

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={accessibleName}
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <OperatorMark operator={operator} />
    </svg>
  );
}

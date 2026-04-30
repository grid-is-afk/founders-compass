export const REQUIRED_DOCS = [
  { label: "Balance Sheets",                category: "Financials" },
  { label: "Income Statements",             category: "Financials" },
  { label: "Personal Financial Statements", category: "Financials" },
  { label: "Asset Summary",                 category: "Financials" },
  { label: "IP, Patents & Trademarks",      category: "Legal & Structure" },
] as const;

export const DATA_ROOM_CATEGORIES = [
  "Reports",
  "Financials",
  "Customer Capital",
  "Legal & Structure",
  "Governance",
  "Meeting Notes",
  "Agreements",
  "Other",
] as const;

export type DataRoomCategory = (typeof DATA_ROOM_CATEGORIES)[number];

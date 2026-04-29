import { format } from "date-fns";

export const today = () => format(new Date(), "yyyy-MM-dd");

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Still up.";
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  if (h < 22) return "Good evening.";
  return "Late hours.";
};

export const longDate = () => format(new Date(), "EEEE · d MMMM yyyy").toUpperCase();
export const shortDate = (d: string | Date) => format(new Date(d), "d MMM");

export const xpForLevel = (lvl: number) => lvl * 500;
export const levelTitle = (lvl: number) => {
  if (lvl <= 5) return "Apprentice";
  if (lvl <= 10) return "Operator";
  if (lvl <= 20) return "Architect";
  return "Sovereign";
};

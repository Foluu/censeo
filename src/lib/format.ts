const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const nairaPrecise = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatNaira(value: number | string, precise = false) {
  const n = typeof value === "string" ? Number(value) : value;
  return precise ? nairaPrecise.format(n) : naira.format(n);
}

export function formatNairaCompact(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  return compact.format(n);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-NG").format(value);
}

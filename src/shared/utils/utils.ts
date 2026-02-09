export function FeeWithCommision(charge: number, percent: number = 10) {
  return Number(((charge * percent) / 100).toFixed(2));
}

export function validateAddress<T extends Record<string, any>>({
  dto,
  requiredFields,
}: {
  dto: T;
  requiredFields: string[];
}) {
  for (const field of requiredFields) {
    if (!dto[field] || typeof dto[field] !== "string" || !dto[field].trim()) {
      throw new Error(`Invalid or missing field: ${field}`);
    }
    if (dto[field] && typeof dto[field] !== "string") {
      throw new Error(`${dto[field]} must be a string`);
    }
  }
}

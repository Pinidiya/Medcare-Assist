/**
 * Resolves appropriate medicine unit labels (tablets, capsules, bottles, tubes, sachets, units)
 * based on medicine name, generic name, category, or dosage form.
 */
export function getMedicineUnit(medicine, count = 1) {
  const name = (medicine?.brand_name || medicine?.name || medicine?.medicine_name || '').toLowerCase();
  const generic = (medicine?.generic_name || '').toLowerCase();
  const category = (medicine?.category || '').toLowerCase();
  const desc = (medicine?.description || '').toLowerCase();
  const combined = `${name} ${generic} ${category} ${desc}`;

  const num = parseInt(count, 10) || 1;
  const isPlural = num !== 1;

  if (
    combined.includes('syrup') ||
    combined.includes('suspension') ||
    combined.includes('liquid') ||
    combined.includes('solution') ||
    combined.includes('drop')
  ) {
    return isPlural ? 'bottles' : 'bottle';
  }
  if (
    combined.includes('inhaler') ||
    combined.includes('rotacap') ||
    combined.includes('evohaler')
  ) {
    return isPlural ? 'inhalers' : 'inhaler';
  }
  if (
    combined.includes('cream') ||
    combined.includes('ointment') ||
    combined.includes('gel')
  ) {
    return isPlural ? 'tubes' : 'tube';
  }
  if (
    combined.includes('sachet') ||
    combined.includes('powder') ||
    combined.includes('ors')
  ) {
    return isPlural ? 'sachets' : 'sachet';
  }
  if (
    combined.includes('capsule') ||
    combined.includes(' cap') ||
    combined.includes('caps')
  ) {
    return isPlural ? 'capsules' : 'capsule';
  }
  if (
    combined.includes('tablet') ||
    combined.includes(' tab') ||
    combined.includes('tabs') ||
    combined.includes('mg') ||
    combined.includes('mcg') ||
    medicine?.timing
  ) {
    return isPlural ? 'tablets' : 'tablet';
  }

  return isPlural ? 'units' : 'unit';
}

/**
 * Returns formatted string like "10 tablets", "1 bottle", "2 capsules"
 */
export function formatMedicineQuantity(quantity, medicine) {
  const qty = parseInt(quantity, 10) || 0;
  const unit = getMedicineUnit(medicine, qty);
  return `${qty} ${unit}`;
}

/**
 * Returns unit price label like "Rs. 45.00 / tablet", "Rs. 120.00 / bottle"
 */
export function formatUnitPrice(price, medicine) {
  const p = parseFloat(price) || 0;
  const unit = getMedicineUnit(medicine, 1);
  return `Rs. ${p.toFixed(2)} / ${unit}`;
}

/**
 * Formatea un número como moneda mexicana (MXN)
 * @param amount - Monto a formatear
 * @returns String formateado como $1,000.00
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea un número como porcentaje
 * @param value - Valor a formatear
 * @param decimals - Número de decimales (default: 2)
 * @returns String formateado como 10.50%
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

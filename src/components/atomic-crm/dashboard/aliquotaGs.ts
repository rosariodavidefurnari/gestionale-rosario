/**
 * Aliquote ufficiali INPS Gestione Separata per i liberi professionisti privi di
 * altra copertura previdenziale, per gli anni VERIFICATI sulle dichiarazioni reali
 * (Quadro RR "contributo dovuto" / reddito):
 *   2023: 2.249 / 8.575 = 26,23%
 *   2024: 1.879 / 7.207 = 26,07%
 * L'aliquota include gia' la quota aggiuntiva (maternita'/ISCRO). Nessun minimale.
 *
 * Anni NON ancora dichiarati (2025+): NON si hardcodano (non inventare su un anno
 * non chiuso) -> si usa `fiscalConfig.aliquotaINPS`, che l'utente allinea alla
 * circolare INPS dell'anno corrente. Quando il commercialista chiude un anno e si
 * verifica il valore reale, lo si promuove qui.
 */
const ALIQUOTA_GS_BY_YEAR: Record<number, number> = {
  2023: 26.23,
  2024: 26.07,
};

/**
 * Aliquota INPS Gestione Separata per l'anno. Se l'anno non e' ancora coperto dalla
 * tabella ufficiale, usa `fallbackRate` (es. `fiscalConfig.aliquotaINPS`) come
 * default per l'anno corrente/futuro, finche' non si aggiorna la costante.
 */
export const getAliquotaGs = (year: number, fallbackRate: number): number =>
  ALIQUOTA_GS_BY_YEAR[year] ?? fallbackRate;

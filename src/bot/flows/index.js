import { registrationFlows } from './registration.js'
import { slotReportFlows } from './slotReports.js'
import { equipmentFlows } from './equipment.js'
import { claimFlows } from './claim.js'
import { tariffsFlows } from './tariffs.js'

// Реестр всех потоков-анкет. Движок (../engine.js) ищет определение по имени.
const DEFINITIONS = {
  ...registrationFlows,
  ...slotReportFlows,
  ...equipmentFlows,
  ...claimFlows,
  ...tariffsFlows,
}

export function getDefinition(name) {
  return DEFINITIONS[name] || null
}

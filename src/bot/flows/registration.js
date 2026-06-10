import { buildCourierFields } from '../fields.js'
import { saveRegistration } from '../../services/courier.js'
import { notifyManager } from '../notify.js'
import { showMenu } from '../menu.js'

// 1.4 / 1.5 / редактирование — все используют один набор полей,
// различается только regType (влияет на городские блоки и статус).
function make(regType, intro) {
  return {
    buildFields: () => buildCourierFields(),
    init: (flow) => { flow.regType = regType },
    confirm: true,
    submitLabel: '📨 Отправить на регистрацию',
    intro,
    onComplete: async (ctx, draft, courier) => {
      const saved = await saveRegistration(ctx.from.id, regType, draft)
      await notifyManager(ctx.api, saved, regType)
      await showMenu(ctx, 'Готово! Данные сохранены и отправлены менеджеру.')
    },
  }
}

export const registrationFlows = {
  registration_new: make('new', 'Заполните анкету курьера. В любой момент можно нажать «Отмена».'),
  registration_existing: make('existing', 'Заполните анкету курьера. В любой момент можно нажать «Отмена».'),
  registration_edit: make('edit', 'Изменение данных. Заполните анкету заново.'),
}

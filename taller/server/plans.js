'use strict';
const config = require('./config');

const PLANS = {
  basico: {
    id: 'basico', name: 'Básico', price: config.prices.basico, maxUsers: 2, maxBays: 3, aiMessages: config.aiMessages.basico,
    features: ['Hasta 2 usuarios', 'Hasta 3 bahías', 'Órdenes de trabajo ilimitadas', 'Inventario y compras sugeridas', `Asistente IA: ${config.aiMessages.basico} consultas al mes`],
  },
  profesional: {
    id: 'profesional', name: 'Profesional', price: config.prices.profesional, maxUsers: 6, maxBays: 10, aiMessages: config.aiMessages.profesional, highlight: true,
    features: ['Hasta 6 usuarios', 'Hasta 10 bahías', 'Todo lo del plan Básico', 'Planificación y auto-asignación', `Asistente IA: ${config.aiMessages.profesional} consultas al mes`],
  },
  red: {
    id: 'red', name: 'Taller+', price: config.prices.red, maxUsers: 20, maxBays: null, aiMessages: config.aiMessages.red,
    features: ['Hasta 20 usuarios', 'Bahías ilimitadas', 'Todo lo del plan Profesional', `Asistente IA: ${config.aiMessages.red} consultas al mes`, 'Soporte prioritario'],
  },
};
// Durante la prueba gratis se usan los límites de este plan.
const TRIAL_PLAN = 'profesional';

const publicPlans = () => ({
  currency: config.currency,
  trialDays: config.trialDays,
  contactEmail: config.contactEmail,
  whatsapp: config.whatsapp,
  aiEnabled: config.ai.enabled,
  plans: Object.values(PLANS),
});

module.exports = { PLANS, TRIAL_PLAN, publicPlans };

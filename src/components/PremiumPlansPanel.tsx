import type { PremiumPlan } from '../types'

interface PremiumPlansPanelProps {
  plans: PremiumPlan[]
}

function paymentLink(plan: PremiumPlan) {
  if (plan.id === 'elite') {
    return import.meta.env.VITE_STRIPE_PAYMENT_LINK_ELITE ?? ''
  }

  if (plan.id === 'concierge') {
    return import.meta.env.VITE_STRIPE_PAYMENT_LINK_CONCIERGE ?? ''
  }

  return ''
}

export function PremiumPlansPanel({ plans }: PremiumPlansPanelProps) {
  return (
    <section className="panel premium-panel">
      <div className="section-intro">
        <div>
          <span className="eyebrow">Premium Subscription Features</span>
          <h2>Pricing and checkout hooks are ready for Stripe Billing</h2>
        </div>
        <span className="section-aside">Stripe Checkout Sessions are the intended next step.</span>
      </div>

      <div className="premium-grid">
        {plans.map((plan) => {
          const link = paymentLink(plan)

          return (
            <article key={plan.id} className={`premium-plan${plan.highlighted ? ' featured' : ''}`}>
              <div>
                <strong>{plan.name}</strong>
                <b>{plan.priceLabel}</b>
              </div>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {link ? (
                <a className="primary-button subtle premium-link" href={link} target="_blank" rel="noreferrer">
                  Open Stripe link
                </a>
              ) : (
                <span className="plan-hint">Add a Stripe payment link env var to enable checkout.</span>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

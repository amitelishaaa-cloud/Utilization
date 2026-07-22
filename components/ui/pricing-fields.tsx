'use client'
import { useState } from 'react'

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

interface PricingFieldsProps {
  fixedOptionValue: 'fixed' | 'fixed_monthly'
  fixedOptionLabel: string
  fixedFieldName: 'fixed_price' | 'monthly_fixed_price'
  fixedFieldLabel: string
  defaultPricingType?: string
  defaultHourlyRate?: number | null
  defaultFixedValue?: number | null
}

export default function PricingFields({
  fixedOptionValue,
  fixedOptionLabel,
  fixedFieldName,
  fixedFieldLabel,
  defaultPricingType,
  defaultHourlyRate,
  defaultFixedValue,
}: PricingFieldsProps) {
  const [pricingType, setPricingType] = useState(defaultPricingType ?? 'hourly')

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          סוג תמחור <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-6">
          {[
            { value: 'hourly', label: 'שעתי' },
            { value: fixedOptionValue, label: fixedOptionLabel },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="pricing_type"
                value={opt.value}
                checked={pricingType === opt.value}
                onChange={() => setPricingType(opt.value)}
                className="accent-gray-900"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {pricingType === 'hourly' ? (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            תעריף לשעה (₪) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="hourly_rate"
            min="0.01"
            step="0.01"
            defaultValue={defaultHourlyRate ?? ''}
            required
            className={INPUT_CLASS}
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            {fixedFieldLabel} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name={fixedFieldName}
            min="0.01"
            step="0.01"
            defaultValue={defaultFixedValue ?? ''}
            required
            className={INPUT_CLASS}
          />
        </div>
      )}
    </div>
  )
}

import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockStats } from '../../../../../test/mocks.ts'
import { renderWithProviders } from '../../../../../test/renderWithProviders.tsx'
import { RatingDistributionSection } from './RatingDistributionSection.tsx'

describe('RatingDistributionSection', () => {
  it('renders title and rating counts', () => {
    renderWithProviders(
      <RatingDistributionSection
        stats={{ ratingDistribution: mockStats.ratingDistribution }}
      />
    )
    expect(
      screen.getByRole('heading', { name: 'Puan dağılımı' })
    ).toBeInTheDocument()
    expect(screen.getByText('210')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })
})

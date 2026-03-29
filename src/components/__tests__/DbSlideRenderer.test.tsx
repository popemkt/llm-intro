import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DbSlideRenderer } from '../DbSlideRenderer'
import type { Block } from '@/types'

describe('DbSlideRenderer', () => {
  it('renders empty state when no blocks', () => {
    render(<DbSlideRenderer blocks={[]} theme="dark-green" />)
    expect(screen.getByText('Empty slide')).toBeInTheDocument()
  })

  it('renders text block with markdown', () => {
    const blocks: Block[] = [{ id: '1', type: 'text', markdown: '**Bold text**' }]
    render(<DbSlideRenderer blocks={blocks} theme="dark-green" />)
    expect(screen.getByText('Bold text')).toBeInTheDocument()
  })

  it('renders image block', () => {
    const blocks: Block[] = [{ id: '1', type: 'image', url: 'https://example.com/img.png', alt: 'test image' }]
    render(<DbSlideRenderer blocks={blocks} theme="dark-green" />)
    const img = screen.getByAltText('test image') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.src).toBe('https://example.com/img.png')
  })

  it('renders iframe block', () => {
    const blocks: Block[] = [{ id: '1', type: 'iframe', url: 'https://example.com', height: 400 }]
    render(<DbSlideRenderer blocks={blocks} theme="dark-green" />)
    const iframe = document.querySelector('iframe') as HTMLIFrameElement
    expect(iframe).toBeInTheDocument()
    expect(iframe.src).toBe('https://example.com/')
  })

  it('applies data-theme attribute', () => {
    const { container } = render(<DbSlideRenderer blocks={[]} theme="neon" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.getAttribute('data-theme')).toBe('neon')
  })

  it('renders multiple blocks', () => {
    const blocks: Block[] = [
      { id: '1', type: 'text', markdown: 'First block' },
      { id: '2', type: 'text', markdown: 'Second block' },
    ]
    render(<DbSlideRenderer blocks={blocks} theme="light" />)
    expect(screen.getByText('First block')).toBeInTheDocument()
    expect(screen.getByText('Second block')).toBeInTheDocument()
  })
})

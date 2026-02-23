'use client'

interface FloatingLabelProps {
  text: string
  visible: boolean
  className?: string
  variant?: 'title' | 'subtitle' | 'tagline'
}

export default function FloatingLabel({ text, visible, className = '', variant = 'tagline' }: FloatingLabelProps) {
  const baseStyles = 'transition-all duration-700 ease-out'

  const variantStyles = {
    title: 'font-display text-4xl md:text-6xl font-bold tracking-tight',
    subtitle: 'text-lg md:text-xl text-zinc-400 font-medium',
    tagline: 'text-sm md:text-base text-emerald-400 font-mono tracking-wide',
  }

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      {text}
    </div>
  )
}

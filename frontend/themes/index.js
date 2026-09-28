/**
 * Hole Lotta Problems — Mobile Design System
 * Aesthetic: Technical Minimalism (Linear / Raycast / Teenage Engineering)
 */

export const theme = {
    colors: {
        // Deep Zinc/Slate Monochromatic Base
        canvas:           '#09090b',   // Zinc 950
        background:       '#09090b',
        surface:          '#121215',   // Zinc 900
        elevated:         '#18181b',   // Zinc 850
        muted:            '#27272a',   // Zinc 800

        // Typography Foregrounds
        text:             '#fafafa',   // 100% white
        textSecondary:    '#a1a1aa',   // ~65% body text
        textTertiary:     '#71717a',   // ~45% metadata
        textDisabled:     '#52525b',   // ~30% disabled

        // Single Purposeful Accent (Teenage Engineering safety orange)
        primary:          '#f97316',
        primarySubtle:    'rgba(249, 115, 22, 0.12)',
        primaryBorder:    'rgba(249, 115, 22, 0.30)',

        // Semantic Severity
        critical:         '#ef4444',
        criticalSubtle:   'rgba(239, 68, 68, 0.12)',
        warning:          '#f59e0b',
        warningSubtle:    'rgba(245, 158, 11, 0.12)',
        success:          '#10b981',
        successSubtle:    'rgba(16, 185, 129, 0.12)',

        // Razor 1px Structural Dividers
        borderSubtle:     'rgba(255, 255, 255, 0.08)',
        border:           'rgba(255, 255, 255, 0.12)',
        borderFocus:      'rgba(255, 255, 255, 0.28)',

        sheetOverlay:     'rgba(9, 9, 11, 0.85)',
    },
    typography: {
        heading: {
            fontSize: 18,
            fontWeight: '600',
            color: '#fafafa',
            letterSpacing: -0.2,
        },
        subheading: {
            fontSize: 12,
            fontWeight: '500',
            color: '#a1a1aa',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        body: {
            fontSize: 14,
            fontWeight: '400',
            color: '#fafafa',
            lineHeight: 20,
        },
        caption: {
            fontSize: 12,
            fontWeight: '400',
            color: '#71717a',
        },
        tabular: {
            fontVariant: ['tabular-nums'],
            fontWeight: '600',
            letterSpacing: -0.2,
        },
    },
    layout: {
        radiusXs: 4,
        radiusSm: 6,
        radiusMd: 8,
        radiusLg: 10,
    },
};

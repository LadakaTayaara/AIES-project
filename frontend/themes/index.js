/**
 * Hole Lotta Problems — Tactical Design System
 * Theme: Obsidian & Signal Amber // Aero-Tactical Road Intelligence
 */

export const theme = {
    colors: {
        // Deep obsidian titanium backgrounds
        void:             '#05070b',
        background:       '#080c14',
        surface:          '#0e1422',
        elevated:         '#141d30',
        elevatedHover:    '#1a263e',

        // Primary: Signal Hazard Amber & Cyber Gold
        primary:          '#f59e0b',   // Signal Amber
        primaryLight:     '#fbbf24',
        primaryDark:      '#d97706',
        primaryGlow:      'rgba(245, 158, 11, 0.25)',
        primaryGlowStrong:'rgba(245, 158, 11, 0.45)',

        // Secondary: Electric Cyan / Tactical Phosphorus
        cyan:             '#00f0ff',
        cyanLight:        '#67e8f9',
        cyanDark:         '#0891b2',
        cyanGlow:         'rgba(0, 240, 255, 0.25)',

        // Semantic Severity Colors
        critical:         '#ff1744',   // Laser Crimson
        criticalGlow:     'rgba(255, 23, 68, 0.35)',
        warning:          '#ff9100',   // Tungsten Orange
        warningGlow:      'rgba(255, 145, 0, 0.35)',
        success:          '#00e676',   // Phosphor Mint
        successGlow:      'rgba(0, 230, 118, 0.25)',

        // High-contrast tactical typography
        text:             '#f8fafc',
        textSecondary:    '#94a3b8',
        textDim:          '#64748b',
        textMuted:        '#475569',

        // Borders & Overlays
        border:           'rgba(255, 255, 255, 0.07)',
        borderLight:      'rgba(255, 255, 255, 0.14)',
        borderAccent:     'rgba(245, 158, 11, 0.35)',
        borderCyan:       'rgba(0, 240, 255, 0.30)',
        transparentPanel: 'rgba(14, 20, 34, 0.82)',
        darkOverlay:      'rgba(5, 7, 11, 0.88)',
    },
    typography: {
        heading: {
            fontSize: 22,
            fontWeight: '800',
            color: '#f8fafc',
            letterSpacing: 0.5,
        },
        subheading: {
            fontSize: 13,
            fontWeight: '700',
            color: '#fbbf24',
            letterSpacing: 1,
            textTransform: 'uppercase',
        },
        body: {
            fontSize: 14,
            color: '#f8fafc',
            lineHeight: 20,
        },
        stats: {
            fontSize: 32,
            fontWeight: '900',
            color: '#f8fafc',
            letterSpacing: -0.5,
        },
        mono: {
            fontSize: 12,
            fontWeight: '600',
            color: '#00f0ff',
            letterSpacing: 0.8,
        },
    },
    effects: {
        glassmorphism: {
            backgroundColor: 'rgba(14, 20, 34, 0.80)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 14,
        },
        tacticalBox: {
            backgroundColor: 'rgba(14, 20, 34, 0.90)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.25)',
            borderRadius: 10,
        },
    },
};

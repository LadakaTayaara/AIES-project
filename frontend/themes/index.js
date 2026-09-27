export const theme = {
    colors: {
        background: '#0A0A0A',
        surface: '#1A1A1A',
        primary: '#00F0FF', // Cyan
        warning: '#FFB300', // Amber
        critical: '#FF3366', // Crimson 
        success: '#00E676', // Emerald
        text: '#FFFFFF',
        textDim: '#888888',
        transparentPanel: 'rgba(26, 26, 26, 0.7)',
    },
    typography: {
        heading: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#FFFFFF',
            letterSpacing: 2,
        },
        subheading: {
            fontSize: 16,
            fontWeight: '600',
            color: '#00F0FF',
            letterSpacing: 1,
        },
        body: {
            fontSize: 14,
            color: '#FFFFFF',
        },
        stats: {
            fontSize: 36,
            fontWeight: '900',
            color: '#FFFFFF',
        }
    },
    effects: {
        glassmorphism: {
            backgroundColor: 'rgba(26, 26, 26, 0.5)',
            backdropFilter: 'blur(10px)',
            borderWidth: 1,
            borderColor: 'rgba(0, 240, 255, 0.3)',
            borderRadius: 16,
        }
    }
};

export class EmailStyleService {
    private readonly themes = {
        light: {
            backgroundColor: '#f6f9fc',
            containerBg: '#ffffff',
            textColor: '#2c3e50',
            accentColor: '#3498db',
            borderColor: '#eaeaea',
            headerBg: '#f8f9fa',
            footerBg: '#f8f9fa',
            footerText: '#6b7280'
        },
        dark: {
            backgroundColor: '#1a1a1a',
            containerBg: '#2d3748',
            textColor: '#f8f9fa',
            accentColor: '#4299e1',
            borderColor: '#4a5568',
            headerBg: '#2d3748',
            footerBg: '#2d3748',
            footerText: '#a0aec0'
        }
    };

    getThemeStyles(theme: 'light' | 'dark' | 'custom'): string {
        if (theme === 'custom') {
            return ''; // Let custom styles be handled by the template
        }

        const colors = this.themes[theme];
        return `
            /* Theme-specific overrides - will complement existing styles */
            body, html {
                background-color: ${colors.backgroundColor};
                color: ${colors.textColor};
            }

            .email-container {
                background-color: ${colors.containerBg};
                border-color: ${colors.borderColor};
            }

            .header {
                background-color: ${colors.headerBg};
            }

            .footer {
                background-color: ${colors.footerBg};
                color: ${colors.footerText};
            }

            .email-paragraph {
                color: ${colors.textColor};
            }

            .heading {
                color: ${colors.textColor};
            }

            .footer-divider {
                background-color: ${colors.borderColor};
            }

            .powered-link {
                color: ${colors.footerText};
            }

            .powered-link:hover {
                color: ${colors.accentColor};
            }
        `;
    }
}
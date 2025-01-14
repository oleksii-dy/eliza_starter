import { useEffect } from 'react';

export default function Docs() {
    useEffect(() => {
        // Redirect to the documentation site
        window.location.href = '/docs/';
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen gradient-bg">
            <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">Redirecting to Documentation...</h2>
                <p className="text-muted-foreground">
                    If you are not redirected automatically,{' '}
                    <a href="/docs/" className="text-primary hover:underline">
                        click here
                    </a>
                </p>
            </div>
        </div>
    );
}
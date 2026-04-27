const url = import.meta.env.VITE_API_URL;

if (!url && import.meta.env.PROD) {
    // Fail loudly in the browser console if the production build was shipped
    // without the API URL baked in, so the symptom is obvious instead of a
    // silent fallback to localhost.
    // eslint-disable-next-line no-console
    console.error(
        'VITE_API_URL is not set in this production build. ' +
        'Set VITE_API_URL in your Vercel project environment variables and redeploy.'
    );
}

export const API_BASE_URL = url || 'http://localhost:5000';

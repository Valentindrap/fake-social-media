import admin from 'firebase-admin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { tokens, title, body, icon, data } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
        return res.status(400).json({ error: 'Tokens are required' });
    }

    try {
        // Initialize Admin SDK if not already initialized
        if (!admin.apps.length) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }

        const message = {
            notification: {
                title,
                body,
            },
            tokens,
            data: data || {},
            webpush: {
                notification: {
                    icon: icon || '/logo.png',
                }
            }
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        return res.status(200).json({
            success: true,
            responses: response.responses,
            successCount: response.successCount,
            failureCount: response.failureCount
        });
    } catch (error) {
        console.error('Error sending push notification:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}

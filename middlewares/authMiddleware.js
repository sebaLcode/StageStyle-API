const admin = require('firebase-admin');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                mensaje: 'Acceso denegado. No se proporcionó un token válido.'
            });
        }
        const token = authHeader.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Error de autenticación:", error);
        return res.status(403).json({
            mensaje: 'Token inválido o expirado.',
            error: error.message
        });
    }
};

const checkRole = (allowedRoles) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(500).json({ mensaje: 'Error: Usuario no identificado.' });
        }

        try {

            const db = admin.firestore();
            const userDoc = await db.collection('users').doc(req.user.uid).get();

            if (!userDoc.exists) {
                return res.status(403).json({ mensaje: 'Usuario no registrado en base de datos.' });
            }

            const userData = userDoc.data();
            const userRole = userData.role || 'Cliente';

            if (allowedRoles.includes(userRole)) {
                next();
            } else {
                res.status(403).json({ mensaje: `Acceso denegado. Se requiere rol: ${allowedRoles.join(', ')}` });
            }

        } catch (error) {
            console.error("Error al verificar el rol:", error);
            res.status(500).json({ mensaje: 'Error interno al validar permisos.' });
        }
    };
};

module.exports = { verifyToken, checkRole };
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin')
const { verifyToken, checkRole } = require('./middlewares/authMiddleware');
const app = express();
const PORT = process.env.PORT || 4000;
//Configuración de Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'StageStyle API',
            version: '1.0.0',
            description: 'Documentación de la API de StageStyle',
            contact: {
                name: 'Soporte StageStyle',
            },
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Servidor Local',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./index.js'],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Configuración de Firebase
const serviceAccount = require('./config/api-stagestyle-firebase-adminsdk-fbsvc-fbaefe5a98.json')
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
// const db = admin.database();

app.use(express.json());
app.use(cors());

// ======= Rutas de la API =======

app.get('/', (req, res) => {
    res.send('API de StageStyle v1.0');
});


// ======= CRUD de Productos =======
// --- Obtener todos los productos ---
// Además se puede utilzar para filtrar por categoría /productos?categoria=Hoodie
/**
 * @swagger
 * /productos:
 *   get:
 *     summary: Obtener todos los productos
 *     tags:
 *       - Productos
 *     parameters:
 *       - in: query
 *         name: categoria
 *         schema:
 *           type: string
 *         description: Filtrar por categoría
 *     responses:
 *       200:
 *         description: Lista de productos
 */
app.get('/productos', async (req, res) => {
    const categoria = req.query.categoria;

    try {
        let ref = db.collection('productos');

        if (categoria) {
            ref = ref.where('category', '==', categoria);
        }

        const productosSnapshot = await ref.get();

        const productos = productosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(productos);

    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener productos', error });
    }
});

// --- Obtener producto por id ---
/**
 * @swagger
 * /productos/{id}:
 *   get:
 *     summary: Obtener producto por ID
 *     tags:
 *       - Productos
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Producto encontrado
 *       404:
 *         description: Producto no encontrado
 */
app.get('/productos/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const productoDoc = await db.collection('productos').doc(id).get();
        if (productoDoc.exists) {
            res.json(productoDoc.data());
        } else {
            res.status(404).json({ mensaje: 'Producto no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener producto', error });
    }
});

// --- Crear producto ---
// Solo admin puede
/**
 * @swagger
 * /productos:
 *   post:
 *     summary: Crear un nuevo producto
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *       400:
 *         description: Datos inválidos
 */
app.post('/productos', verifyToken, checkRole(['Administrador']), async (req, res) => {
    try {
        const {
            id,
            badge,
            image,
            title,
            description,
            details,
            sizes = [],
            price,
            originalPrice,
            category
        } = req.body;

        if (title === undefined || title === null) {
            return res.status(400).json({ mensaje: "El título del producto es obligatorio" });
        }
        if (typeof title !== "string") {
            return res.status(400).json({ mensaje: "El título debe ser texto" });
        }
        if (title.trim().length === 0) {
            return res.status(400).json({ mensaje: "El título no puede estar vacío" });
        }
        if (title.length > 100) {
            return res.status(400).json({ mensaje: "El título no puede exceder 100 caracteres" });
        }
        if (description && description.length > 500) {
            return res.status(400).json({ mensaje: "La descripción no puede exceder 500 caracteres" });
        }
        if (details && details.length > 300) {
            return res.status(400).json({ mensaje: "Los detalles no pueden exceder 300 caracteres" });
        }
        if (isNaN(price) || Number(price) < 0) {
            return res.status(400).json({ mensaje: "El precio debe ser un número positivo" });
        }
        if (originalPrice !== undefined && (isNaN(originalPrice) || Number(originalPrice) < 0)) {
            return res.status(400).json({ mensaje: "El precio original debe ser positivo" });
        }
        if (image && !/^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(image)) {
            return res.status(400).json({ mensaje: "La URL de imagen no es válida" });
        }
        if (!category || category.trim().length === 0) {
            return res.status(400).json({ mensaje: "La categoría es obligatoria" });
        }
        if (!Array.isArray(sizes)) {
            return res.status(400).json({ mensaje: "sizes debe ser un arreglo" });
        }
        if (id) {
            const exist = await db.collection("productos")
                .where("id", "==", id)
                .get();
            if (!exist.empty) {
                return res.status(400).json({ mensaje: "El ID ya existe" });
            }
        }
        const duplicateTitle = await db
            .collection('productos')
            .where('title', '==', title.trim())
            .get();

        if (!duplicateTitle.empty) {
            return res.status(400).json({
                mensaje: 'Ya existe un producto con este título'
            });
        }

        const duplicateImage = await db
            .collection('productos')
            .where('image', '==', image.trim())
            .get();

        if (!duplicateImage.empty) {
            return res.status(400).json({
                mensaje: 'Ya existe un producto con esta imagen'
            });
        }

        const nuevoProducto = {
            id: id || null,
            badge: badge || "",
            image: image || "",
            title: title.trim(),
            description: description || "",
            details: details || "",
            sizes,
            price: Number(price),
            originalPrice: originalPrice ? Number(originalPrice) : Number(price),
            category,
            createdAt: new Date()
        };

        let ref;
        if (id) {
            ref = db.collection("productos").doc(String(id));
            await ref.set(nuevoProducto);
        } else {
            ref = await db.collection("productos").add(nuevoProducto);
            await ref.update({ id: ref.id });
        }

        res.status(201).json({
            mensaje: "Producto creado correctamente.",
            id: ref.id,
            data: nuevoProducto
        });

    } catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            mensaje: "Error al crear producto",
            error: error.message
        });
    }
});


// --- Actualizar producto a partir de ID ---
// Solo admin puede
/**
 * @swagger
 * /productos/{id}:
 *   put:
 *     summary: Actualizar producto por ID
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Producto actualizado correctamente
 *       404:
 *         description: Producto no encontrado
 */
app.put('/productos/:id', verifyToken, checkRole(['Administrador']), async (req, res) => {
    const id = req.params.id;

    try {
        const productoRef = db.collection("productos").doc(id);
        const productoDoc = await productoRef.get();

        if (!productoDoc.exists) {
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        const {
            badge,
            image,
            title,
            description,
            details,
            sizes,
            price,
            originalPrice,
            category
        } = req.body;

        if (title !== undefined) {
            if (typeof title !== "string") {
                return res.status(400).json({ mensaje: "El título debe ser texto" });
            }
            if (title.trim().length === 0) {
                return res.status(400).json({ mensaje: "El título no puede estar vacío" });
            }
            if (title.length > 100) {
                return res.status(400).json({ mensaje: "El título no puede superar 100 caracteres" });
            }
            const duplicateTitle = await db.collection("productos")
                .where("title", "==", title.trim())
                .where(admin.firestore.FieldPath.documentId(), "!=", id)
                .get();

            if (!duplicateTitle.empty) {
                return res.status(400).json({
                    mensaje: "Ya existe otro producto con este título"
                });
            }
        }

        if (description !== undefined && description.length > 500) {
            return res.status(400).json({ mensaje: "La descripción no puede superar 500 caracteres" });
        }

        if (details !== undefined && details.length > 300) {
            return res.status(400).json({ mensaje: "Los detalles no pueden superar 300 caracteres" });
        }

        if (price !== undefined) {
            if (isNaN(price) || Number(price) < 0) {
                return res.status(400).json({ mensaje: "El precio debe ser un número positivo" });
            }
        }

        if (originalPrice !== undefined) {
            if (isNaN(originalPrice) || Number(originalPrice) < 0) {
                return res.status(400).json({ mensaje: "El precio original debe ser positivo" });
            }
        }

        if (image !== undefined) {
            if (image.trim() !== "" && !/^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(image)) {
                return res.status(400).json({ mensaje: "La URL de la imagen no es válida." });
            }

            const duplicateImage = await db.collection("productos")
                .where("image", "==", image.trim())
                .where(admin.firestore.FieldPath.documentId(), "!=", id)
                .get();

            if (!duplicateImage.empty) {
                return res.status(400).json({
                    mensaje: "Ya existe otro producto con esta imagen"
                });
            }
        }
        if (category !== undefined) {
            if (category.trim() === "") {
                return res.status(400).json({ mensaje: "La categoría es obligatoria" });
            }
        }
        if (sizes !== undefined && !Array.isArray(sizes)) {
            return res.status(400).json({ mensaje: "sizes debe ser un arreglo" });
        }
        const camposActualizar = {};

        if (badge !== undefined) camposActualizar.badge = badge;
        if (image !== undefined) camposActualizar.image = image.trim();
        if (title !== undefined) camposActualizar.title = title.trim();
        if (description !== undefined) camposActualizar.description = description;
        if (details !== undefined) camposActualizar.details = details;
        if (sizes !== undefined) camposActualizar.sizes = sizes;
        if (price !== undefined) camposActualizar.price = Number(price);
        if (originalPrice !== undefined) camposActualizar.originalPrice = Number(originalPrice);
        if (category !== undefined) camposActualizar.category = category;
        camposActualizar.updatedAt = new Date();

        await productoRef.update(camposActualizar);

        res.json({
            mensaje: "Producto actualizado correctamente.",
            id,
            data: camposActualizar
        });

    } catch (error) {
        console.error("Error PUT:", error);
        res.status(500).json({ mensaje: "Error al actualizar producto", error: error.message });
    }
});

// --- Eliminar producto a partir de ID ---
// Solo admin puede
/**
 * @swagger
 * /productos/{id}:
 *   delete:
 *     summary: Eliminar producto por ID
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID del producto
 *     responses:
 *       204:
 *         description: Producto eliminado correctamente
 *       404:
 *         description: Producto no encontrado
 */
app.delete('/productos/:id', verifyToken, checkRole(['Administrador']), async (req, res) => {
    const id = req.params.id;
    try {
        const productoRef = db.collection('productos').doc(id);
        const productoDoc = await productoRef.get();

        if (productoDoc.exists) {
            await productoRef.delete();
            res.status(204).send();
        } else {
            res.status(404).json({ mensaje: 'Producto no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar producto', error });
    }
});

// ====== Fin CRUD de Productos ======

// ====== Crear pedido=======
// --- Endpoint para crear una orden (Boleta) ---
/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Crear una nueva orden
 *     tags:
 *       - Ordenes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Orden creada exitosamente
 *       400:
 *         description: El carrito está vacío
 */
app.post('/orders', async (req, res) => {
    try {
        const { user, items, total, date } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ mensaje: "El carrito está vacío" });
        }

        const nuevaOrden = {
            user: user || "Invitado",
            items,
            total: Number(total),
            date: date || new Date().toISOString(),
            status: "Generada",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const ref = await db.collection('orders').add(nuevaOrden);

        res.status(201).json({
            mensaje: "Orden creada exitosamente",
            id: ref.id,
            order: nuevaOrden
        });

    } catch (error) {
        console.error("Error creando orden:", error);
        res.status(500).json({ mensaje: "Error al procesar la compra", error: error.message });
    }
});

// ====== Fin Crear pedido ======

// ==== Obtener todas las órdenes (Admin y Vendedor) ====
/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Obtener todas las órdenes
 *     tags:
 *       - Ordenes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de órdenes
 */
app.get('/orders', verifyToken, checkRole(['Administrador', 'Vendedor']), async (req, res) => {
    try {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();

        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()
        }));

        res.json(orders);

    } catch (error) {
        console.error("Error obteniendo órdenes:", error);
        res.status(500).json({ mensaje: "Error al obtener órdenes", error });
    }
});

// ==== Crear Usuario (Solo Admin) ====
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Datos inválidos
 */
app.post('/users', verifyToken, checkRole(['Administrador']), async (req, res) => {
    try {
        const {
            nombre, email, password, telefono, region, comuna, tipoUsuario
        } = req.body;

        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: nombre,
        });

        await db.collection('users').doc(userRecord.uid).set({
            nombre,
            email,
            telefono: telefono || "",
            region,
            comuna,
            role: tipoUsuario, // Aquí se define si es Vendedor, Admin o Cliente
            createdAt: new Date()
        });

        res.status(201).json({
            mensaje: `Usuario ${tipoUsuario} creado exitosamente`,
            uid: userRecord.uid
        });

    } catch (error) {
        console.error("Error creando usuario:", error);
        res.status(500).json({
            mensaje: "Error al crear usuario",
            error: error.message
        });
    }
});

// ==== Obtener todos los usuarios (Solo Admin y Vendedor) ====
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
app.get('/users', verifyToken, checkRole(['Administrador', 'Vendedor']), async (req, res) => {
    try {
        const snapshot = await db.collection('users').get();

        const usuarios = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            tipoUsuario: doc.data().role
        }));

        res.json(usuarios);

    } catch (error) {
        console.error("Error obteniendo usuarios:", error);
        res.status(500).json({ mensaje: "Error al obtener usuarios", error });
    }
});




app.listen(PORT, () => {
    console.log(`Servidor corriendo exitosamente en http://localhost:${PORT}`);
});
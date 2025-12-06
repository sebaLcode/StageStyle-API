# API de la aplicación StageStyle

## Inicialización de la API

 1. Se debe clonar el repositorio e instalar las dependencias necesarias.
 2. Dentro de la carpeta base crear un directorio config, dentro de config subir la credencial entregada por Firestore Database.
    <img width="369" height="68" alt="image" src="https://github.com/user-attachments/assets/e3f5fd8f-1e0e-40c8-9fd0-1184f78f5fff" />
 3. En la consola ejecutar npm run dev.
 4. Nuestra aplicación se abrira en el localhost:4000

## Endpoints
* localhost:4000/productos $\rightarrow$ Nos muestra todos los productos.
* localhost:4000/productos/elIdDelProducto $\rightarrow$ Nos muestra los datos de un producto a partir de su id.
* http://localhost:3000/productos?categoria=Hoodie $\rightarrow$ Nos muestra los productos que pertenecen a la categoría Hoodie, puede ser (Hoodie, Accesorio, Camiseta, Polera, Especial)

Se puede probar los create, update y delete mediante Postman si lo desea.

**Create**
* localhost:4000/productos

*Formato ejemplo:*
```
{
    "badge": "Kattesyes",
    "image": "https://stagestyle-images.s3.us-east-1.amazonaws.com/ToteKattesyes.png",
    "title": "Tote Porcelain",
    "description": "KATSEYE's debut EP, SIS.",
    "details": "Good chain fits for you.",
    "sizes": [],
    "price": 29990,
    "originalPrice": 34000,
    "category": "Accesorio"
}
```
**Update**
* localhost:4000/productos/elIdDelProducto

*Formato ejemplo (usando el mismo anterior):*
```
{
    "badge": "Kattesyessss",
    "image": "https://stagestyle-images.s3.us-east-1.amazonaws.com/ToteKattesyes.png",
    "title": "Tote Porcelana",
    "description": "KATSEYE's debut EP, SIS. Evento realizado en corea",
    "details": "Good chain fits for you and me.",
    "sizes": [],
    "price": 29990,
    "originalPrice": 34000,
    "category": "Accesorio"
}
```

**Delete**
* localhost:4000/productos/elIdDelProducto

##Swagger
Para acceder a la documentación de Swagger  debe ser mediante:
* http://localhost:4000/api-docs/

En autorize se debe ingresar el token del Administrador, que puede ser conseguido en:

Clic F12 -> Application -> Storage -> Local Storage -> userToken
<img width="1564" height="231" alt="image" src="https://github.com/user-attachments/assets/16faccb2-91b1-4ced-ad0f-e5a27945d2b0" />

Una vez ingresado el token, se puede realizar métodos POST, PUT y DELETE.

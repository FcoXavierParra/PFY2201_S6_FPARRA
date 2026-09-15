# Nexus Play — Lógica e interactividad con JavaScript

**Actividad Sumativa 2 (Semana 6)** — PFY2201 Desarrollo Frontend I, Duoc UC.
"Optimizando la lógica y rendimiento de una página web con JavaScript".

El mismo e-commerce de las semanas anteriores, ahora con **catálogo cargado por Fetch
API**, **carrito de compras** y **buscador**, sobre la maquetación responsiva de
Bootstrap 5.

## Estructura

```
├── index.html                    Página completa
└── assets/
    ├── js/app.js                 Lógica: DOM, eventos y fetch
    ├── css/estilos.css           Estilo propio sobre Bootstrap 5
    ├── img/                      Imágenes SVG (logo, banners y 9 portadas)
    └── data/productos.json       Fuente de datos local del catálogo
```

## Cómo verlo

**En línea:** <https://fcoxavierparra.github.io/PFY2201_S6_FPARRA/>

**En local:** conviene servir la carpeta por HTTP (por ejemplo con la extensión
*Live Server* de VS Code), porque `fetch` no funciona sobre el protocolo `file://`.
Aun así, el sitio **también carga abierto directamente desde el disco**: ver
[La fuente de datos](#la-fuente-de-datos-y-el-respaldo-por-url-absoluta).

Requiere conexión a internet, porque Bootstrap 5.3.8 viene del CDN.

## Lo que hace el JavaScript

| Funcionalidad | Técnica | Dónde |
|---|---|---|
| **Catálogo de productos** | Fetch API + `createElement` y `appendChild` | La sección llega vacía en el HTML; el script construye las 9 tarjetas con imagen, nombre y precio |
| **Carrito de compras** | evento `click` | El botón *Agregar al carrito* de cada tarjeta suma el producto y repinta el resumen: líneas, cantidades, subtotales y total |
| **Compra y boleta** | **modal** de Bootstrap + evento `submit` | *Finalizar compra* abre un modal con los datos de despacho; al confirmar muestra una **boleta simulada** con número de pedido, detalle y total, y deja el carrito vacío |
| **Buscador** | evento `submit` | Filtra el catálogo por nombre **sin recargar la página**, lleva la vista hasta los resultados y avisa si no hay coincidencias |
| **Filtro por categoría** | evento `click` | Dos categorías simuladas en la barra de navegación y las cinco de la sección *Categorías* |
| **Realce de tarjeta** | eventos `mouseover` y `mouseout` | Al pasar el cursor, la tarjeta se eleva y cambia de borde |
| **Validación del contacto** | evento `submit` | Valida los campos y muestra el resultado sin recargar |

### Organización del código

```
assets/js/app.js
├── RUTA_LOCAL / URL_RESPALDO   Las dos fuentes de datos
├── catalogo / carrito / vista  Estado de la aplicación
│
├── formatearFecha()            Utilidades reutilizables
├── formatearPrecio()
├── mostrarMensaje()            La comparten fetch, buscador y formularios
├── buscarProductoPorId()
├── irACatalogo()               Lleva la vista a los resultados
│
├── obtenerDatos()              fetch con respaldo
├── cargarCatalogo()            then / catch
├── crearTarjetaProducto()      Construye un <article> completo
├── pintarCatalogo()            Único punto que escribe en el catálogo
├── aplicarVista()              Combina categoría + búsqueda y repinta
│
├── agregarAlCarrito()          click
├── quitarDelCarrito()
├── vaciarCarrito()
├── crearLineaCarrito()
├── pintarResumenCarrito()      Repinta el área designada del carrito
├── calcularTotal()             El total vive en un solo sitio
├── configurarCarrito()         Delegación de eventos
│
├── pintarResumenCompra()       Detalle dentro del modal
├── validarCamposCompra()       Datos de despacho
├── generarNumeroPedido()
├── crearBoleta()               Construye la boleta simulada
├── reiniciarModalCompra()      Deja el modal listo para otra compra
├── configurarCompra()          submit + eventos del modal
│
├── buscarProductos()           submit
├── filtrarPorCategoria()       click
├── filtrarRanking()
├── marcarCategoriaActiva()
├── alternarRealce()            mouseover / mouseout
├── validarCamposContacto()     Devuelve la lista de errores
├── configurar*()               Registran los manejadores
└── iniciar()                   Punto de entrada
```

Cada función lleva un comentario que explica su propósito y su lugar en el flujo.
Las que evitan el código repetido son `pintarCatalogo()`, que es el **único** sitio
donde se escribe el catálogo y la usan por igual la carga inicial, el buscador y el
filtro; y `mostrarMensaje()`, que comparten el manejo de errores del `fetch`, el
buscador y la validación del formulario.

## La fuente de datos y el respaldo por URL absoluta

El catálogo se pide a un **archivo JSON local** del propio proyecto:

```js
const RUTA_LOCAL = "assets/data/productos.json";
```

Con un respaldo por URL absoluta si esa petición falla:

```js
const URL_RESPALDO = "https://fcoxavierparra.github.io/PFY2201_S6_FPARRA/assets/data/productos.json";
```

El motivo es concreto. `fetch` **no funciona sobre el protocolo `file://`**: si alguien
descomprime el proyecto y abre `index.html` desde su disco, la ruta relativa queda
bloqueada por CORS y el catálogo se quedaría vacío. GitHub Pages responde con la
cabecera `Access-Control-Allow-Origin: *`, así que el segundo intento sí carga. El
resultado funciona en los dos escenarios sin sacrificar que la fuente sea local.

Se eligió un JSON propio y no una API pública porque depender de un tercero añade un
punto de falla que no aporta nada al ejercicio.

### Manejo de errores

Si fallan **las dos** rutas, el catálogo muestra un aviso visible en lugar de quedarse
en blanco, y el detalle técnico queda en la consola. La comprobación incluye
`response.ok`, porque **`fetch` no rechaza la promesa ante un 404**: solo lo hace si
falla la red.

## Notas

- **El carrito usa delegación de eventos.** Los botones *Agregar al carrito* los crea el
  `fetch` después de cargar la página, así que no existen cuando se registran los
  manejadores. El `click` se escucha una sola vez sobre el contenedor del catálogo, que
  sí existe desde el principio. El realce por `mouseover` usa el mismo patrón sobre
  `<main>`.
- **El buscador y el filtro se combinan en un solo estado** (`vista`), de modo que no se
  pisan entre sí y hay un único punto por donde pasan todos los cambios de la vista.
- **Los formularios llevan `novalidate`** para que la validación la haga el script y no
  el navegador, y así poder mostrar un mensaje propio. Los atributos `required` y
  `type="email"` se conservan porque documentan la intención y el teclado del móvil los
  aprovecha.
- **Agregar dos veces el mismo producto no duplica la línea**: sube su cantidad, y el
  subtotal se recalcula.
- **El modal de compra se reinicia al cerrarse**, con el evento `hidden.bs.modal` que
  emite Bootstrap. Sin eso, la segunda compra se abriría mostrando la boleta anterior.
- **El `role="dialog"` del modal no es decorativo**: sin un rol propio, el validador del
  W3C rechaza el `aria-labelledby` sobre un `<div>`.
- **La compra es una simulación.** No hay servidor ni pasarela de pago: el número de
  pedido se genera en el navegador y la boleta solo refleja lo que había en el carrito.

## Validación W3C

Validado el 2026-09-15:

| Archivo | Validador | Resultado |
|---|---|---|
| `index.html` | Nu Html Checker | **0 errores, 0 advertencias** |
| `assets/css/estilos.css` | CSS Validator (jigsaw) | **0 errores, 0 avisos** |

/* ============================================================
   Nexus Play - Logica e interactividad con JavaScript
   PFY2201 Desarrollo Frontend I - Duoc UC
   Actividad Sumativa 2 (Semana 6): "Optimizando la logica y
   rendimiento de una pagina web con JavaScript"

   Bloques de funcionalidad:
     1. Catalogo de productos  -> Fetch API + createElement/appendChild
     2. Carrito de compras     -> evento click + resumen dinamico
     3. Compra y boleta        -> modal de Bootstrap + evento submit
     4. Buscador               -> evento submit
     5. Filtro de categorias   -> evento click
     6. Realce de tarjetas     -> eventos mouseover / mouseout
     7. Validacion del contacto-> evento submit

   Todo el codigo se organiza en funciones de una sola
   responsabilidad, que se registran al final en iniciar().
   ============================================================ */


/* ------------------------------------------------------------
   CONSTANTES Y ESTADO
   ------------------------------------------------------------ */

/* Fuente de datos LOCAL, como pide la actividad: un archivo JSON
   dentro del propio proyecto, pedido con ruta relativa. */
const RUTA_LOCAL = "assets/data/productos.json";

/* Respaldo por URL absoluta. Motivo: fetch NO funciona sobre el
   protocolo file://, asi que si alguien descomprime el proyecto y
   abre index.html directamente desde el disco, la ruta relativa de
   arriba falla. GitHub Pages responde con la cabecera
   Access-Control-Allow-Origin: *, de modo que esta URL si carga en
   ese escenario. Solo se intenta si la ruta local no dio resultado. */
const URL_RESPALDO = "https://fcoxavierparra.github.io/PFY2201_S6_FPARRA/assets/data/productos.json";

/* Catalogo completo tal como llego del JSON. Se guarda una sola vez
   para que el buscador y el filtro trabajen en memoria, sin volver a
   pedir el archivo en cada interaccion. */
let catalogo = [];

/* Lineas del carrito: { id, titulo, precio, cantidad } */
let carrito = [];

/* Que se esta mostrando ahora mismo en el catalogo. Las dos
   condiciones se combinan, asi el buscador no pierde la categoria
   elegida ni al reves. */
let vista = { categoria: "todas", busqueda: "" };


/* ------------------------------------------------------------
   UTILIDADES REUTILIZABLES
   ------------------------------------------------------------ */

/**
 * Convierte una fecha ISO (2026-10-03) al formato legible en espanol.
 * La usan las tarjetas de los titulos que aun no se han lanzado.
 * @param {string} iso - fecha en formato AAAA-MM-DD
 * @returns {string} fecha con el mes en palabras
 */
function formatearFecha(iso) {
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const partes = iso.split("-");
    // Number() quita el cero a la izquierda: "03" pasa a "3"
    const dia = Number(partes[2]);
    return dia + " de " + meses[Number(partes[1]) - 1] + " de " + partes[0];
}

/**
 * Da formato de precio en pesos chilenos.
 * @param {number} valor
 * @returns {string} por ejemplo "$34.990"
 */
function formatearPrecio(valor) {
    return "$" + valor.toLocaleString("es-CL");
}

/**
 * Muestra un mensaje dentro de un contenedor, con el estilo de
 * Bootstrap que corresponda. La comparten el manejo de errores del
 * fetch, el buscador y la validacion del formulario, para no repetir
 * el mismo bloque de codigo tres veces.
 * @param {HTMLElement} contenedor - donde se pinta el mensaje
 * @param {string} texto - el mensaje a mostrar
 * @param {string} tipo - "success", "danger", "warning" o "info"
 */
function mostrarMensaje(contenedor, texto, tipo) {
    contenedor.innerHTML = "";
    const aviso = document.createElement("div");
    aviso.className = "alert alert-" + tipo + " mb-0";
    aviso.setAttribute("role", "alert");
    aviso.textContent = texto;
    contenedor.appendChild(aviso);
}

/**
 * Busca un producto del catalogo por su identificador.
 * @param {number} id
 * @returns {Object|undefined} el producto, o undefined si no existe
 */
function buscarProductoPorId(id) {
    return catalogo.find(function (producto) {
        return producto.id === id;
    });
}

/**
 * Lleva la vista hasta el catalogo. El buscador y las categorias de la
 * barra de navegacion estan arriba del todo, lejos de los resultados:
 * sin esto el usuario filtra y no ve que haya pasado nada.
 * El hueco que deja la barra fija lo resuelve scroll-margin-top en la
 * hoja de estilos.
 */
function irACatalogo() {
    document.getElementById("productos").scrollIntoView({ behavior: "smooth" });
}


/* ------------------------------------------------------------
   1. CATALOGO - Fetch API y construccion del DOM
   ------------------------------------------------------------ */

/**
 * Pide el archivo de datos. Intenta primero la ruta local y, si esa
 * peticion falla -por estar abierto desde file:// o por un 404-,
 * reintenta una sola vez con la URL absoluta de respaldo.
 * Devuelve una promesa con el objeto ya convertido desde JSON.
 * @returns {Promise<Object>}
 */
function obtenerDatos() {
    return fetch(RUTA_LOCAL)
        .then(function (respuesta) {
            // fetch NO rechaza la promesa ante un 404: solo lo hace si
            // falla la red. Hay que comprobar response.ok a mano.
            if (!respuesta.ok) {
                throw new Error("HTTP " + respuesta.status);
            }
            return respuesta.json();
        })
        .catch(function () {
            return fetch(URL_RESPALDO).then(function (respuesta) {
                if (!respuesta.ok) {
                    throw new Error("HTTP " + respuesta.status);
                }
                return respuesta.json();
            });
        });
}

/**
 * Carga el catalogo con la Fetch API y lo pinta. Maneja las promesas
 * con then/catch:
 *   - then  -> guarda los productos en memoria y construye el DOM
 *   - catch -> muestra un aviso visible si ninguna de las dos rutas
 *              respondio, en lugar de dejar la seccion en blanco
 */
function cargarCatalogo() {
    const estado = document.getElementById("estadoCatalogo");

    obtenerDatos()
        .then(function (datos) {
            catalogo = datos.productos;
            aplicarVista();
        })
        .catch(function (error) {
            const contenedor = document.getElementById("listaProductos");
            estado.textContent = "";
            mostrarMensaje(contenedor,
                "No pudimos cargar el catálogo en este momento. " +
                "Revisa tu conexión y vuelve a intentarlo.",
                "danger");
            // Queda en la consola para diagnosticar, sin molestar al usuario
            console.error("Error al cargar el catálogo:", error);
        });
}

/**
 * Construye la tarjeta de un producto creando cada nodo con
 * createElement y ensamblandolos con appendChild. Devuelve el
 * elemento listo para insertar, sin tocar el documento: asi la
 * funcion es reutilizable y facil de probar.
 * @param {Object} producto - un objeto del arreglo "productos"
 * @returns {HTMLElement} la columna con la tarjeta dentro
 */
function crearTarjetaProducto(producto) {
    const columna = document.createElement("div");
    columna.className = "col-sm-6 col-lg-3 producto";
    columna.setAttribute("data-genero", producto.genero);

    const tarjeta = document.createElement("article");
    tarjeta.className = "card h-100";

    const imagen = document.createElement("img");
    imagen.src = producto.imagen;
    imagen.className = "card-img-top";
    imagen.alt = producto.alt;
    tarjeta.appendChild(imagen);

    const cuerpo = document.createElement("div");
    cuerpo.className = "card-body d-flex flex-column";

    const titulo = document.createElement("h3");
    titulo.className = "card-title h6 text-primary";
    titulo.textContent = producto.titulo;
    cuerpo.appendChild(titulo);

    const genero = document.createElement("p");
    genero.className = "mb-2";
    const etiqueta = document.createElement("span");
    etiqueta.className = "badge text-bg-secondary";
    etiqueta.textContent = producto.genero;
    genero.appendChild(etiqueta);
    cuerpo.appendChild(genero);

    const descripcion = document.createElement("p");
    descripcion.className = "card-text small text-body-secondary";
    descripcion.textContent = producto.descripcion;
    cuerpo.appendChild(descripcion);

    // Los titulos aun no publicados llevan su fecha de lanzamiento
    if (producto.lanzamiento) {
        const fecha = document.createElement("p");
        fecha.className = "card-text small text-body-secondary fst-italic";
        fecha.textContent = "Disponible el " + formatearFecha(producto.lanzamiento);
        cuerpo.appendChild(fecha);
    }

    // mt-auto empuja el precio y el boton al fondo de la tarjeta, para
    // que queden alineados entre tarjetas de distinto alto
    const precio = document.createElement("p");
    precio.className = "fw-bold fs-5 mb-2 mt-auto";
    precio.textContent = formatearPrecio(producto.precio);
    cuerpo.appendChild(precio);

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn btn-primary btn-sm boton-agregar";
    boton.setAttribute("data-id", producto.id);
    boton.textContent = "Agregar al carrito";
    cuerpo.appendChild(boton);

    tarjeta.appendChild(cuerpo);
    columna.appendChild(tarjeta);
    return columna;
}

/**
 * Vacia el contenedor del catalogo y lo repinta con la lista que
 * recibe. Es la unica funcion que escribe en #listaProductos: la
 * usan por igual la carga inicial, el buscador y el filtro de
 * categorias, de modo que la logica de pintado no se repite.
 * @param {Object[]} lista - los productos a mostrar
 */
function pintarCatalogo(lista) {
    const contenedor = document.getElementById("listaProductos");
    contenedor.innerHTML = "";

    lista.forEach(function (producto) {
        contenedor.appendChild(crearTarjetaProducto(producto));
    });
}

/**
 * Calcula que productos corresponden a la categoria y a la busqueda
 * activas, los pinta y actualiza el texto de estado. Es el punto
 * unico por donde pasan todos los cambios de la vista del catalogo.
 */
function aplicarVista() {
    const estado = document.getElementById("estadoCatalogo");
    const texto = vista.busqueda.toLowerCase();

    const visibles = catalogo.filter(function (producto) {
        const coincideCategoria = vista.categoria === "todas" ||
            producto.genero === vista.categoria;
        const coincideBusqueda = texto === "" ||
            producto.titulo.toLowerCase().indexOf(texto) !== -1;
        return coincideCategoria && coincideBusqueda;
    });

    pintarCatalogo(visibles);
    filtrarRanking(vista.categoria);

    if (visibles.length === 0) {
        estado.textContent = "No encontramos productos que coincidan con tu búsqueda.";
    } else if (vista.busqueda !== "") {
        estado.textContent = visibles.length + " resultado(s) para “" +
            vista.busqueda + "”.";
    } else if (vista.categoria !== "todas") {
        estado.textContent = "Mostrando " + visibles.length +
            " producto(s) de la categoría " + vista.categoria + ".";
    } else {
        estado.textContent = "Mostrando los " + visibles.length +
            " productos del catálogo.";
    }
}


/* ------------------------------------------------------------
   2. CARRITO DE COMPRAS - evento click y resumen dinamico
   ------------------------------------------------------------ */

/**
 * Agrega un producto al carrito. Si ya estaba, solo sube su cantidad,
 * para que el resumen no repita la misma linea dos veces.
 * @param {number} id - identificador del producto
 */
function agregarAlCarrito(id) {
    const producto = buscarProductoPorId(id);
    if (!producto) {
        return;
    }

    const linea = carrito.find(function (item) {
        return item.id === id;
    });

    if (linea) {
        linea.cantidad = linea.cantidad + 1;
    } else {
        carrito.push({
            id: producto.id,
            titulo: producto.titulo,
            precio: producto.precio,
            cantidad: 1
        });
    }

    pintarResumenCarrito();
}

/**
 * Quita UNA unidad de un producto, y la linea completa cuando la
 * cantidad llega a cero. Es lo que hace el boton "menos".
 * @param {number} id - identificador del producto
 */
function quitarUnaUnidad(id) {
    const linea = carrito.find(function (item) {
        return item.id === id;
    });
    if (!linea) {
        return;
    }

    linea.cantidad = linea.cantidad - 1;

    if (linea.cantidad <= 0) {
        eliminarDelCarrito(id);
        return;
    }

    pintarResumenCarrito();
}

/**
 * Saca del carrito la linea entera de un producto, sea cual sea su
 * cantidad. Es lo que hace el boton "Quitar".
 * @param {number} id - identificador del producto
 */
function eliminarDelCarrito(id) {
    carrito = carrito.filter(function (item) {
        return item.id !== id;
    });
    pintarResumenCarrito();
}

/**
 * Deja el carrito vacio de una vez.
 */
function vaciarCarrito() {
    carrito = [];
    pintarResumenCarrito();
}

/**
 * Crea uno de los botones de una linea del carrito. Los cuatro se
 * diferencian solo en clase, texto y descripcion accesible, asi que
 * armarlos aqui evita repetir el mismo bloque cuatro veces.
 * @param {string} clase - la clase que identifica la accion
 * @param {string} texto - lo que se ve en el boton
 * @param {number} id - identificador del producto
 * @param {string} etiqueta - descripcion para lectores de pantalla
 * @param {string} estilo - clase de color de Bootstrap
 * @returns {HTMLElement} el boton listo para insertar
 */
function crearBotonLinea(clase, texto, id, etiqueta, estilo) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn btn-sm " + estilo + " " + clase;
    boton.setAttribute("data-id", id);
    boton.setAttribute("aria-label", etiqueta);
    boton.textContent = texto;
    return boton;
}

/**
 * Construye una linea del resumen: titulo, subtotal, los controles
 * para ajustar la cantidad y el boton de quitar. Se separa de
 * pintarResumenCarrito() para que esa se ocupe solo de recorrer y
 * esta solo de armar el nodo.
 * @param {Object} item - una linea del carrito
 * @returns {HTMLElement} el <li> listo para insertar
 */
function crearLineaCarrito(item) {
    const fila = document.createElement("li");
    fila.className = "list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2";

    const descripcion = document.createElement("span");
    descripcion.textContent = item.titulo;
    fila.appendChild(descripcion);

    const derecha = document.createElement("span");
    derecha.className = "d-flex align-items-center gap-3";

    // Controles de cantidad: menos, el numero, mas
    const cantidad = document.createElement("span");
    cantidad.className = "btn-group btn-group-sm";
    cantidad.setAttribute("role", "group");
    cantidad.setAttribute("aria-label", "Cantidad de " + item.titulo);

    cantidad.appendChild(crearBotonLinea("boton-menos", "−", item.id,
        "Quitar una unidad de " + item.titulo, "btn-outline-secondary"));

    // El numero no es un boton: es la lectura del estado actual. Lleva
    // las clases del grupo para quedar alineado entre "menos" y "mas",
    // y la propia cantidad-actual para recuperar el contraste que
    // Bootstrap le quita a un boton deshabilitado.
    const numero = document.createElement("span");
    numero.className = "btn btn-sm btn-outline-secondary disabled cantidad-actual";
    numero.textContent = item.cantidad;
    cantidad.appendChild(numero);

    cantidad.appendChild(crearBotonLinea("boton-mas", "+", item.id,
        "Agregar una unidad de " + item.titulo, "btn-outline-secondary"));

    derecha.appendChild(cantidad);

    const subtotal = document.createElement("span");
    subtotal.className = "text-body-secondary";
    subtotal.textContent = formatearPrecio(item.precio * item.cantidad);
    derecha.appendChild(subtotal);

    derecha.appendChild(crearBotonLinea("boton-quitar", "Quitar", item.id,
        "Quitar " + item.titulo + " del carrito", "btn-outline-danger"));

    fila.appendChild(derecha);
    return fila;
}

/**
 * Repinta por completo el area designada del carrito: la lista de
 * lineas, el total y el contador de la barra de navegacion. Se llama
 * despues de cada cambio, de modo que el resumen siempre refleja el
 * estado real del arreglo "carrito".
 */
function pintarResumenCarrito() {
    const contenedor = document.getElementById("resumenCarrito");
    const total = document.getElementById("totalCarrito");
    const contador = document.getElementById("contadorCarrito");

    contenedor.innerHTML = "";

    if (carrito.length === 0) {
        const vacio = document.createElement("p");
        vacio.className = "text-body-secondary mb-0";
        vacio.textContent = "Tu carrito está vacío. Agrega productos desde el catálogo.";
        contenedor.appendChild(vacio);
    } else {
        const lista = document.createElement("ul");
        lista.className = "list-group list-group-flush";
        carrito.forEach(function (item) {
            lista.appendChild(crearLineaCarrito(item));
        });
        contenedor.appendChild(lista);
    }

    const suma = calcularTotal();

    // reduce() recorre el arreglo acumulando un solo valor
    const unidades = carrito.reduce(function (acumulado, item) {
        return acumulado + item.cantidad;
    }, 0);

    total.textContent = formatearPrecio(suma);
    contador.textContent = unidades;

    // Con el carrito vacio no hay nada que vaciar ni que comprar
    const vacio = carrito.length === 0;
    document.getElementById("botonVaciar").disabled = vacio;
    document.getElementById("botonFinalizar").disabled = vacio;
}

/**
 * Suma el total del carrito. Se separa porque la necesitan el resumen,
 * el modal de compra y la boleta, y asi el calculo vive en un solo sitio.
 * @returns {number} el total en pesos
 */
function calcularTotal() {
    return carrito.reduce(function (acumulado, item) {
        return acumulado + item.precio * item.cantidad;
    }, 0);
}

/**
 * Registra los clics del carrito UNA sola vez sobre los contenedores,
 * y ahi averigua si el clic cayo en un boton. Se llama delegacion de
 * eventos, y aqui es imprescindible: los botones "Agregar al carrito"
 * los crea el fetch despues de cargar la pagina, asi que no existen
 * cuando se registran los manejadores.
 */
function configurarCarrito() {
    const catalogoNodo = document.getElementById("listaProductos");
    const resumenNodo = document.getElementById("resumenCarrito");
    const vaciar = document.getElementById("botonVaciar");

    catalogoNodo.addEventListener("click", function (evento) {
        const boton = evento.target.closest(".boton-agregar");
        if (boton) {
            agregarAlCarrito(Number(boton.getAttribute("data-id")));
        }
    });

    // Un solo manejador para los tres botones de cada linea: se mira
    // que clase tiene el boton pulsado y se llama a la accion que toca
    resumenNodo.addEventListener("click", function (evento) {
        const boton = evento.target.closest("button[data-id]");
        if (!boton) {
            return;
        }
        const id = Number(boton.getAttribute("data-id"));

        if (boton.classList.contains("boton-mas")) {
            agregarAlCarrito(id);
        } else if (boton.classList.contains("boton-menos")) {
            quitarUnaUnidad(id);
        } else if (boton.classList.contains("boton-quitar")) {
            eliminarDelCarrito(id);
        }
    });

    vaciar.addEventListener("click", vaciarCarrito);
}


/* ------------------------------------------------------------
   3. COMPRA Y BOLETA - modal de Bootstrap y evento submit
   ------------------------------------------------------------ */

/**
 * Pinta dentro del modal el detalle de lo que se va a comprar, para
 * que el usuario confirme sabiendo que lleva. Se llama cada vez que
 * el modal se abre, no al cargar la pagina, porque el carrito pudo
 * haber cambiado entremedio.
 */
function pintarResumenCompra() {
    const contenedor = document.getElementById("resumenCompra");
    contenedor.innerHTML = "";

    const titulo = document.createElement("p");
    titulo.className = "fw-bold mb-2";
    titulo.textContent = "Tu pedido";
    contenedor.appendChild(titulo);

    const lista = document.createElement("ul");
    lista.className = "list-unstyled small mb-2";

    carrito.forEach(function (item) {
        const linea = document.createElement("li");
        linea.className = "d-flex justify-content-between";

        const izquierda = document.createElement("span");
        izquierda.textContent = item.cantidad + " x " + item.titulo;
        linea.appendChild(izquierda);

        const derecha = document.createElement("span");
        derecha.className = "text-body-secondary";
        derecha.textContent = formatearPrecio(item.precio * item.cantidad);
        linea.appendChild(derecha);

        lista.appendChild(linea);
    });

    contenedor.appendChild(lista);

    const total = document.createElement("p");
    total.className = "d-flex justify-content-between fw-bold mb-0";
    const etiqueta = document.createElement("span");
    etiqueta.textContent = "Total a pagar";
    const valor = document.createElement("span");
    valor.className = "text-primary";
    valor.textContent = formatearPrecio(calcularTotal());
    total.appendChild(etiqueta);
    total.appendChild(valor);
    contenedor.appendChild(total);
}

/**
 * Comprueba los datos de despacho. Misma forma que la validacion del
 * formulario de contacto: devuelve la lista de errores y no toca el
 * DOM, para que quien la llame decida como mostrarlos.
 * @returns {string[]} lista de mensajes de error
 */
function validarCamposCompra() {
    const errores = [];
    const nombre = document.getElementById("compraNombre").value.trim();
    const correo = document.getElementById("compraCorreo").value.trim();
    const direccion = document.getElementById("compraDireccion").value.trim();

    if (nombre.length < 3) {
        errores.push("El nombre debe tener al menos 3 caracteres.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        errores.push("El correo electrónico no tiene un formato válido.");
    }
    if (direccion.length < 8) {
        errores.push("Indica una dirección de despacho completa.");
    }
    return errores;
}

/**
 * Genera un numero de pedido de demostracion, con el año y cuatro
 * digitos al azar. No hay servidor detras: es solo para que la boleta
 * se parezca a una de verdad.
 * @returns {string} por ejemplo "NP-2026-4817"
 */
function generarNumeroPedido() {
    const azar = Math.floor(Math.random() * 9000) + 1000;
    return "NP-" + new Date().getFullYear() + "-" + azar;
}

/**
 * Construye la boleta simulada con los datos de despacho y el detalle
 * del carrito. Devuelve el nodo listo para insertar; no lo inserta ni
 * vacia el carrito, de eso se ocupa quien la llama.
 * @param {Object} datos - { nombre, correo, direccion }
 * @returns {HTMLElement} el bloque de la boleta
 */
function crearBoleta(datos) {
    const bloque = document.createElement("div");

    const aviso = document.createElement("div");
    aviso.className = "alert alert-success";
    aviso.setAttribute("role", "alert");
    aviso.textContent = "¡Compra confirmada! Te enviamos el detalle a " + datos.correo + ".";
    bloque.appendChild(aviso);

    const cabecera = document.createElement("p");
    cabecera.className = "small text-body-secondary mb-1";
    cabecera.textContent = "Pedido " + generarNumeroPedido() + " · " +
        new Date().toLocaleDateString("es-CL");
    bloque.appendChild(cabecera);

    const destinatario = document.createElement("p");
    destinatario.className = "small mb-3";
    destinatario.textContent = datos.nombre + " — " + datos.direccion;
    bloque.appendChild(destinatario);

    // Tabla del detalle: aqui las columnas si tienen significado
    const tabla = document.createElement("table");
    tabla.className = "table table-sm align-middle";

    const cabeza = document.createElement("thead");
    const filaCabeza = document.createElement("tr");
    ["Producto", "Cantidad", "Subtotal"].forEach(function (texto) {
        const celda = document.createElement("th");
        celda.scope = "col";
        celda.textContent = texto;
        filaCabeza.appendChild(celda);
    });
    cabeza.appendChild(filaCabeza);
    tabla.appendChild(cabeza);

    const cuerpo = document.createElement("tbody");
    carrito.forEach(function (item) {
        const fila = document.createElement("tr");

        const nombre = document.createElement("td");
        nombre.textContent = item.titulo;
        fila.appendChild(nombre);

        const cantidad = document.createElement("td");
        cantidad.textContent = item.cantidad;
        fila.appendChild(cantidad);

        const subtotal = document.createElement("td");
        subtotal.textContent = formatearPrecio(item.precio * item.cantidad);
        fila.appendChild(subtotal);

        cuerpo.appendChild(fila);
    });
    tabla.appendChild(cuerpo);

    const pie = document.createElement("tfoot");
    const filaPie = document.createElement("tr");
    const etiqueta = document.createElement("th");
    etiqueta.scope = "row";
    etiqueta.colSpan = 2;
    etiqueta.textContent = "Total pagado";
    filaPie.appendChild(etiqueta);
    const valor = document.createElement("td");
    valor.className = "fw-bold text-primary";
    valor.textContent = formatearPrecio(calcularTotal());
    filaPie.appendChild(valor);
    pie.appendChild(filaPie);
    tabla.appendChild(pie);

    bloque.appendChild(tabla);
    return bloque;
}

/**
 * Devuelve el modal a su estado inicial: el formulario limpio y a la
 * vista, la boleta oculta y el boton de confirmar disponible otra vez.
 * Sin esto, la segunda compra abriria el modal mostrando la boleta
 * anterior.
 */
function reiniciarModalCompra() {
    document.getElementById("formCompra").reset();
    document.getElementById("mensajeCompra").innerHTML = "";
    document.getElementById("boleta").innerHTML = "";
    document.getElementById("boleta").hidden = true;
    document.getElementById("pasoDatos").hidden = false;
    document.getElementById("botonConfirmar").hidden = false;
}

/**
 * Registra el ciclo completo de la compra: al abrirse el modal pinta
 * el pedido; al enviarlo valida y, si todo esta correcto, muestra la
 * boleta y deja el carrito vacio; al cerrarse lo devuelve a su estado
 * inicial. Los eventos show.bs.modal y hidden.bs.modal los emite el
 * propio JavaScript de Bootstrap.
 */
function configurarCompra() {
    const modal = document.getElementById("modalCompra");
    const formulario = document.getElementById("formCompra");
    const mensaje = document.getElementById("mensajeCompra");

    modal.addEventListener("show.bs.modal", pintarResumenCompra);
    modal.addEventListener("hidden.bs.modal", reiniciarModalCompra);

    formulario.addEventListener("submit", function (evento) {
        evento.preventDefault(); // evita que la pagina se recargue

        const errores = validarCamposCompra();

        if (errores.length > 0) {
            mostrarMensaje(mensaje, errores.join(" "), "danger");
            return;
        }

        const boleta = document.getElementById("boleta");
        boleta.appendChild(crearBoleta({
            nombre: document.getElementById("compraNombre").value.trim(),
            correo: document.getElementById("compraCorreo").value.trim(),
            direccion: document.getElementById("compraDireccion").value.trim()
        }));

        // Se pasa del paso 1 al paso 2 dentro del mismo cuadro
        document.getElementById("pasoDatos").hidden = true;
        document.getElementById("botonConfirmar").hidden = true;
        boleta.hidden = false;

        // La boleta ya guarda el detalle, asi que el carrito se cierra
        vaciarCarrito();
    });
}


/* ------------------------------------------------------------
   4. BUSCADOR - evento submit
   ------------------------------------------------------------ */

/**
 * Guarda el texto buscado y repinta el catalogo con el resultado.
 * @param {string} texto - lo que escribio el usuario
 */
function buscarProductos(texto) {
    vista.busqueda = texto.trim();
    aplicarVista();
}

/**
 * Intercepta el envio del buscador para filtrar el catalogo sin
 * recargar la pagina. El formulario lleva novalidate para que la
 * respuesta la de este codigo y no el navegador.
 */
function configurarBuscador() {
    const formulario = document.getElementById("formBusqueda");
    const campo = document.getElementById("campoBusqueda");

    formulario.addEventListener("submit", function (evento) {
        evento.preventDefault(); // evita que la pagina se recargue
        buscarProductos(campo.value);
        irACatalogo();
    });
}


/* ------------------------------------------------------------
   5. FILTRO DE CATEGORIAS - evento click
   ------------------------------------------------------------ */

/**
 * Muestra u oculta los puestos del ranking segun la categoria
 * elegida, usando la clase d-none de Bootstrap. El ranking es
 * estatico en el HTML, asi que se filtra ocultando, no repintando.
 * @param {string} categoria - el genero a mostrar, o "todas"
 */
function filtrarRanking(categoria) {
    const puestos = document.querySelectorAll(".ranking li[data-genero]");

    puestos.forEach(function (puesto) {
        const coincide = categoria === "todas" ||
            puesto.getAttribute("data-genero") === categoria;
        puesto.classList.toggle("d-none", !coincide);
    });
}

/**
 * Guarda la categoria elegida, limpia la busqueda anterior para que
 * el resultado no quede vacio sin explicacion, y repinta.
 * @param {string} categoria - el genero a mostrar, o "todas"
 */
function filtrarPorCategoria(categoria) {
    vista.categoria = categoria;
    vista.busqueda = "";
    document.getElementById("campoBusqueda").value = "";
    aplicarVista();
    marcarCategoriaActiva(categoria);
}

/**
 * Deja marcado visualmente el boton de la categoria que se esta
 * viendo, en los dos sitios donde aparecen: la barra de navegacion y
 * la seccion de categorias.
 * @param {string} categoria - el genero activo
 */
function marcarCategoriaActiva(categoria) {
    const botones = document.querySelectorAll(".filtro-categoria");

    botones.forEach(function (boton) {
        const activo = boton.getAttribute("data-categoria") === categoria;
        boton.classList.toggle("activo", activo);
        boton.classList.toggle("active", activo);
    });
}

/**
 * Registra el click de cada boton de categoria. Estos botones si
 * existen en el HTML desde el principio, tanto los de la navbar como
 * los de la seccion de categorias, y comparten la misma clase.
 */
function configurarFiltroCategorias() {
    const botones = document.querySelectorAll(".filtro-categoria");
    const aviso = document.getElementById("avisoFiltro");

    botones.forEach(function (boton) {
        boton.addEventListener("click", function () {
            const categoria = boton.getAttribute("data-categoria");
            filtrarPorCategoria(categoria);

            if (categoria === "todas") {
                aviso.textContent = "Mostrando todo el catálogo.";
            } else {
                aviso.textContent = "Mostrando la categoría " + categoria + ".";
            }

            // Solo desde la barra de navegacion: los botones de la seccion
            // de categorias ya estan junto a su propio aviso
            if (boton.classList.contains("dropdown-item")) {
                irACatalogo();
            }
        });
    });
}


/* ------------------------------------------------------------
   6. REALCE DE TARJETAS - eventos mouseover / mouseout
   ------------------------------------------------------------ */

/**
 * Aplica o quita la clase de realce a una tarjeta. Se separa en una
 * funcion para que los dos eventos compartan la misma logica.
 * @param {HTMLElement} tarjeta
 * @param {boolean} activar
 */
function alternarRealce(tarjeta, activar) {
    tarjeta.classList.toggle("realce", activar);
}

/**
 * Registra mouseover y mouseout UNA sola vez sobre <main>, y ahi
 * averigua si el puntero entro en una tarjeta. Igual que el carrito,
 * usa delegacion para cubrir tambien las tarjetas que el fetch crea
 * despues, que no existian al cargar la pagina.
 */
function configurarRealceTarjetas() {
    const contenedor = document.querySelector("main");

    contenedor.addEventListener("mouseover", function (evento) {
        const tarjeta = evento.target.closest(".producto .card");
        if (tarjeta) {
            alternarRealce(tarjeta, true);
        }
    });

    contenedor.addEventListener("mouseout", function (evento) {
        const tarjeta = evento.target.closest(".producto .card");
        if (tarjeta) {
            alternarRealce(tarjeta, false);
        }
    });
}


/* ------------------------------------------------------------
   7. VALIDACION DEL FORMULARIO DE CONTACTO - evento submit
   ------------------------------------------------------------ */

/**
 * Comprueba los campos obligatorios y el formato del correo.
 * Devuelve un arreglo con los errores encontrados, vacio si todo
 * esta correcto. Se separa de la funcion que muestra el resultado
 * para que la validacion sea reutilizable.
 * @returns {string[]} lista de mensajes de error
 */
function validarCamposContacto() {
    const errores = [];
    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const mensaje = document.getElementById("mensaje").value.trim();

    if (nombre.length < 3) {
        errores.push("El nombre debe tener al menos 3 caracteres.");
    }
    // Comprobacion simple: texto, arroba, texto, punto, texto
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        errores.push("El correo electrónico no tiene un formato válido.");
    }
    if (mensaje.length < 10) {
        errores.push("El mensaje debe tener al menos 10 caracteres.");
    }
    return errores;
}

/**
 * Intercepta el envio del formulario, lo valida y muestra el
 * resultado sin recargar la pagina. El formulario lleva el atributo
 * novalidate para que la validacion la haga este codigo y no el
 * navegador, y asi poder mostrar un mensaje propio.
 */
function configurarValidacionFormulario() {
    const formulario = document.getElementById("formContacto");
    const contenedor = document.getElementById("mensajeFormulario");

    formulario.addEventListener("submit", function (evento) {
        evento.preventDefault(); // evita que la pagina se recargue

        const errores = validarCamposContacto();

        if (errores.length > 0) {
            mostrarMensaje(contenedor, errores.join(" "), "danger");
        } else {
            mostrarMensaje(contenedor,
                "Gracias por escribirnos. Te responderemos en menos de 24 horas hábiles.",
                "success");
            formulario.reset();
        }
    });
}


/* ------------------------------------------------------------
   ARRANQUE
   ------------------------------------------------------------ */

/**
 * Punto de entrada. Registra los manejadores de eventos, deja el
 * carrito pintado en su estado vacio y lanza la carga de datos
 * externos. El orden no importa: carrito y realce usan delegacion,
 * asi que ya cubren las tarjetas que el fetch cree despues.
 */
function iniciar() {
    configurarCarrito();              // click
    configurarCompra();               // submit, dentro del modal
    configurarBuscador();             // submit
    configurarFiltroCategorias();     // click
    configurarRealceTarjetas();       // mouseover / mouseout
    configurarValidacionFormulario(); // submit
    pintarResumenCarrito();           // estado inicial: carrito vacio
    cargarCatalogo();                 // Fetch API
}

// El script se ejecuta cuando el DOM ya esta disponible
document.addEventListener("DOMContentLoaded", iniciar);

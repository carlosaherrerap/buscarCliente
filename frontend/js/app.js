const API_URL = window.location.origin + '/api';

// Funciones de formateo
function formatearFecha(fecha) {
    if (!fecha) return '';
    // Si es una fecha ISO string, extraer solo la parte de fecha
    if (typeof fecha === 'string' && fecha.includes('T')) {
        return fecha.split('T')[0];
    }
    // Si es un objeto Date, formatear
    if (fecha instanceof Date) {
        return fecha.toISOString().split('T')[0];
    }
    // Si ya está en formato YYYY-MM-DD, devolverlo
    return fecha;
}

function formatearNumero(numero) {
    if (numero === null || numero === undefined || numero === '') return '';
    // Convertir a número
    const num = parseFloat(numero);
    if (isNaN(num)) return numero;
    // Detectar cuántos decimales tiene el número original
    const str = numero.toString();
    if (str.includes('.')) {
        const decimales = str.split('.')[1].length;
        return num.toFixed(decimales);
    }
    return num.toString();
}

// Navegación entre páginas
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// Modal helper
function showModal(title, message, type = 'success') {
    const modal = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalHeader = document.getElementById('modalHeader');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    if (type === 'error') {
        modalHeader.className = 'modal-header bg-danger text-white';
    } else {
        modalHeader.className = 'modal-header bg-success text-white';
    }
    
    modal.show();
}

// ========== PÁGINA PRINCIPAL ==========
document.getElementById('searchBtn').addEventListener('click', buscarCliente);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarCliente();
});

document.getElementById('importBtn').addEventListener('click', () => showPage('import-page'));
document.getElementById('pagosBtn').addEventListener('click', () => {
    cargarCarteras();
    cargarCampanas();
    cargarAsesores();
    showPage('pagos-page');
});
document.getElementById('rankingBtn').addEventListener('click', () => showPage('ranking-page'));

async function buscarCliente() {
    const searchInput = document.getElementById('searchInput');
    const searchType = document.querySelector('input[name="searchType"]:checked').value;
    const value = searchInput.value.trim();
    
    if (!value) {
        showModal('Error', 'Por favor ingrese un valor para buscar', 'error');
        return;
    }
    
    try {
        const params = new URLSearchParams();
        params.append('tipo', searchType);
        if (searchType === 'dni') {
            params.append('dni', value);
        } else {
            params.append('nombres', value);
        }
        
        const response = await fetch(`${API_URL}/clientes/buscar?${params}`);
        const data = await response.json();
        
        if (data.length === 0) {
            showModal('No encontrado', 'No se encontraron clientes con los criterios de búsqueda', 'error');
            return;
        }
        
        // Si hay múltiples resultados, tomar el primero o mostrar lista
        mostrarCliente(data[0]);
    } catch (error) {
        console.error('Error:', error);
        showModal('Error', 'Error al buscar cliente: ' + error.message, 'error');
    }
}

// Variable global para almacenar las cuentas del cliente
let todasLasCuentasCliente = [];

async function mostrarCliente(cliente) {
    // Guardar ID para uso interno (no mostrar en pantalla)
    window.currentClienteId = cliente.id;
    
    // Mostrar solo el nombre
    document.getElementById('clienteNombre').textContent = cliente.nombres || '-';
    
    // Guardar datos para modal
    document.getElementById('modalDNI').textContent = cliente.dni || '-';
    document.getElementById('modalDireccion').textContent = cliente.direccion || '-';
    document.getElementById('modalId').textContent = cliente.id || '-';
    
    // Limpiar spinners
    document.getElementById('clienteCarteraSelect').innerHTML = '<option value="">Seleccionar cartera</option>';
    document.getElementById('clienteCuenta').innerHTML = '<option value="">Seleccionar cuenta</option>';
    
    // Limpiar campos
    limpiarCamposCuenta();
    
    // Cargar carteras del cliente primero
    await cargarCarterasCliente(cliente.id);
    
    // Cargar todas las cuentas del cliente
    await cargarTodasLasCuentasCliente(cliente.id);
    
    showPage('cliente-page');
}

// Variable para evitar múltiples listeners
let carteraListenerAgregado = false;

async function cargarCarterasCliente(idCliente) {
    try {
        const response = await fetch(`${API_URL}/clientes/${idCliente}/carteras`);
        const carteras = await response.json();
        
        const select = document.getElementById('clienteCarteraSelect');
        select.innerHTML = '<option value="">Seleccionar cartera</option>';
        
        carteras.forEach((cartera) => {
            const option = document.createElement('option');
            option.value = cartera.id;
            option.textContent = `${cartera.nombre} (${cartera.tipo})`;
            option.dataset.cartera = JSON.stringify(cartera);
            select.appendChild(option);
        });
        
        // Agregar listener solo una vez
        if (!carteraListenerAgregado) {
            select.addEventListener('change', (e) => {
                const idCartera = e.target.value;
                if (idCartera) {
                    filtrarCuentasPorCartera(idCartera);
                } else {
                    // Si no hay cartera seleccionada, mostrar todas las cuentas
                    mostrarTodasLasCuentas();
                }
            });
            carteraListenerAgregado = true;
        }
    } catch (error) {
        console.error('Error al cargar carteras:', error);
    }
}

async function cargarTodasLasCuentasCliente(idCliente) {
    try {
        const response = await fetch(`${API_URL}/clientes/${idCliente}/cuentas`);
        todasLasCuentasCliente = await response.json();
        
        // Si no hay cartera seleccionada, mostrar todas las cuentas
        const carteraSeleccionada = document.getElementById('clienteCarteraSelect').value;
        if (!carteraSeleccionada) {
            mostrarTodasLasCuentas();
        } else {
            filtrarCuentasPorCartera(carteraSeleccionada);
        }
    } catch (error) {
        console.error('Error al cargar cuentas:', error);
    }
}

function mostrarTodasLasCuentas() {
    const select = document.getElementById('clienteCuenta');
    select.innerHTML = '<option value="">Seleccionar cuenta</option>';
    
    todasLasCuentasCliente.forEach((cuenta) => {
        const option = document.createElement('option');
        option.value = cuenta.id;
        option.textContent = cuenta.numero_cuenta;
        option.dataset.cuenta = JSON.stringify(cuenta);
        select.appendChild(option);
    });
    
    // Limpiar campos cuando se muestran todas las cuentas sin selección
    limpiarCamposCuenta();
}

function filtrarCuentasPorCartera(idCartera) {
    const select = document.getElementById('clienteCuenta');
    select.innerHTML = '<option value="">Seleccionar cuenta</option>';
    
    const cuentasFiltradas = todasLasCuentasCliente.filter(cuenta => cuenta.id_cartera == idCartera);
    
    cuentasFiltradas.forEach((cuenta) => {
        const option = document.createElement('option');
        option.value = cuenta.id;
        option.textContent = cuenta.numero_cuenta;
        option.dataset.cuenta = JSON.stringify(cuenta);
        select.appendChild(option);
    });
    
    // Limpiar campos cuando se filtra por cartera
    limpiarCamposCuenta();
}

function limpiarCamposCuenta() {
    document.getElementById('clienteSubCartera').value = '';
    document.getElementById('clienteProducto').value = '';
    document.getElementById('clienteCapital').value = '';
    document.getElementById('clienteDeudaTotal').value = '';
    document.getElementById('clienteCampana').value = '';
    document.getElementById('clienteFechaCastigo').value = '';
}

function mostrarCuentaSeleccionada(cuenta) {
    document.getElementById('clienteSubCartera').value = cuenta.sub_cartera || '';
    document.getElementById('clienteProducto').value = cuenta.producto || '';
    document.getElementById('clienteCapital').value = formatearNumero(cuenta.capital) || '0.00';
    document.getElementById('clienteDeudaTotal').value = formatearNumero(cuenta.deuda_total) || '0.00';
    document.getElementById('clienteCampana').value = cuenta.campana || '';
    document.getElementById('clienteFechaCastigo').value = formatearFecha(cuenta.fecha_castigo) || '';
}

// Agregar listener al spinner de cuentas (solo una vez, al cargar la página)
document.addEventListener('DOMContentLoaded', () => {
    const selectCuenta = document.getElementById('clienteCuenta');
    if (selectCuenta) {
        selectCuenta.addEventListener('change', (e) => {
            if (e.target.value) {
                const cuenta = JSON.parse(e.target.selectedOptions[0].dataset.cuenta);
                mostrarCuentaSeleccionada(cuenta);
            } else {
                limpiarCamposCuenta();
            }
        });
    }
});


// ========== VISTA DE IMPORTAR ==========
document.getElementById('backFromImport').addEventListener('click', () => showPage('main-page'));

document.getElementById('btnSelectClientes').addEventListener('click', () => {
    document.getElementById('fileClientes').click();
});

document.getElementById('fileClientes').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        document.getElementById('fileNameClientes').textContent = e.target.files[0].name;
        document.getElementById('btnSelectClientes').classList.add('d-none');
        document.getElementById('btnSaveClientes').classList.remove('d-none');
    }
});

document.getElementById('btnSaveClientes').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileClientes');
    if (!fileInput.files[0]) {
        showModal('Error', 'Por favor seleccione un archivo', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('archivo', fileInput.files[0]);
    
    try {
        const response = await fetch(`${API_URL}/importar/clientes`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showModal('Importación exitosa', `Se importaron ${data.registros} registros correctamente`);
            resetImportForm('clientes');
        } else {
            showModal('ERROR AL SUBIR', data.error || data.message || 'Error desconocido', 'error');
        }
    } catch (error) {
        showModal('ERROR AL SUBIR', 'No se estableció conexión con el servidor: ' + error.message, 'error');
    }
});

document.getElementById('btnSelectAsesores').addEventListener('click', () => {
    document.getElementById('fileAsesores').click();
});

document.getElementById('fileAsesores').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        document.getElementById('fileNameAsesores').textContent = e.target.files[0].name;
        document.getElementById('btnSelectAsesores').classList.add('d-none');
        document.getElementById('btnSaveAsesores').classList.remove('d-none');
    }
});

document.getElementById('btnSaveAsesores').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileAsesores');
    if (!fileInput.files[0]) {
        showModal('Error', 'Por favor seleccione un archivo', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('archivo', fileInput.files[0]);
    
    try {
        const response = await fetch(`${API_URL}/importar/asesores`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showModal('Importación exitosa', `Se importaron ${data.registros} registros correctamente`);
            resetImportForm('asesores');
        } else {
            showModal('ERROR AL SUBIR', data.error || data.message || 'Error desconocido', 'error');
        }
    } catch (error) {
        showModal('ERROR AL SUBIR', 'No se estableció conexión con el servidor: ' + error.message, 'error');
    }
});

function resetImportForm(tipo) {
    if (tipo === 'clientes') {
        document.getElementById('fileClientes').value = '';
        document.getElementById('fileNameClientes').textContent = '';
        document.getElementById('btnSelectClientes').classList.remove('d-none');
        document.getElementById('btnSaveClientes').classList.add('d-none');
    } else {
        document.getElementById('fileAsesores').value = '';
        document.getElementById('fileNameAsesores').textContent = '';
        document.getElementById('btnSelectAsesores').classList.remove('d-none');
        document.getElementById('btnSaveAsesores').classList.add('d-none');
    }
}

// ========== VISTA DE PAGOS ==========
document.getElementById('backFromPagos').addEventListener('click', () => showPage('main-page'));

document.getElementById('tipoFecha').addEventListener('change', (e) => {
    const fechaFin = document.getElementById('fechaFin');
    if (e.target.value === 'rango') {
        fechaFin.disabled = false;
    } else {
        fechaFin.disabled = true;
        fechaFin.value = '';
    }
});

async function cargarCarteras() {
    try {
        const response = await fetch(`${API_URL}/clientes/carteras/lista`);
        const carteras = await response.json();
        
        const select = document.getElementById('spinnerCartera');
        select.innerHTML = '<option value="">Todas las carteras</option>';
        carteras.forEach(cartera => {
            const option = document.createElement('option');
            option.value = cartera.id;
            option.textContent = `${cartera.nombre} (${cartera.tipo})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar carteras:', error);
    }
}

async function cargarCampanas() {
    try {
        const response = await fetch(`${API_URL}/clientes/campanas/lista`);
        const campanas = await response.json();
        
        const select = document.getElementById('spinnerCampana');
        select.innerHTML = '<option value="">Todas las campañas</option>';
        campanas.forEach(campana => {
            const option = document.createElement('option');
            option.value = campana;
            option.textContent = campana;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar campañas:', error);
    }
}

async function cargarAsesores() {
    try {
        const response = await fetch(`${API_URL}/asesores`);
        const asesores = await response.json();
        
        const select = document.getElementById('spinnerAsesor');
        select.innerHTML = '<option value="">Todos los asesores</option>';
        asesores.forEach(asesor => {
            const option = document.createElement('option');
            option.value = asesor.id;
            option.textContent = `${asesor.nombre} (${asesor.dni})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar asesores:', error);
    }
}

document.getElementById('btnAplicarFiltros').addEventListener('click', async () => {
    const filtros = obtenerFiltrosPagos();
    
    try {
        const response = await fetch(`${API_URL}/reportes/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filtros)
        });
        
        const data = await response.json();
        document.getElementById('totalRegistros').textContent = data.length;
    } catch (error) {
        console.error('Error:', error);
        showModal('Error', 'Error al aplicar filtros: ' + error.message, 'error');
    }
});

document.getElementById('btnDescargarPagos').addEventListener('click', async () => {
    const filtros = obtenerFiltrosPagos();
    
    try {
        const response = await fetch(`${API_URL}/reportes/pagos/descargar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filtros)
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pagos.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            const data = await response.json();
            showModal('Error', data.error || 'Error al descargar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showModal('Error', 'Error al descargar: ' + error.message, 'error');
    }
});

function obtenerFiltrosPagos() {
    return {
        tipo_fecha: document.getElementById('tipoFecha').value,
        fecha_inicio: document.getElementById('fechaInicio').value,
        fecha_fin: document.getElementById('fechaFin').value,
        cartera: document.getElementById('spinnerCartera').value,
        campana: document.getElementById('spinnerCampana').value,
        id_asesor: document.getElementById('spinnerAsesor').value,
        filtro_cartera: document.getElementById('checkCartera').checked,
        filtro_campana: document.getElementById('checkCampana').checked,
        filtro_asesor: document.getElementById('checkAsesor').checked
    };
}

// ========== VISTA DE RANKING ==========
document.getElementById('backFromRanking').addEventListener('click', () => showPage('main-page'));

document.getElementById('tipoFechaRanking').addEventListener('change', (e) => {
    const fechaFin = document.getElementById('fechaFinRanking');
    if (e.target.value === 'rango') {
        fechaFin.disabled = false;
    } else {
        fechaFin.disabled = true;
        fechaFin.value = '';
    }
});

document.getElementById('btnAplicarRanking').addEventListener('click', async () => {
    const searchType = document.querySelector('input[name="searchTypeRanking"]:checked').value;
    const searchValue = document.getElementById('searchInputRanking').value.trim();
    
    if (!searchValue) {
        showModal('Error', 'Por favor ingrese DNI o nombre del asesor', 'error');
        return;
    }
    
    const filtros = {
        tipo: searchType,
        tipo_fecha: document.getElementById('tipoFechaRanking').value,
        fecha_inicio: document.getElementById('fechaInicioRanking').value,
        fecha_fin: document.getElementById('fechaFinRanking').value
    };
    
    if (searchType === 'dni') {
        filtros.dni = searchValue;
    } else {
        filtros.nombres = searchValue;
    }
    
    try {
        const response = await fetch(`${API_URL}/reportes/ranking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filtros)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('totalPagos').textContent = parseFloat(data.total_pagos).toFixed(2);
            document.getElementById('totalMetas').textContent = parseFloat(data.total_metas).toFixed(2);
            document.getElementById('totalClientes').textContent = data.total_clientes;
            document.getElementById('rate').textContent = parseFloat(data.rate).toFixed(2) + '%';
        } else {
            showModal('Error', data.error || 'Error al obtener ranking', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showModal('Error', 'Error al obtener ranking: ' + error.message, 'error');
    }
});

document.getElementById('searchBtnRanking').addEventListener('click', () => {
    document.getElementById('btnAplicarRanking').click();
});

// ========== VISTA DE CLIENTE ==========
document.getElementById('backFromCliente').addEventListener('click', () => showPage('main-page'));

document.getElementById('btnVerInfoPersonal').addEventListener('click', () => {
    const modal = new bootstrap.Modal(document.getElementById('modalInfoPersonal'));
    modal.show();
});

document.getElementById('btnDescargarCliente').addEventListener('click', async () => {
    const idCliente = window.currentClienteId;
    
    if (!idCliente) {
        showModal('Error', 'No hay cliente seleccionado', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/reportes/cliente-asignacion/descargar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cliente: idCliente })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cliente_${idCliente}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            const data = await response.json();
            showModal('Error', data.error || 'Error al descargar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showModal('Error', 'Error al descargar: ' + error.message, 'error');
    }
});

// Búsqueda de asesor
let asesoresList = [];
document.getElementById('inputAsesor').addEventListener('input', async (e) => {
    const value = e.target.value.trim();
    const list = document.getElementById('asesorList');
    
    if (value.length < 2) {
        list.classList.add('d-none');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/asesores/buscar?tipo=nombres&nombres=${encodeURIComponent(value)}`);
        asesoresList = await response.json();
        
        list.innerHTML = '';
        if (asesoresList.length === 0) {
            list.classList.add('d-none');
            return;
        }
        
        asesoresList.forEach(asesor => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'list-group-item list-group-item-action';
            item.textContent = `${asesor.nombre} (${asesor.dni})`;
            item.addEventListener('click', () => {
                document.getElementById('inputAsesor').value = asesor.nombre;
                document.getElementById('idAsesor').value = asesor.id;
                list.classList.add('d-none');
            });
            list.appendChild(item);
        });
        
        list.classList.remove('d-none');
    } catch (error) {
        console.error('Error al buscar asesor:', error);
    }
});

// Ocultar lista al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('#inputAsesor') && !e.target.closest('#asesorList')) {
        document.getElementById('asesorList').classList.add('d-none');
    }
});

// Formulario de asignar
document.getElementById('formAsignar').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const idCliente = document.getElementById('clienteId').value;
    const idAsesor = document.getElementById('idAsesor').value;
    const importe = document.getElementById('importe').value;
    const fechaPago = document.getElementById('fechaPago').value;
    const tipoPago = document.getElementById('tipoPago').value;
    const voucher = document.getElementById('voucher').files[0];
    
    if (!idAsesor) {
        showModal('Error', 'Por favor seleccione un asesor', 'error');
        return;
    }
    
    const idCuenta = document.getElementById('clienteCuenta').value;
    if (!idCuenta) {
        showModal('Error', 'Por favor seleccione una cuenta', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('id_cuenta', idCuenta);
    formData.append('id_asesor', idAsesor);
    formData.append('importe', importe);
    formData.append('fecha_pago', fechaPago);
    formData.append('tipo_pago', tipoPago);
    if (voucher) {
        formData.append('voucher', voucher);
    }
    
    try {
        const response = await fetch(`${API_URL}/asignaciones`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showModal('Éxito', 'Asignación guardada correctamente');
            document.getElementById('formAsignar').reset();
            document.getElementById('idAsesor').value = '';
            document.getElementById('inputAsesor').value = '';
            // Mostrar botón de descargar después de guardar
            document.getElementById('btnDescargarCliente').style.display = 'inline-block';
        } else {
            showModal('Error', data.error || 'Error al guardar asignación', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showModal('Error', 'Error al guardar: ' + error.message, 'error');
    }
});

document.getElementById('btnCancelarAsignar').addEventListener('click', () => {
    document.getElementById('formAsignar').reset();
    document.getElementById('idAsesor').value = '';
});



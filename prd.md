Documento de Requisitos del Proyecto (PRD): Simulador de Procesos de Producción
1. Descripción General del Sistema
Aplicación web diseñada para la simulación multijugador en tiempo real de procesos de producción y gestión financiera. Permite la administración de sesiones académicas donde los estudiantes forman empresas, gestionan presupuestos iniciales, firman contratos de producción, adquieren materia prima, solicitan créditos y entregan productos físicos. El sistema registra cada interacción en un libro mayor inmutable para la generación automática de reportes financieros y recolección de datos para investigación académica.

2. Arquitectura y Stack Tecnológico
Frontend: Astro con arquitectura de islas (React).

Gestor de Paquetes y Entorno: Bun.

Base de Datos y Autenticación: Supabase (PostgreSQL, Supabase Auth).

Motor de Tiempo Real: Supabase Realtime (WebSockets sobre PostgreSQL WAL).

Almacenamiento de Archivos: Cloudflare R2 (compatible con API S3) para PDFs e imágenes.

Generación de Documentos: jspdf en el cliente.

Visualización de Datos: Recharts (gráficas de líneas/barras) y Apache ECharts (gráficas radiales/araña).

Estilos: Tailwind CSS.

3. Perfiles de Usuario
3.1. Profesor (Administrador)
Gestión de plantillas base de simulación (definición de productos, precios, presupuestos).

Creación y control de sesiones en vivo (generación de códigos de acceso).

Control manual del estado de la sesión (máquina de estados).

Aprobación de contratos y auditoría de préstamos.

Registro de evaluaciones físicas (calidad y cantidad entregada).

3.2. Estudiante (Empresa)
Acceso mediante código de sesión unívoco.

Creación de equipos (empresas).

Generación y firma digital de contratos de producción.

Ejecución de compras en tiempo real.

Solicitud de créditos bancarios.

Visualización de inventario, saldo y reportes de rendimiento.

4. Máquina de Estados de la Sesión
La aplicación restringe el acceso a los módulos dependiendo de la fase activa de la sesión:

ESPERA: Los estudiantes ingresan el código y conforman los equipos. Interacciones financieras bloqueadas.

PLANIFICACIÓN: Los equipos elaboran su estrategia, definen cantidades a producir, precios de venta y firman el contrato.

PRODUCCIÓN: Habilitación del Módulo Financiero, Bodega y Banco. Ejecución de compras de inventario y emisión de créditos.

EVALUACIÓN: Bloqueo de transacciones financieras y compras. Los equipos entregan el producto físico. El profesor ingresa métricas de calidad y cantidad al sistema.

FINALIZADO: Cierre definitivo de la sesión. Cálculo automático de saldos finales y despliegue del dashboard de resultados para todos los usuarios.

5. Especificación de Módulos Funcionales
5.1. Módulo de Contratos
Entrada: Formulario de cantidad prometida y precio unitario acordado.

Procesamiento: Generación en el cliente de un documento PDF detallando los términos, equipo, fecha y sesión.

Salida: Carga del PDF vía URL prefirmada a Cloudflare R2. Almacenamiento de la URL pública en el registro del equipo.

5.2. Módulo Financiero (Libro Mayor)
Arquitectura: Sistema de doble entrada simplificado. El saldo no es un valor estático, es la sumatoria de la tabla de transacciones.

Tipos de Transacción: Presupuesto inicial, compra de material, desembolso de préstamo, pago de préstamo, pago de intereses, venta de producto, penalización.

Validación: Restricción a nivel de base de datos (PostgreSQL) para evitar saldos negativos no autorizados durante la compra de materiales.

5.3. Módulo de Bodega e Inventario
Catálogo: Lista de materiales e insumos atada a la plantilla de juego actual (ej. hojas, tijeras).

Procesamiento de Compra: Al ejecutar una compra, el sistema realiza dos operaciones atómicas:

Inserción de transacción negativa en el Libro Mayor.

Incremento (o creación) del registro de cantidad en el inventario del equipo.

5.4. Módulo Bancario
Solicitud: Creación de registro de préstamo con monto y tasa de interés, en estado PENDIENTE.

Aprobación: Cambio de estado a APROBADO por el Profesor/Banquero, lo que dispara la inserción del monto positivo en el Libro Mayor.

Cobro: Deducción automática del capital más intereses al pasar al estado EVALUACION.

5.5. Módulo de Evaluación
Entrada del Profesor: Formulario de verificación de entrega (Cantidad entregada, Cantidad aprobada, Puntuación de calidad, Notas).

Ejecución Financiera: La aprobación dispara las transacciones de ingreso por ventas y deducciones por penalización (si la cantidad entregada es menor a la contratada en el Módulo de Contratos).

5.6. Módulo de Analítica y Dashboards
Leaderboard: Tabla de posiciones ordenada por utilidad neta descendente.

Flujo de Efectivo: Gráfica de líneas. Eje X: Tiempo (timestamps de las transacciones). Eje Y: Saldo acumulado.

Punto de Equilibrio: Gráfica de intersección entre costos fijos/variables acumulados e ingresos proyectados.

Mapa de Araña (Radar): Visualización de 4 variables normalizadas:

Productividad: (Cantidad Entregada / Cantidad Prometida).

Eficiencia: (Material Utilizado / Material Comprado).

Calidad: (Puntuación asignada en la evaluación).

ROI: ((Utilidad Neta / Inversión Total) * 100).

6. Modelado de Datos (Esquema Central)
profiles: Identidad y rol (Profesor/Estudiante).

game_templates: Configuración base (Nombre, presupuesto inicial).

template_items: Catálogo de materiales y precios por plantilla.

sessions: Instancias de juego en vivo, estado actual, código de acceso.

teams: Agrupaciones de estudiantes por sesión.

contracts: Términos de producción y URL del PDF en R2.

loans: Registro de préstamos, tasas y estados de aprobación.

ledger_transactions: Registro inmutable de flujo de dinero (Monto, Tipo, Fecha).

team_inventory: Cantidad de ítems poseídos por cada equipo en tiempo real.

evaluations: Registro de auditoría final (Cantidad entregada, calidad).

7. Requisitos No Funcionales
Exportación de Datos: Capacidad de consultar y exportar la tabla ledger_transactions de sesiones finalizadas en formato CSV o JSON para análisis en herramientas de ciencia de datos de terceros.

Latencia: Las actualizaciones de saldo e inventario en las pantallas de los estudiantes deben reflejarse en menos de 500ms tras una transacción exitosa.

Responsividad: Interfaz de Estudiante optimizada para pantallas móviles (Mobile-first). Interfaz de Profesor optimizada para Desktop/Tablet.

Seguridad: Implementación de Row Level Security (RLS) en Supabase para asegurar que los estudiantes solo puedan leer y escribir datos pertenecientes a su propio team_id.
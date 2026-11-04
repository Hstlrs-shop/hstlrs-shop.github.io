# TallerFlow

Aplicación web para que los talleres mecánicos optimicen su logística: el recorrido de cada vehículo, los repuestos, las compras y la carga de trabajo del equipo.

## Cómo usarla

Abre `index.html` en el navegador. No necesita instalación, servidor ni conexión. Los datos se guardan en el navegador (localStorage); desde **Ajustes** puedes exportarlos o importarlos en JSON. Al abrirla por primera vez trae datos de ejemplo.

## Módulos

- **Panel**: indicadores del día (órdenes activas, bahías ocupadas, atrasos, órdenes bloqueadas por repuestos, stock bajo) y alertas.
- **Órdenes de trabajo**: tablero kanban (Recepción → Diagnóstico → Esperando repuestos → En reparación → Control de calidad → Listo → Entregado). Las tarjetas se arrastran entre columnas o se cambian con el selector.
  - Cada orden lleva los repuestos que necesita. Al pasar a *En reparación* se retiran del inventario; si falta stock, la orden pasa sola a *Esperando repuestos*.
- **Planificación**: estado de cada bahía, horas asignadas a cada mecánico frente a su capacidad (8 h/día), cola de trabajo ordenada por atraso, prioridad y fecha, y lista de entregas pendientes. **Auto-asignar** reparte las órdenes sin mecánico al que tiene menos carga y asigna bahías libres.
- **Inventario**: stock, reservado (comprometido en órdenes abiertas), disponible, mínimo, en camino y ubicación en el estante. Ajustes de entrada, salida o conteo físico.
- **Compras**: reposición sugerida y agrupada por proveedor (cubre las reservas y el stock mínimo, descontando lo que ya viene en camino). Genera la orden de compra con un clic; al recibirla, el stock se actualiza y la app avisa qué órdenes ya pueden pasar a reparación.
- **Ajustes**: mecánicos, bahías, proveedores (con días de entrega) y copia de seguridad.

## Reparto de repuestos

El stock se asigna primero a las órdenes de prioridad alta y, entre ellas, a la de fecha de entrega más cercana. Así se ve de antemano qué trabajos quedarán bloqueados.

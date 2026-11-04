# Hstlrs
Tienda de ropa

---

## 🇲🇽 CDMX Roleplay (juego de Roblox)

Servidor de *roleplay* ambientado en la **Ciudad de México**. Todo el mapa y los
sistemas se generan por código (Luau), así que funciona en un lugar vacío de
Roblox sin assets externos.

### Qué incluye

**La ciudad** (generada al iniciar el servidor)
- **Centro Histórico:** Zócalo con bandera monumental, Catedral Metropolitana,
  Palacio Nacional, Torre Latinoamericana, Palacio de Bellas Artes y la Alameda.
- **Paseo de la Reforma** con la glorieta del **Ángel de la Independencia**.
- **Bosque de Chapultepec** con su cerro, castillo y lago.
- **Polanco** (torres de vidrio), **Roma/Condesa** (edificios pastel y Parque México)
  y **Coyoacán** (Jardín Hidalgo con kiosko, parroquia y La Casa Azul).
- Calles con nombre, alumbrado público que se enciende de noche, tinacos en las
  azoteas y un ciclo de día/noche con algo de smog.

**Trabajos** (botón `TRABAJOS` o tecla `J`)

| Trabajo | Sueldo | Qué hace |
|---|---|---|
| Ciudadano | $50 | Pasea, come y usa el Metro |
| Policía (SSC) | $150 | Saca patrulla y arresta rateros con **esposas** (+$250 por arresto) |
| Paramédico (ERUM) | $140 | Saca ambulancia y cura con el **botiquín** (+$40 por curación) |
| Taxista | $100 | Saca un taxi rosa; los pasajeros pagan por distancia al bajarse |
| Taquero | $110 | Comisión por cada venta en la taquería donde esté |
| Vendedor ambulante | $80 | Comisión por cada venta en el puesto donde esté |
| Ratero | $0 | Asalta tienditas (tecla `F`), queda **SE BUSCA** 3 min |

**Economía**
- Dinero en pesos (`$ MXN`), se guarda con DataStore.
- Sueldo automático cada 60 s.
- **Taquerías** (pastor, suadero, quesadillas, horchata), **puestos** (elotes,
  guajolotas, churros, esquites) y **tienditas**: la comida recupera vida.

**Transporte**
- **Metro:** 6 estaciones (Zócalo, Bellas Artes, Insurgentes, Chapultepec, Polanco,
  Coyoacán). Boleto de $5.
- **Vehículos:** taxis, patrullas, ambulancias y renta de **vochos** ($100) junto al Zócalo.
  Se manejan con `W A S D`; solo el dueño puede manejar.

**Crimen y justicia**
- Los rateros asaltan cajas registradoras; la policía recibe la alerta.
- Arresto → 60 s en el **Reclusorio**. Al salir apareces en el Zócalo.

### Cómo instalarlo en Roblox Studio

El proyecto usa [Rojo](https://rojo.space) para sincronizar el código con Studio.

1. Instala Rojo (CLI) y el **plugin de Rojo** en Roblox Studio.
2. En esta carpeta ejecuta:
   ```bash
   rojo serve
   ```
3. En Roblox Studio abre un lugar nuevo (plantilla *Baseplate*), ve a la pestaña
   **Plugins → Rojo → Connect**.
4. Presiona **Play**. El servidor construye la ciudad en unos segundos.
5. Para guardar dinero en Studio: *Game Settings → Security →* activa
   **Enable Studio Access to API Services**.
6. Para publicarlo: *File → Publish to Roblox* y configura el número máximo de
   jugadores en *Game Settings*.

**Sin Rojo:** también puedes generar un archivo de lugar con
`rojo build -o CDMX.rbxlx` y abrirlo directamente en Studio.

### Estructura

```
default.project.json        Mapa de Rojo
src/shared/Config.luau       Sueldos, precios, trabajos, vehículos (¡edita aquí!)
src/server/init.server.luau  Arranque del servidor y RemoteEvents
src/server/MapBuilder.luau   Genera la ciudad
src/server/Economy.luau      Dinero y guardado
src/server/Jobs.luau         Trabajos, equipos, herramientas, sueldo, etiquetas
src/server/Crime.luau        Asaltos, búsqueda, arrestos y reclusorio
src/server/Shops.luau        Tiendas y comida
src/server/Metro.luau        Viajes en Metro
src/server/Vehicles.luau     Autos y cobro de taxi
src/server/DayNight.luau     Ciclo día/noche y alumbrado
src/client/UI.luau           Interfaz (dinero, menús, notificaciones)
src/client/Driving.luau      Manejo de autos
```

### Ideas para seguir
- Casas/departamentos que se puedan comprar.
- Tianguis, Mercado de Sonora y Xochimilco con trajineras.
- Comandos de chat de rol (`/me`, `/do`, `/radio` para la policía).
- Ropa y uniformes por trabajo (aprovechando la tienda de ropa 😉).

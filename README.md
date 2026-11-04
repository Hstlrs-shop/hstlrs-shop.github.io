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
| Repartidor | $70 | Moto de reparto: recoge en taquerías y entrega en domicilios (+$60 o más) |
| Microbusero | $90 | Maneja el micro de la Ruta 2 Zócalo – Chapultepec ($25 por parada) |
| Ratero | $0 | Asalta tienditas (tecla `F`), queda **SE BUSCA** 3 min |

**Historia: "Llegada a la ciudad"** (5 capítulos, se guarda el progreso)

Llegas de provincia con una maleta. Doña Lupe te da chamba en su taquería, el
Profe te enseña la ciudad en Metro y El Chino te presenta al barrio, hasta que
**Los Tlacuaches** empiezan a cobrarle "piso" a Doña Lupe. Ahí eliges:

- **Camino honrado:** te das de alta en la SSC con el Comandante Ramírez.
- **Camino chueco:** te armas con El Tuerto en el tianguis y te haces ratero.

Los dos caminos llevan a la bodega de Los Tlacuaches y al final a la mansión de
**El Patrón** en Polanco. Al terminar ganas un título ("Héroe del barrio" o
"Leyenda de la calle"). Los personajes muestran diálogos con opciones; el
rastreador y un haz de luz en el mapa (GPS) marcan cada objetivo.

**Armas** (estilo realista sin sangre: chispas y números de daño)

| Dónde | Qué venden |
|---|---|
| Armería del Centro (cualquiera) | Bat, Pistola 9 mm, Revólver .38, Escopeta |
| El Tuerto, tianguis de la Doctores (rateros) | Pistola, Subfusil, Rifle de asalto |
| Armería de la SSC (policías, gratis) | Macana, Taser, Pistola, Rifle SSC |

- Clic dispara, `R` recarga. El servidor valida cada disparo.
- **Zonas seguras** (Zócalo, Hospital, Reclusorio): nadie recibe daño.
- Los policías solo pueden lastimar a jugadores buscados; el **taser** los paraliza.
- Si atacas a alguien sin ser policía, quedas **SE BUSCA**.
- Al caer reapareces en el Hospital General y pagas $100 de consulta. Si un
  policía abate a un buscado, este despierta en el Reclusorio.
- Los enemigos de las misiones tienen IA: se cubren, se acercan y disparan.

**Autos** (Agencia Reforma, junto a Reforma; se guardan en tu garage)

Nombres de parodia inspirados en los modelos más chilangos: Volkswagon Vochito,
Nizzan Tsuro, Chebrolet Avio, Kya Rion, Nizzan Versu, Volkswagon Jeta,
Hondo Civik, Toyoda Hilox, Forb Lobo, Chebrolet Suburbia, BMV Serie 3,
Merceditas Clase C, Lamborjini Uracán y la moto Itáliko FT-150. Cada uno tiene su
carrocería (sedán, compacto, pickup, camioneta, deportivo, moto), velocidad,
plazas y 12 colores. Desde el **teléfono** (`P`) pides cualquiera de tus autos al
estacionamiento más cercano.

> Por qué parodias: las marcas reales están registradas y Roblox puede retirar
> juegos que las usan sin licencia. Los nombres se cambian en
> `src/shared/Cars.luau` si algún día consigues permiso.

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

### Versión demostrable

**1. Demo en el navegador (sin Roblox):** `demo/index.html` es una versión 3D de un
jugador del mismo mapa y sistemas: la historia completa, la agencia, las armas,
los enemigos y todos los trabajos, con NPCs que hacen de clientes, heridos,
pasajeros, rateros y policías. Ábrelo en cualquier navegador moderno (tiene
controles táctiles para celular). Controles: `WASD` moverse, `E` interactuar,
`J` trabajos, `P` teléfono, `Q` cambiar de arma, `F` o clic para disparar, `R` recargar.

**2. Lugar listo para Roblox Studio:** `CDMX-Roleplay.rbxlx` ya contiene todos los
scripts. Ábrelo con doble clic en Roblox Studio y presiona **Play**; no necesitas
Rojo. Si cambias el código, regenéralo con:

```bash
python3 tools/build_place.py
```

### Cómo instalarlo en Roblox Studio con Rojo (para desarrollar)

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
src/shared/Config.luau       Sueldos, precios, trabajos, zonas seguras (¡edita aquí!)
src/shared/Cars.luau         Catálogo de autos y vehículos de trabajo
src/shared/Weapons.luau      Armas y armerías
src/shared/Story.luau        Historia, diálogos, enemigos, rutas de reparto y micro
src/server/init.server.luau  Arranque del servidor y RemoteEvents
src/server/MapBuilder.luau   Genera la ciudad
src/server/Economy.luau      Dinero y guardado
src/server/Jobs.luau         Trabajos, equipos, herramientas, sueldo, etiquetas
src/server/Crime.luau        Asaltos, búsqueda, arrestos y reclusorio
src/server/Shops.luau        Tiendas y comida
src/server/Metro.luau        Viajes en Metro
src/server/Vehicles.luau     Carrocerías, agencia, garage y cobro de taxi
src/server/Combat.luau       Disparos, daño, taser, zonas seguras y hospital
src/server/Missions.luau     Historia, NPCs, enemigos con IA y misiones de trabajo
src/server/DayNight.luau     Ciclo día/noche y alumbrado
src/client/UI.luau           Interfaz (dinero, menús, notificaciones)
src/client/Driving.luau      Manejo de autos
src/client/Gameplay.luau     Teléfono, diálogos, rastreador y GPS, agencia, armerías
src/client/WeaponsClient.luau  Disparo, recarga, munición y efectos
tools/build_place.py         Genera CDMX-Roleplay.rbxlx sin Rojo
demo/index.html              Demo jugable en el navegador
```

### Ideas para seguir
- Casas/departamentos que se puedan comprar.
- Mercado de Sonora y Xochimilco con trajineras.
- Sonidos (disparos, sirenas, el "súbale" del micro): requieren subir audios propios a Roblox.
- Más capítulos de la historia y misiones secundarias por colonia.
- Comandos de chat de rol (`/me`, `/do`, `/radio` para la policía).
- Ropa y uniformes por trabajo (aprovechando la tienda de ropa 😉).

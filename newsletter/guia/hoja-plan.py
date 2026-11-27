#!/usr/bin/env python3
"""Genera la hoja de cálculo del producto premium "Tu plan de inversión en 30 días" (Excel / Google Sheets).
Uso: python3 hoja-plan.py <salida.xlsx>
Las tasas de CETES y la inflación son las vigentes a la fecha de corte; cada mes se regeneran con datos nuevos.
"""
import sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule
from openpyxl.chart import LineChart, Reference

CORTE = "20 de noviembre de 2026"
CETES = [(28, 0.0619), (91, 0.0649), (182, 0.0667), (364, 0.0695)]  # Banxico, subasta 17/11/2026
INFLACION = 0.0375                                                    # INEGI, octubre 2026
RET_ISR = 0.009                                                       # LIF 2026, retención anual sobre el capital

CAFE, CREMA, ORO, VERDE, ROJO = "2B1A12", "FBF6EF", "E2B33C", "2E7D4F", "B3402F"
H1 = Font(name="Calibri", size=18, bold=True, color=CAFE)
H2 = Font(name="Calibri", size=12, bold=True, color="FFFFFF")
B = Font(name="Calibri", size=11, bold=True)
NOTE = Font(name="Calibri", size=9, italic=True, color="6B5B4F")
FILL_H = PatternFill("solid", fgColor=CAFE)
FILL_IN = PatternFill("solid", fgColor="FFF6D6")   # celdas que llena el usuario
FILL_OUT = PatternFill("solid", fgColor="EEF7F1")  # resultados
thin = Side(style="thin", color="E7DCCD")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
MXN = '"$"#,##0.00'
PCT = "0.00%"

wb = Workbook()

def sheet(title, heading, sub):
    ws = wb.create_sheet(title)
    ws.sheet_view.showGridLines = False
    ws["A1"] = heading; ws["A1"].font = H1
    ws["A2"] = sub; ws["A2"].font = NOTE
    ws.column_dimensions["A"].width = 44
    for c in "BCDEFGH": ws.column_dimensions[c].width = 18
    return ws

def header(ws, row, labels):
    for i, l in enumerate(labels):
        c = ws.cell(row=row, column=1 + i, value=l); c.font = H2; c.fill = FILL_H; c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True); c.border = BOX

def inp(ws, ref, value, fmt=None):
    c = ws[ref]; c.value = value; c.fill = FILL_IN; c.border = BOX
    if fmt: c.number_format = fmt
    return c

def out(ws, ref, formula, fmt=None, bold=False):
    c = ws[ref]; c.value = formula; c.fill = FILL_OUT; c.border = BOX
    if fmt: c.number_format = fmt
    if bold: c.font = B
    return c

# ---------- Inicio ----------
ws = wb.active; ws.title = "Inicio"; ws.sheet_view.showGridLines = False
ws.column_dimensions["A"].width = 100
rows = [
    ("Tu plan de inversión en 30 días · Hoja de cálculo", H1),
    (f"Lana con Café · datos con corte al {CORTE}", NOTE),
    ("", None),
    ("Cómo usarla", Font(size=13, bold=True, color=CAFE)),
    ("1. Llena SOLO las celdas amarillas. Las verdes se calculan solas.", None),
    ("2. Empieza por 'Presupuesto' y 'Fondo de emergencia'; luego 'Deudas'. Invierte cuando esas tres estén en orden.", None),
    ("3. Usa 'Simulador CETES' e 'Interés compuesto' para comparar escenarios; 'Mi portafolio' para registrar lo que ya tienes.", None),
    ("4. 'Plan 30 días' es tu lista de pendientes: marca cada día cuando lo completes.", None),
    ("5. Cada mes publicamos una versión nueva con tasas actualizadas (descárgala con /miguia en el bot).", None),
    ("", None),
    ("Importante", Font(size=13, bold=True, color=CAFE)),
    ("Material educativo. No es asesoría de inversión personalizada ni recomendación de productos. Los simuladores suponen tasas constantes,", None),
    ("que en la realidad cambian; los impuestos se muestran como retención aproximada. Verifica siempre las cifras vigentes en la fuente oficial.", None),
    ("", None),
    ("Celdas amarillas = las llenas tú   ·   Celdas verdes = resultados", B),
]
for i, (t, f) in enumerate(rows, 1):
    ws.cell(row=i, column=1, value=t)
    if f: ws.cell(row=i, column=1).font = f
ws["A15"].fill = FILL_IN

# ---------- Presupuesto ----------
ws = sheet("Presupuesto", "Presupuesto mensual", "Anota tus ingresos y gastos de un mes típico. Separa lo esencial de lo prescindible.")
inp(ws, "B4", 18000, MXN); ws["A4"] = "Ingreso mensual neto (lo que te depositan)"; ws["A4"].font = B
header(ws, 6, ["Concepto", "Monto mensual", "Tipo"])
items = [("Renta o hipoteca", 5000, "Esencial"), ("Comida y súper", 4000, "Esencial"), ("Luz, agua, gas, internet, celular", 1200, "Esencial"),
         ("Transporte / gasolina", 1500, "Esencial"), ("Salud / medicinas", 500, "Esencial"), ("Pagos mínimos de deudas", 1200, "Esencial"),
         ("Salidas y comida fuera", 1500, "Prescindible"), ("Suscripciones (streaming, apps)", 400, "Prescindible"), ("Ropa y compras por gusto", 800, "Prescindible"),
         ("Otros", 0, "Prescindible"), ("", None, ""), ("", None, "")]
dv = DataValidation(type="list", formula1='"Esencial,Prescindible"', allow_blank=True); ws.add_data_validation(dv)
for i, (c, m, t) in enumerate(items):
    r = 7 + i
    inp(ws, f"A{r}", c or None); inp(ws, f"B{r}", m, MXN); inp(ws, f"C{r}", t or None); dv.add(f"C{r}")
last = 7 + len(items) - 1
ws["A21"] = "Gastos esenciales"; out(ws, "B21", f'=SUMIF(C7:C{last},"Esencial",B7:B{last})', MXN, True)
ws["A22"] = "Gastos prescindibles"; out(ws, "B22", f'=SUMIF(C7:C{last},"Prescindible",B7:B{last})', MXN, True)
ws["A23"] = "Lo que te queda para ahorrar e invertir"; out(ws, "B23", "=B4-B21-B22", MXN, True)
ws["A24"] = "% del ingreso que puedes ahorrar"; out(ws, "B24", '=IF(B4>0,B23/B4,0)', PCT, True)
ws["A26"] = "Referencia (no es regla oficial): muchas guías sugieren apartar al menos 10–20 % del ingreso; CONDUSEF recomienda separar el ahorro en cuanto llega el sueldo."; ws["A26"].font = NOTE
ws.conditional_formatting.add("B23", CellIsRule(operator="lessThan", formula=["0"], font=Font(color=ROJO, bold=True)))

# ---------- Fondo de emergencia ----------
ws = sheet("Fondo de emergencia", "Fondo de emergencia", "CONDUSEF recomienda entre 3 y 6 meses de gastos esenciales.")
ws["A4"] = "Gastos esenciales al mes"; out(ws, "B4", "=Presupuesto!B21", MXN)
ws["A5"] = "¿Cuántos meses quieres cubrir? (3 a 6)"; inp(ws, "B5", 3)
ws["A6"] = "Meta del fondo"; out(ws, "B6", "=B4*B5", MXN, True)
ws["A7"] = "Lo que ya tienes ahorrado para emergencias"; inp(ws, "B7", 5000, MXN)
ws["A8"] = "Te falta"; out(ws, "B8", "=MAX(0,B6-B7)", MXN, True)
ws["A9"] = "¿Cuánto puedes apartar al mes?"; inp(ws, "B9", 1800, MXN)
ws["A10"] = "Meses para completarlo"; out(ws, "B10", '=IF(B9>0,ROUNDUP(B8/B9,0),"—")', "0", True)
ws["A12"] = "Dónde guardarlo: algo seguro y con disponibilidad inmediata (cuenta con seguro IPAB o instrumento de liquidez diaria). El rendimiento es lo último."; ws["A12"].font = NOTE

# ---------- Deudas ----------
ws = sheet("Deudas", "Tus deudas", "Ataca primero la de tasa más alta (método avalancha). Usa la tasa anual o el CAT de tu estado de cuenta.")
header(ws, 4, ["Deuda", "Saldo actual", "Tasa anual (o CAT)", "Pago mensual que harás", "Interés este mes", "Meses para liquidar", "Prioridad (1 = primero)"])
deudas = [("Tarjeta de crédito A", 12000, 0.45, 1500), ("Préstamo personal", 20000, 0.38, 1200), ("Tarjeta B", 0, 0.0, 0), ("", None, None, None), ("", None, None, None)]
for i, (n, sdo, t, pg) in enumerate(deudas):
    r = 5 + i
    inp(ws, f"A{r}", n or None); inp(ws, f"B{r}", sdo, MXN); inp(ws, f"C{r}", t, PCT); inp(ws, f"D{r}", pg, MXN)
    out(ws, f"E{r}", f'=IF(B{r}>0,B{r}*C{r}/12,"")', MXN)
    out(ws, f"F{r}", f'=IF(OR(B{r}="",B{r}<=0),"",IF(D{r}<=B{r}*C{r}/12,"No alcanza: el pago no cubre los intereses",IF(C{r}=0,ROUNDUP(B{r}/D{r},0),ROUNDUP(NPER(C{r}/12,-D{r},B{r}),0))))', "0")
    out(ws, f"G{r}", f'=IF(OR(B{r}="",B{r}<=0),"",RANK(C{r},$C$5:$C$9))', "0")
ws["A11"] = "Total de deudas"; out(ws, "B11", "=SUM(B5:B9)", MXN, True)
ws["A12"] = "Intereses que pagas este mes"; out(ws, "B12", "=SUM(E5:E9)", MXN, True)
ws["A13"] = "Intereses al año (si no bajaras el saldo)"; out(ws, "B13", "=B12*12", MXN, True)
ws["A15"] = "Si una deuda cobra más que lo que rinde cualquier inversión segura (CETES ~7 %), pagarla es tu mejor 'inversión'."; ws["A15"].font = NOTE

# ---------- Simulador CETES ----------
ws = sheet("Simulador CETES", "Simulador de CETES", f"Tasas de la subasta del 17/11/2026 (Banxico). Retención ISR 2026: 0.90 % anual sobre el capital. Inflación {INFLACION:.2%} (INEGI, oct 2026).")
header(ws, 4, ["Plazo (días)", "Tasa anual"])
for i, (d, t) in enumerate(CETES):
    inp(ws, f"A{5+i}", d); inp(ws, f"B{5+i}", t, PCT)
ws["D4"] = "Inflación anual"; inp(ws, "E4", INFLACION, PCT)
ws["D5"] = "Retención ISR anual"; inp(ws, "E5", RET_ISR, PCT)
ws["A10"] = "¿Cuánto inviertes?"; inp(ws, "B10", 10000, MXN)
ws["A11"] = "Plazo (28, 91, 182 o 364)"; inp(ws, "B11", 364)
dvp = DataValidation(type="list", formula1='"28,91,182,364"'); ws.add_data_validation(dvp); dvp.add("B11")
ws["A12"] = "¿Cuántos años reinviertes?"; inp(ws, "B12", 3)
ws["A14"] = "Tasa del plazo elegido"; out(ws, "B14", "=VLOOKUP(B11,A5:B8,2,FALSE)", PCT)
ws["A15"] = "Interés bruto del plazo"; out(ws, "B15", "=B10*B14*B11/360", MXN)
ws["A16"] = "Retención de ISR"; out(ws, "B16", "=B10*E5*B11/365", MXN)
ws["A17"] = "Recibes al vencer"; out(ws, "B17", "=B10+B15-B16", MXN, True)
ws["A18"] = "Veces que reinviertes"; out(ws, "B18", "=MAX(1,INT(365*B12/B11))", "0")
ws["A19"] = "Monto final reinvirtiendo (misma tasa)"; out(ws, "B19", "=B10*(1+B14*B11/360-E5*B11/365)^B18", MXN, True)
ws["A20"] = "Lo necesario para no perder contra la inflación"; out(ws, "B20", "=B10*(1+E4)^B12", MXN)
ws["A21"] = "Ganancia real (en pesos de hoy)"; out(ws, "B21", "=B19/(1+E4)^B12-B10", MXN, True)
ws["A22"] = "Rendimiento real anual aproximado"; out(ws, "B22", "=(1+B14)/(1+E4)-1", PCT, True)
ws.conditional_formatting.add("B21", CellIsRule(operator="lessThan", formula=["0"], font=Font(color=ROJO, bold=True)))
ws.conditional_formatting.add("B21", CellIsRule(operator="greaterThanOrEqual", formula=["0"], font=Font(color=VERDE, bold=True)))
ws["A24"] = "Supone la misma tasa en cada reinversión (en la realidad cambia cada semana). El impuesto definitivo se calcula en la declaración anual."; ws["A24"].font = NOTE

# ---------- Interés compuesto ----------
ws = sheet("Interés compuesto", "Interés compuesto", "Aportaciones mensuales con un rendimiento anual hipotético. Compara escenarios cambiando la tasa.")
ws["A4"] = "Monto inicial"; inp(ws, "B4", 5000, MXN)
ws["A5"] = "Aportación mensual"; inp(ws, "B5", 1000, MXN)
ws["A6"] = "Rendimiento anual hipotético"; inp(ws, "B6", 0.07, PCT)
ws["A7"] = "Inflación anual supuesta"; inp(ws, "B7", INFLACION, PCT)
ws["A8"] = "Años"; inp(ws, "B8", 10)
header(ws, 10, ["Año", "Aportado acumulado", "Valor de la inversión", "Valor en pesos de hoy", "Ganancia"])
for y in range(1, 31):
    r = 10 + y
    ws[f"A{r}"] = y
    out(ws, f"B{r}", f"=$B$4+$B$5*12*A{r}", MXN)
    out(ws, f"C{r}", f"=$B$4*(1+$B$6/12)^(12*A{r})+IF($B$6=0,$B$5*12*A{r},$B$5*((1+$B$6/12)^(12*A{r})-1)/($B$6/12))", MXN)
    out(ws, f"D{r}", f"=C{r}/(1+$B$7)^A{r}", MXN)
    out(ws, f"E{r}", f"=C{r}-B{r}", MXN)
ws["G4"] = "Resultado en el año elegido"; ws["G4"].font = B
ws["G5"] = "Valor"; out(ws, "H5", "=INDEX(C11:C40,B8)", MXN, True)
ws["G6"] = "En pesos de hoy"; out(ws, "H6", "=INDEX(D11:D40,B8)", MXN, True)
ws["G7"] = "Aportaste"; out(ws, "H7", "=INDEX(B11:B40,B8)", MXN, True)
ch = LineChart(); ch.title = "Aportado vs. valor de la inversión"; ch.height = 8; ch.width = 16
ch.add_data(Reference(ws, min_col=2, min_row=10, max_row=40), titles_from_data=True)
ch.add_data(Reference(ws, min_col=3, min_row=10, max_row=40), titles_from_data=True)
ch.set_categories(Reference(ws, min_col=1, min_row=11, max_row=40)); ws.add_chart(ch, "G10")
ws["A42"] = "Ilustrativo: los rendimientos reales varían y pueden ser negativos. No incluye impuestos ni comisiones."; ws["A42"].font = NOTE

# ---------- Mi portafolio ----------
ws = sheet("Mi portafolio", "Mi portafolio", "Registra dónde tienes tu dinero. Revisa que cada institución esté autorizada (SIPRES / CNBV) y qué seguro aplica.")
header(ws, 4, ["Instrumento", "Institución", "Tipo", "Monto", "Tasa anual / GAT", "Seguro", "Vence / disponibilidad", "% del total"])
dvt = DataValidation(type="list", formula1='"Fondo de emergencia,CETES/Gobierno,Banco,Sofipo,Fondo de inversión,Acciones/ETF,Afore voluntaria,Otro"'); ws.add_data_validation(dvt)
dvs = DataValidation(type="list", formula1='"IPAB (400 mil UDIS),Prosofipo (25 mil UDIS),Gobierno federal,Sin seguro,No sé"'); ws.add_data_validation(dvs)
ej = [("Cuenta de ahorro", "Mi banco", "Fondo de emergencia", 15000, 0.0, "IPAB (400 mil UDIS)", "Inmediata"), ("CETES 364", "Cetesdirecto", "CETES/Gobierno", 10000, 0.0695, "Gobierno federal", "17/11/2027")]
for i in range(15):
    r = 5 + i
    vals = ej[i] if i < len(ej) else (None,) * 7
    for j, v in enumerate(vals):
        c = inp(ws, f"{'ABCDEFG'[j]}{r}", v)
        if j == 3: c.number_format = MXN
        if j == 4: c.number_format = PCT
    dvt.add(f"C{r}"); dvs.add(f"F{r}")
    out(ws, f"H{r}", f'=IF(D{r}="","",D{r}/SUM($D$5:$D$19))', PCT)
ws["A21"] = "Total invertido"; out(ws, "D21", "=SUM(D5:D19)", MXN, True)
ws["A22"] = "Rendimiento anual promedio ponderado"; out(ws, "D22", '=IF(D21>0,SUMPRODUCT(D5:D19,E5:E19)/D21,0)', PCT, True)
ws["A23"] = "Rendimiento real aproximado (vs. inflación)"; out(ws, "D23", f"=(1+D22)/(1+{INFLACION})-1", PCT, True)

# ---------- Plan 30 días ----------
ws = sheet("Plan 30 días", "Tu plan de 30 días", "Un paso al día. Marca ✔ en la columna C cuando lo completes.")
ws.column_dimensions["B"].width = 90; ws.column_dimensions["C"].width = 10
header(ws, 4, ["Día", "Qué hacer", "Hecho"])
plan = [
    "Descarga tus estados de cuenta del último mes (banco y tarjetas).",
    "Llena la pestaña 'Presupuesto' con tus gastos reales.",
    "Marca qué gastos son esenciales y cuáles prescindibles.",
    "Elige 2 gastos prescindibles para recortar este mes.",
    "Programa una transferencia automática de ahorro el día que cobras.",
    "Llena la pestaña 'Deudas' con saldo, tasa o CAT y pago mínimo.",
    "Revisa el CAT de cada crédito en tu estado de cuenta o app.",
    "Define qué deuda atacas primero (la de tasa más alta).",
    "Calcula tu meta en 'Fondo de emergencia' (3 a 6 meses de gastos esenciales).",
    "Elige dónde guardarás tu fondo: institución autorizada, con seguro y disponibilidad inmediata.",
    "Verifica la institución en el SIPRES de CONDUSEF y en el padrón de la CNBV.",
    "Haz tu primer depósito al fondo de emergencia (aunque sea poco).",
    "Revisa tu Afore: saldo, que esté a tu nombre y tus datos correctos (app AforeMóvil).",
    "Registra a tus beneficiarios en tu Afore si no lo has hecho.",
    "Lee el capítulo de CETES de la guía básica y usa el 'Simulador CETES'.",
    "Abre tu cuenta en Cetesdirecto (INE, CURP y cuenta bancaria con CLABE).",
    "Haz tu primera compra de CETES con un monto pequeño (desde $100).",
    "Decide si activas la reinversión automática.",
    "Compara la GAT real de tu cuenta de ahorro contra los CETES de hoy.",
    "Usa 'Interés compuesto' para ver tu meta a 5 y 10 años.",
    "Escribe tus 3 metas con monto y fecha (ej. enganche en 3 años).",
    "Asigna a cada meta un instrumento según su plazo.",
    "Revisa si te conviene una aportación voluntaria deducible a tu Afore.",
    "Registra todo lo que tienes en 'Mi portafolio'.",
    "Revisa que ningún monto en una Sofipo supere lo que cubre su seguro.",
    "Aprende a reconocer fraudes: lee el capítulo 7 de la guía básica.",
    "Desconfía de cualquier rendimiento 'garantizado y alto': revisa tus apps y contactos.",
    "Revisa tu presupuesto real del mes contra lo planeado.",
    "Ajusta tu aportación mensual para el próximo mes.",
    "Agenda una revisión mensual de 30 minutos (el mismo día cada mes).",
]
for i, t in enumerate(plan, 1):
    r = 4 + i
    ws[f"A{r}"] = i; ws[f"A{r}"].alignment = Alignment(horizontal="center"); ws[f"B{r}"] = t
    inp(ws, f"C{r}", None)
ws["B36"] = "Completados"; ws["B36"].font = B; out(ws, "C36", '=COUNTA(C5:C34)&" / 30"', None, True)

# ---------- Fuentes ----------
ws = sheet("Fuentes", "Fuentes y fecha de corte", f"Datos con corte al {CORTE}.")
ws.column_dimensions["A"].width = 110
for i, t in enumerate([
    "Banco de México: resultados de la subasta de valores gubernamentales del 17/11/2026 (CETES 28 d 6.19 %, 91 d 6.49 %, 182 d 6.67 %, 364 d 6.95 %).",
    "INEGI: Índice Nacional de Precios al Consumidor, inflación anual de octubre de 2026: 3.75 %.",
    "Ley de Ingresos de la Federación 2026 (DOF 7/11/2025): retención anual de ISR de 0.90 % sobre el capital que genera intereses.",
    "CONDUSEF: recomendación de fondo de emergencia de 3 a 6 meses de gastos esenciales; SIPRES y Portal de Fraudes Financieros.",
    "IPAB: seguro de depósitos bancarios hasta 400,000 UDIS por persona y por banco. CNBV: Prosofipo hasta 25,000 UDIS (art. 105 LACP).",
    "Nafin / Cetesdirecto: monto mínimo $100 y sin comisiones por apertura, inversión o retiro.",
    "Material educativo de Lana con Café. No es asesoría de inversión personalizada.",
], 4):
    ws.cell(row=i, column=1, value="• " + t)

wb.save(sys.argv[1])
print("ok", sys.argv[1])

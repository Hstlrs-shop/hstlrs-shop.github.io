#!/bin/bash
# Prueba de envíos: pide a Shopify las tarifas que vería un cliente de CDMX para varios carritos
# y las compara con lo que promete la web (assets/js/config.js: shipping.cost y shipping.freeFrom).
# No crea pedidos: solo arma carritos temporales en la tienda.
# Uso: bash scripts/ops/probe-envios.sh   (sale con código 1 si algo no coincide)
set -uo pipefail
cd "$(dirname "$0")/../.."
SHOP=https://hsltrs.myshopify.com
ADDR='shipping_address%5Bzip%5D=06700&shipping_address%5Bcountry%5D=Mexico&shipping_address%5Bprovince%5D=CMX'

# "nombre|id-de-producto[:variante][+id-de-producto[:variante]]" con ids de assets/js/catalog.js
CASOS=(
  "Playera STUDIO 08 negra|studio-08-jaguar:M/Negro"
  "Playera STUDIO 08 carbón|studio-08-jaguar:M/Carbón"
  "Playera CORE 01|core-01-negra-relieve"
  "Hoodie Jaguar|hoodie-jaguar"
  "Crewneck Jaguar|crew-jaguar"
  "Crewneck Monograma|crewneck-monograma"
  "Beanie|beanie-hstlrs"
  "Gorra|dad-hat"
  "Playera + hoodie|studio-08-jaguar:M/Carbón+hoodie-jaguar"
)

read -r COST FREE < <(node -e '
const fs=require("fs"),vm=require("vm");const c={window:{}};vm.runInNewContext(fs.readFileSync("assets/js/config.js","utf8"),c);
const s=c.window.STORE_CONFIG.shipping;console.log(s.cost,s.freeFrom)')
echo "La web promete: envío \$$COST, gratis desde \$$FREE"

fallos=0
for caso in "${CASOS[@]}"; do
  nombre=${caso%%|*}; items=${caso#*|}
  ids=$(node -e '
const fs=require("fs"),vm=require("vm");const c={window:{}};vm.runInNewContext(fs.readFileSync("assets/js/catalog.js","utf8"),c);
console.log(process.argv[1].split("+").map(t=>{const [id,k]=t.split(":");const p=c.window.CATALOG.find(x=>x.id===id);
if(!p||!p.shopify)throw new Error("sin producto "+id);return k?p.shopify[k]:Object.values(p.shopify)[0]}).join(" "))' "$items") || { echo "  ✗ $nombre: no encontré la variante"; fallos=1; continue; }
  jar=$(mktemp)
  for v in $ids; do
    for intento in 1 2 3 4; do  # la tienda limita las peticiones seguidas (429): espera y reintenta
      code=$(curl -sS -m 20 -c "$jar" -b "$jar" -X POST -H "Content-Type: application/json" -d "{\"items\":[{\"id\":$v,\"quantity\":1}]}" "$SHOP/cart/add.js" -o /dev/null -w "%{http_code}")
      [ "$code" = 200 ] && break
      sleep $((intento * 5))
    done
  done
  sleep 1
  total=$(curl -sS -m 20 -b "$jar" "$SHOP/cart.js" | python3 -I -c "import sys,json;print(json.load(sys.stdin)['total_price']//100)")
  tarifas=$(curl -sS -m 30 -b "$jar" "$SHOP/cart/shipping_rates.json?$ADDR")
  rm -f "$jar"
  linea=$(python3 -I - "$total" "$COST" "$FREE" "$tarifas" <<'EOF'
import json, sys
total, cost, free, raw = int(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
try:
    rates = json.loads(raw)["shipping_rates"]
except Exception:
    print(f"✗|sin tarifas: {raw[:120]}"); sys.exit()
esperado = 0.0 if total >= free else cost
txt = " · ".join(f"{r['name']} ${float(r['price']):,.0f}" for r in rates)
ok = len(rates) == 1 and abs(float(rates[0]["price"]) - esperado) < 0.01
print(f"{'✓' if ok else '✗'}|{txt} (esperado ${esperado:,.0f})")
EOF
)
  marca=${linea%%|*}; [ "$marca" = "✓" ] || fallos=1
  echo "  $marca $nombre (carrito \$$total): ${linea#*|}"
done
[ $fallos = 0 ] && echo "Todo coincide con la web" || echo "HAY DIFERENCIAS con lo que promete la web"
exit $fallos

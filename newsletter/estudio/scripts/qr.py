# Genera el QR de Telegram con la paleta café y verifica que escanee.
# Uso: python3 qr.py <carpeta_de_trabajo>
import sys, qrcode, cv2
out = (sys.argv[1] if len(sys.argv) > 1 else ".") + "/qr.png"
q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=20, border=2)
q.add_data("https://t.me/LanaconCafe"); q.make()
q.make_image(fill_color=(43, 29, 22), back_color=(250, 243, 232)).convert("RGB").save(out)
r = cv2.wechat_qrcode_WeChatQRCode().detectAndDecode(cv2.imread(out))[0]
print(out, r); assert r and r[0] == "https://t.me/LanaconCafe", "El QR no escanea"

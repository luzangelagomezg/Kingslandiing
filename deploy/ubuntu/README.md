# Despliegue de KINGSLANDING en Ubuntu

Este procedimiento instala el portal, la búsqueda SQLite de The Small Council y el validador final. El FTP se instala por separado con `install-ftp-challenge.sh`; no crea una OVA.

## 1. Crear el bundle en Windows

Desde la raíz de `kinglanding-lab`, abre Git Bash y ejecuta:

```bash
bash deploy/ubuntu/build-bundle.sh
```

El script compila la interfaz y crea `deploy/ubuntu/kinglanding-vm-bundle.tar.gz` con `server.mjs`, `dist/` y el paquete `sql.js` necesario para SQLite. No incluye el resto de `node_modules` ni la bandera final.

## 2. Preparar la bandera en Ubuntu

La bandera real no debe incluirse en el bundle ni en Git. En Ubuntu crea el archivo con esta línea exacta; por ahora el valor queda vacío:

```bash
cd ~/Downloads
if [ ! -f kinglanding.env ]; then
	printf 'KINGSLANDING_FINAL_FLAG=\nKINGSLANDING_FTP_USER=\nKINGSLANDING_FTP_PASSWORD=\n' > kinglanding.env
fi
chmod 600 kinglanding.env
```

Mientras la variable esté vacía, el portal y la búsqueda del Consejo funcionan, pero la validación final responde que aún no está configurada. Define la bandera final antes de distribuir la OVA.

## 3. Instalar el portal

Copia desde `http://192.168.56.1:8090/` estos tres archivos a `Descargas`: `kinglanding-vm-bundle.tar.gz`, `install-kinglanding.sh` y `kinglanding.service`.

Si aún no creaste `kinglanding.env`, abre Terminal en Ubuntu y créalo. Luego ejecuta:

```bash
cd ~/Downloads
if [ ! -f kinglanding.env ]; then
	printf 'KINGSLANDING_FINAL_FLAG=\nKINGSLANDING_FTP_USER=\nKINGSLANDING_FTP_PASSWORD=\n' > kinglanding.env
fi
chmod 600 kinglanding.env
sudo bash ./install-kinglanding.sh "$PWD/kinglanding-vm-bundle.tar.gz" "$PWD/kinglanding.env"
```

Si aparece “No se encuentra el bundle o el archivo de entorno”, comprueba que los nombres coincidan exactamente y que los cuatro archivos estén en `~/Downloads`:

```bash
ls -l ~/Downloads/kinglanding-vm-bundle.tar.gz ~/Downloads/install-kinglanding.sh ~/Downloads/kinglanding.service ~/Downloads/kinglanding.env
```

Si el navegador añadió `(1)` al nombre de un archivo, renómbralo al nombre mostrado arriba antes de ejecutar el instalador.

El instalador crea un usuario de servicio sin inicio de sesión, instala Node.js 18+ si hace falta y registra el servicio `kinglanding.service`. SQLite está embebido en la aplicación; no requiere un daemon aparte. La unidad systemd conserva la base en `/var/lib/kinglanding/council.sqlite` y crea los registros iniciales la primera vez que arranca.

## 4. Comprobar el servicio

```bash
systemctl status kinglanding.service
journalctl -u kinglanding.service -n 50 --no-pager
```

El portal escucha en `5000/tcp`. La dirección IP se define al preparar la red Host-Only; no está fijada en el bundle. La búsqueda de The Small Council usa parámetros enlazados y consulta únicamente los registros locales del reto.

## 5. Instalar la etapa FTP

La VM debe tener `192.168.56.20` en su adaptador Host-Only y el portal ya debe estar instalado. Descarga `install-ftp-challenge.sh` y `vsftpd.kinglanding.conf` desde el servidor temporal de Host-Only a `~/Downloads`.

Si `vsftpd` no está instalado, el script usa `apt-get`. Con la VM apagada, habilita temporalmente un segundo adaptador NAT para instalar el paquete; conserva el adaptador Host-Only. Inicia Ubuntu, ejecuta el script y luego apaga la VM y deshabilita NAT antes de la práctica.

```bash
cd ~/Downloads
sudo bash ./install-ftp-challenge.sh
```

El servicio queda enlazado a `192.168.56.20`, deshabilita el acceso anónimo y permite únicamente descargas autenticadas. El script crea por defecto el usuario `varys_reader` y una contraseña aleatoria si no se definieron en el entorno. Guarda esas credenciales en `/etc/kinglanding/kinglanding.env`, crea las actas buscables como `susurros de Varys` y `palabra del guardián` en la base del portal y reinicia el servicio web para cargarlas. El usuario FTP queda confinado a `/srv/kinglanding-ftp`, sin permisos de escritura ni shell interactiva; vsftpd permite solo la cuenta incluida en `/etc/vsftpd.kinglanding.userlist`.

Si el entorno del portal no tiene bandera, el script genera una aleatoria, la guarda en el mismo archivo protegido y publica esa bandera en `trono_de_hierro.txt`. No se imprime la contraseña ni la bandera durante la instalación.

Desde Kali, usa el usuario obtenido de `susurros de Varys` con `curl --user <usuario> ftp://192.168.56.20/`; curl solicitará la contraseña, obtenida de `palabra del guardián`. El puerto de control es `21/tcp`; las transferencias pasivas usan `30000-30009/tcp`, solo para el segmento Host-Only.

Para actualizar el portal, genera un bundle nuevo y vuelve a ejecutar el instalador con el mismo archivo de entorno protegido. Después reinicia el servicio:

```bash
sudo systemctl restart kinglanding.service
```

## Seguridad

- Usa el servicio solo dentro de Host-Only durante la práctica.
- No configures port forwarding, red Bridged ni publicación en Internet.
- El archivo de entorno y la bandera pertenecen al instructor; no los incluyas en artefactos distribuidos.
- Durante la construcción, el instalador puede necesitar acceso temporal a repositorios de Ubuntu para instalar Node.js. Desconecta cualquier adaptador NAT antes de la sesión del participante.
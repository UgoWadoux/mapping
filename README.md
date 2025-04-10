# mapping

## Installation

```bash
npm install
```

## Usage

```bash
npm start # Starts the server
```
Frontend disponible sur http://localhost:3000
WebSocket OSC bridge lancé sur ws://localhost:8080
## Configuration du .env
### Exemple

Un fichier `.env.exemple` est fourni. Pour créer rapidement votre fichier `.env` de base, utilisez la commande suivante :

```bash
cp .env.exemple .env
```

```env
OSC_REMOTE_ADDRESS=192.168.1.XXX
OSC_REMOTE_PORT=8081
```

Assurez-vous que ces valeurs correspondent à la machine sur laquelle tourne MadMapper et que le port est ouvert et écouté.

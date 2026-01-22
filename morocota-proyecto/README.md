# 🪙 Morocota - Monitor de Tasas VES/USD v3

Monitor de tasas de cambio venezolanas en tiempo real.

**⚠️ Esta versión NO usa datos de ejemplo. Si no hay conexión con las fuentes, muestra "No disponible".**

## 🚀 Despliegue en Netlify

### 1. Sube a GitHub
```bash
cd morocota-netlify-v3
git init
git add .
git commit -m "Morocota v3 - Solo datos reales"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/morocota.git
git push -u origin main
```

### 2. Conecta con Netlify
1. [app.netlify.com](https://app.netlify.com) → "Add new site" → "Import from Git"
2. Selecciona tu repositorio
3. Click "Deploy"

## 📁 Estructura
```
morocota-netlify-v3/
├── netlify.toml
├── package.json
├── functions/
│   └── rates.js      # API - Solo datos reales
└── public/
    └── index.html    # Frontend - Muestra error si no hay datos
```

## ✅ Filosofía v3

- **Sin datos falsos**: Si una fuente no responde, se muestra "No disponible"
- **Transparencia total**: El usuario sabe exactamente qué fuentes funcionan
- **Credibilidad**: Mejor no mostrar nada que mostrar datos inventados

## 📊 Fuentes

| Fuente | API | Timeout |
|--------|-----|---------|
| BCV | pydolarve.org | 8s |
| EnParaleloVzla | pydolarve.org | 8s |
| DolarToday | s3.amazonaws.com | 8s |
| Binance | pydolarve.org | 8s |

## 🔧 Desarrollo Local

```bash
npm install
npx netlify dev
```

## 📡 Respuesta de la API

```json
{
  "rates": {
    "USD": 51.48,        // null si no disponible
    "EUR": 55.60,        // null si no disponible
    "PROMEDIO": 53.54,
    "PARALELO": 52.50,
    "DOLARTODAY": 52.80,
    "BINANCE": 52.65
  },
  "sources": {
    "BCV": "ok",           // "ok" o "unavailable"
    "PARALELO": "ok",
    "DOLARTODAY": "ok",
    "BINANCE": "unavailable"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---
Hecho con ❤️ para Venezuela 🇻🇪

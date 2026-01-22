const axios = require('axios');

// ==========================================
// 📍 AQUÍ VA TU API KEY DE SCRAPERAPI
// ==========================================
const SCRAPER_API_KEY = '8ba7cc9eac524888e642e09924e929be'; 
// ↑ Ejemplo: 'a1b2c3d4e5...' (Consérvala entre las comillas)


exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        console.log("Iniciando consulta vía ScraperAPI...");

        // 1. Preparamos la URL de destino (PyDolarVe con todos los monitores)
        const targetUrl = 'https://pydolarve.org/api/v1/dollar?monitor=bcv,enparalelovzla,dolartoday,binance';
        
        // 2. Construimos la URL Puente (La petición pasa por ScraperAPI)
        // ScraperAPI se encarga de ir a targetUrl sin ser bloqueado
        const proxyUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;

        // 3. Hacemos la petición (Damos 9s de límite para no chocar con el límite de 10s de Netlify)
        const { data } = await axios.get(proxyUrl, { timeout: 9000 });

        console.log("Datos recibidos vía Proxy!");

        // 4. Organizamos los datos
        const rates = {
            USD: data.bcv?.price || null,
            EUR: data.bcv?.price_eur || null,
            PROMEDIO: 0,
            PARALELO: data.enparalelovzla?.price || null,
            DOLARTODAY: data.dolartoday?.price || null,
            BINANCE: data.binance?.price || null
        };

        // Calcular promedio
        if (rates.USD && rates.EUR) {
            rates.PROMEDIO = parseFloat(((rates.USD + rates.EUR) / 2).toFixed(2));
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                rates: rates,
                timestamp: new Date().toISOString(),
                sources: {
                    BCV: rates.USD ? 'ok' : 'unavailable',
                    PARALELO: rates.PARALELO ? 'ok' : 'unavailable'
                }
            })
        };

    } catch (error) {
        console.error('Error con ScraperAPI:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: "Error de conexión proxy", 
                details: error.message 
            })
        };
    }
};

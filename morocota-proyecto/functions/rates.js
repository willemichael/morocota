const axios = require('axios');

// ==========================================
// 🔑 CONFIGURACIÓN
// ==========================================
const SCRAPER_API_KEY = '8ba7cc9eac524888e642e09924e929be'; 
// ↑↑↑ ¡PEGA TU CLAVE DE SCRAPERAPI ARRIBA! ↑↑↑

// Cache para ahorrar créditos (10 minutos)
let cache = {
    data: null,
    timestamp: 0
};
const CACHE_DURATION = 10 * 60 * 1000; 

// Función auxiliar para usar el Proxy
async function fetchWithProxy(targetUrl) {
    try {
        // Construimos la URL puente
        const proxyUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;
        const response = await axios.get(proxyUrl, { timeout: 20000 }); // Damos 20s de tiempo
        return response.data;
    } catch (error) {
        console.error(`Error proxy en ${targetUrl}:`, error.message);
        return null;
    }
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        // 1. Revisar caché (para no gastar tus créditos de ScraperAPI rápido)
        const now = Date.now();
        if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
            console.log("Usando Caché (Ahorrando créditos)");
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ ...cache.data, cached: true })
            };
        }

        console.log("Cache expirado. Buscando datos frescos con Proxy...");

        // 2. Obtener datos (Usamos PyDolarVe que tiene todo junto)
        // Pedimos monitor "bcv", "enparalelovzla", etc.
        const dataBCV = await fetchWithProxy('https://pydolarve.org/api/v1/dollar?page=bcv');
        const dataParalelo = await fetchWithProxy('https://pydolarve.org/api/v1/dollar?page=enparalelovzla');
        const dataCripto = await fetchWithProxy('https://pydolarve.org/api/v1/dollar?page=binance');
        const dataDT = await fetchWithProxy('https://pydolarve.org/api/v1/dollar?page=dolartoday');

        // 3. Organizar la respuesta
        // Si alguna falla, ponemos null o 0 para que no rompa la web
        const rates = {
            USD: dataBCV?.monitors?.bcv?.price || null,
            EUR: dataBCV?.monitors?.bcv?.price_eur || null,
            PROMEDIO: 0, 
            PARALELO: dataParalelo?.monitors?.enparalelovzla?.price || null,
            DOLARTODAY: dataDT?.monitors?.dolartoday?.price || null,
            BINANCE: dataCripto?.monitors?.binance?.price || null
        };

        // Calcular promedio si tenemos datos
        if (rates.USD && rates.EUR) {
            rates.PROMEDIO = parseFloat(((rates.USD + rates.EUR) / 2).toFixed(2));
        }

        const response = {
            rates,
            timestamp: new Date().toISOString(),
            sources: {
                BCV: rates.USD ? 'ok' : 'error',
                PARALELO: rates.PARALELO ? 'ok' : 'error'
            }
        };

        // Actualizar caché solo si obtuvimos al menos el BCV
        if (rates.USD) {
            cache = { data: response, timestamp: now };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('Error General:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Error interno", details: error.message })
        };
    }
};

const axios = require('axios');

// ==========================================
// 📍 Configura tu API KEY de ScraperAPI en Netlify
// ==========================================
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;


exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        if (!SCRAPER_API_KEY) {
            throw new Error('Falta la variable de entorno SCRAPER_API_KEY en Netlify.');
        }

        console.log("Iniciando consulta vía ScraperAPI...");

        const proxyUrl = 'https://api.scraperapi.com';
        const timeoutMs = 9000;
        const rates = {
            USD: null,
            EUR: null,
            PROMEDIO: 0,
            PARALELO: null,
            DOLARTODAY: null,
            BINANCE: null
        };
        const sources = {};
        const sourcesDetails = {};

        const monitors = [
            { source: 'BCV', key: 'bcv' },
            { source: 'PARALELO', key: 'enparalelovzla' },
            { source: 'DOLARTODAY', key: 'dolartoday' },
            { source: 'BINANCE', key: 'binance' }
        ];

        const fetchMonitor = async ({ source, key }) => {
            const targetUrl = `https://pydolarve.org/api/v1/dollar?monitor=${key}`;
            const { data: rawData } = await axios.get(proxyUrl, {
                timeout: timeoutMs,
                params: {
                    api_key: SCRAPER_API_KEY,
                    url: targetUrl
                }
            });

            const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            const data = parsedData?.monitors?.[key] || parsedData?.[key] || parsedData;

            if (!data || data.error) {
                throw new Error(data?.error || 'Respuesta inválida de ScraperAPI/PyDolarVe.');
            }

            return { source, key, data };
        };

        const results = await Promise.allSettled(monitors.map(fetchMonitor));

        results.forEach((result, index) => {
            const { source, key } = monitors[index];

            if (result.status === 'fulfilled') {
                const data = result.value.data;
                if (key === 'bcv') {
                    rates.USD = data.price ? parseFloat(data.price) : null;
                    rates.EUR = data.price_eur ? parseFloat(data.price_eur) : null;
                } else if (key === 'enparalelovzla') {
                    rates.PARALELO = data.price ? parseFloat(data.price) : null;
                } else if (key === 'dolartoday') {
                    rates.DOLARTODAY = data.price ? parseFloat(data.price) : null;
                } else if (key === 'binance') {
                    rates.BINANCE = data.price ? parseFloat(data.price) : null;
                }

                sources[source] = data.price || data.price_eur ? 'ok' : 'unavailable';
                if (!data.price && !data.price_eur) {
                    sourcesDetails[source] = 'Sin precio en respuesta.';
                }
            } else {
                sources[source] = 'unavailable';
                sourcesDetails[source] = result.reason?.message || 'Error consultando fuente.';
            }
        });

        console.log("Datos recibidos vía Proxy!");

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
                sources,
                sourcesDetails
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

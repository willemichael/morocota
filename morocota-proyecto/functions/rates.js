const axios = require('axios');

// Cache en memoria
let cache = {
    data: null,
    timestamp: 0
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// ============== OBTENER DATOS REALES ==============

async function getBCV() {
    // DATOS DE PRUEBA (MOCK)
    // Esto simula que el BCV respondió correctamente
    console.log("Usando datos de prueba...");
    return {
        USD: 36.50,    // Precio fijo de prueba
        EUR: 39.20,
        lastUpdate: "Prueba Manual"
    };
}

async function getParalelo() {
    try {
        const { data } = await axios.get('https://pydolarve.org/api/v1/dollar?page=enparalelovzla', {
            timeout: 8000
        });
        
        if (data?.monitors?.enparalelovzla?.price) {
            return {
                price: data.monitors.enparalelovzla.price,
                lastUpdate: data.monitors.enparalelovzla.last_update || null
            };
        }
        throw new Error('Paralelo data not available');
    } catch (error) {
        console.error('Error Paralelo:', error.message);
        return { price: null, lastUpdate: null };
    }
}

async function getDolarToday() {
    try {
        const { data } = await axios.get('https://s3.amazonaws.com/dolartoday/data.json', {
            timeout: 8000
        });
        
        const price = data?.USD?.dolartoday || data?.USD?.promedio;
        if (price) {
            return {
                price: price,
                lastUpdate: data?._timestamp?.fecha || null
            };
        }
        throw new Error('DolarToday data not available');
    } catch (error) {
        console.error('Error DolarToday:', error.message);
        return { price: null, lastUpdate: null };
    }
}

async function getBinance() {
    try {
        const { data } = await axios.get('https://pydolarve.org/api/v1/dollar?page=binance', {
            timeout: 8000
        });
        
        if (data?.monitors?.binance?.price) {
            return {
                price: data.monitors.binance.price,
                lastUpdate: data.monitors.binance.last_update || null
            };
        }
        throw new Error('Binance data not available');
    } catch (error) {
        console.error('Error Binance:', error.message);
        return { price: null, lastUpdate: null };
    }
}

// ============== HANDLER PRINCIPAL ==============

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const now = Date.now();

        // Verificar cache
        if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    ...cache.data,
                    cached: true,
                    cacheAge: Math.round((now - cache.timestamp) / 1000)
                })
            };
        }

        // Obtener datos en paralelo
        const [bcv, paralelo, dolartoday, binance] = await Promise.all([
            getBCV(),
            getParalelo(),
            getDolarToday(),
            getBinance()
        ]);

        // Solo incluir datos que realmente tenemos
        const rates = {
            USD: bcv.USD,
            EUR: bcv.EUR,
            PROMEDIO: (bcv.USD && bcv.EUR) ? parseFloat(((bcv.USD + bcv.EUR) / 2).toFixed(2)) : null,
            PARALELO: paralelo.price,
            DOLARTODAY: dolartoday.price,
            BINANCE: binance.price
        };

        // Verificar si tenemos al menos una fuente funcionando
        const availableSources = Object.values(rates).filter(v => v !== null).length;
        
        if (availableSources === 0) {
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({
                    error: 'No hay fuentes disponibles',
                    message: 'No se pudo conectar con ninguna fuente de datos. Intente más tarde.',
                    timestamp: new Date().toISOString()
                })
            };
        }

        const response = {
            rates,
            timestamp: new Date().toISOString(),
            sources: {
                BCV: bcv.USD ? 'ok' : 'unavailable',
                EUR: bcv.EUR ? 'ok' : 'unavailable',
                PARALELO: paralelo.price ? 'ok' : 'unavailable',
                DOLARTODAY: dolartoday.price ? 'ok' : 'unavailable',
                BINANCE: binance.price ? 'ok' : 'unavailable'
            },
            lastUpdates: {
                BCV: bcv.lastUpdate,
                PARALELO: paralelo.lastUpdate,
                DOLARTODAY: dolartoday.lastUpdate,
                BINANCE: binance.lastUpdate
            }
        };

        // Guardar cache solo si hay datos
        cache = { data: response, timestamp: now };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Error del servidor',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};
